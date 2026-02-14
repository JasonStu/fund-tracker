'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { User } from '@/types/auth';
import { supabase } from '@/lib/supabase/client';

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

  const fetchUserProfile = async (sessionUser: { id: string; email?: string }) => {
    try {
      // Add timeout for profile fetch
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      );
      
      const profilePromise = supabase
        .from('user_profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      const result = await Promise.race([profilePromise, timeoutPromise]) as { data: User | null; error: Error | null } | undefined;
      const userData = result?.data;
      const error = result?.error;

      console.log('[Auth] User profile fetch result:', { error, hasData: !!userData, errorMessage: error?.message });

      if (userData) {
        setUser(userData);
        console.log('[Auth] User profile updated:', userData.email);
      }
    } catch (err) {
      console.error('[Auth] Error fetching profile:', err);
    }
  };

  const refreshUser = useCallback(async () => {
    console.log('[Auth] refreshUser called');
    try {
      // Add timeout to prevent hanging indefinitely
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
      );

      const sessionPromise = supabase.auth.getSession();
      
      const result = await Promise.race([sessionPromise, timeoutPromise]) as { data: { session: { user: { id: string; email?: string } } | null } | null };
      const session = result?.data?.session;

      console.log('[Auth] getSession result:', { hasSession: !!session?.user });

      if (session?.user) {
        // Set basic user immediately
        setUser({
          id: session.user.id,
          email: session.user.email || 'unknown',
          role: 'user',
          created_at: new Date().toISOString()
        } as User);
        
        // Fetch profile in background
        fetchUserProfile(session.user);
      } else {
        console.log('[Auth] No session, user is null');
        setUser(null);
      }
    } catch (error) {
      console.error('[Auth] Error refreshing user:', error);
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
        // Set basic user immediately
        setUser(prev => {
          // If we already have a user and it matches the session, don't reset to basic unless needed
          if (prev && prev.id === session.user.id) return prev;
          return {
            id: session.user.id,
            email: session.user.email || 'unknown',
            role: 'user',
            created_at: new Date().toISOString()
          } as User;
        });
        
        setIsLoading(false);
        setHasCheckedAuth(true);
        
        // Fetch profile in background
        fetchUserProfile(session.user);
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
      // If user is authenticated and on a public route (like /login), redirect to home
      if (isPublicRoute) {
        console.log('[Auth] User authenticated on public route - REDIRECTING to /');
        router.replace('/');
      }
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
