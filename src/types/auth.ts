// User role types
export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface InvitationCode {
  id: string;
  code: string;
  used_by: string | null;
  used_at: string | null;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
