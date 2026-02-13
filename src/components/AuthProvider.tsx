'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { User } from '@/types/auth';
import { supabase } from '@/lib/supabase';

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-[#00ffff] border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-400 text-sm">Loading...</span>
      </div>
    </div>
  );
}

// Public routes that don't require authentication
const publicRoutes = ['/login', '/register'];

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  console.log('[Auth] Initial state:', { user: !!user, isLoading, pathname });

  const refreshUser = useCallback(async () => {
    console.log('[Auth] refreshUser called');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[Auth] getSession result:', { hasSession: !!session?.user });

      if (session?.user) {
        console.log('[Auth] Session exists, fetching user profile:', session.user.id);
        const { data: userData, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        console.log('[Auth] User profile fetch result:', { error, hasData: !!userData, errorMessage: error?.message });

        if (userData) {
          setUser(userData as User);
          console.log('[Auth] User set:', userData.email);
        } else {
          // 如果没有 user_profiles 记录，设置一个临时 user
          console.log('[Auth] No user profile found, setting fallback user');
          setUser({
            id: session.user.id,
            email: session.user.email || 'unknown',
            role: 'user',
            created_at: new Date().toISOString()
          } as User);
        }
      } else {
        console.log('[Auth] No session, user is null');
        setUser(null);
      }
    } catch (error) {
      console.error('[Auth] Error refreshing user:', error);
      setUser(null);
    } finally {
      console.log('[Auth] refreshUser completed, setting isLoading=false');
      setIsLoading(false);
      setHasCheckedAuth(true);
    }
  }, []);

  useEffect(() => {
    console.log('[Auth] First useEffect triggered');
    refreshUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] onAuthStateChange:', event, { hasSession: !!session?.user });

      if (event === 'SIGNED_OUT') {
        console.log('[Auth] User signed out');
        setUser(null);
        setIsLoading(false);
        setHasCheckedAuth(true);
      } else if (session?.user) {
        const { data: userData, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        console.log('[Auth] onAuthStateChange profile fetch:', { error, hasData: !!userData });

        if (userData) {
          setUser(userData as User);
          console.log('[Auth] onAuthStateChange set user:', userData.email);
        } else {
          console.log('[Auth] onAuthStateChange no profile, setting fallback');
          setUser({
            id: session.user.id,
            email: session.user.email || 'unknown',
            role: 'user',
            created_at: new Date().toISOString()
          } as User);
        }
        setIsLoading(false);
        setHasCheckedAuth(true);
      } else {
        // No session on initial load
        setIsLoading(false);
        setHasCheckedAuth(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshUser]);

  // Auth guard - redirect to login if not authenticated
  useEffect(() => {
    console.log('[Auth] Auth guard check:', { hasCheckedAuth, isLoading, user: !!user, pathname });

    if (!hasCheckedAuth) {
      console.log('[Auth] Auth not yet checked, skipping redirect');
      return;
    }

    if (isLoading) {
      console.log('[Auth] Still loading, skipping redirect');
      return;
    }

    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
    console.log('[Auth] Is public route:', isPublicRoute);

    if (!user && !isPublicRoute) {
      console.log('[Auth] No user, not public route - REDIRECTING to /login');
      router.replace('/login?redirect=' + encodeURIComponent(pathname));
    } else if (user) {
      console.log('[Auth] User authenticated, allowing access');
    }
  }, [user, isLoading, hasCheckedAuth, pathname, router]);

  const login = async (email: string, password: string) => {
    console.log('[Auth] Login attempt:', email);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log('[Auth] Login error:', error.message);
      return { error: new Error(error.message) };
    }

    console.log('[Auth] Login success, refreshing user');
    await refreshUser();
    const redirect = searchParams?.get('redirect') || '/';
    console.log('[Auth] Redirecting to:', redirect);
    router.replace(redirect);

    return { error: null };
  };

  const logout = async () => {
    console.log('[Auth] Logging out');
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {isLoading ? <LoadingSpinner /> : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
