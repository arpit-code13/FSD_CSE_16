import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthUser, LoginCredentials, RegisterData, UserRole } from '../types/auth';
import { authApi } from '../services/authApi';

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  register: (data: RegisterData) => Promise<AuthUser>;
  logout: () => void;
  clearError: () => void;
  setRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL_DOMAIN = '@bharat.traffic.twin';

function mapRole(backendRole: string, email?: string): UserRole {
  if (backendRole === 'ADMIN' || backendRole === 'admin') return 'admin';
  // Ultimate fallback: if email is official domain, treat as admin regardless of backend
  if (email && email.toLowerCase().endsWith(ADMIN_EMAIL_DOMAIN)) return 'admin';
  return 'user';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toAuthUser(data: any): AuthUser {
  return {
    id: data.id,
    name: data.full_name || data.name || data.email,
    email: data.email,
    role: mapRole(data.role, data.email),
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('bharat_traffic_user');
    if (saved) {
      try {
        return JSON.parse(saved) as AuthUser;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [role, setRoleState] = useState<UserRole>(() => {
    return user ? user.role : 'user';
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Verify token on mount by calling /auth/me
  useEffect(() => {
    const token = localStorage.getItem('bharat_traffic_token');
    if (token && !user) {
      authApi.getMe()
        .then((data) => {
          const authUser = toAuthUser(data);
          setUser(authUser);
          setRoleState(authUser.role);
        })
        .catch(() => {
          // Token invalid — clear it
          localStorage.removeItem('bharat_traffic_token');
          localStorage.removeItem('bharat_traffic_user');
        });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user) {
      localStorage.setItem('bharat_traffic_user', JSON.stringify(user));
      setRoleState(user.role);
    } else {
      localStorage.removeItem('bharat_traffic_user');
    }
  }, [user]);

  const setRole = useCallback((newRole: UserRole) => {
    setRoleState(newRole);
    if (user) {
      setUser({ ...user, role: newRole });
    }
  }, [user]);

  const clearError = useCallback(() => setError(null), []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthUser> => {
    setIsLoading(true);
    setError(null);

    try {
      const tokenResponse = await authApi.login({
        email: credentials.email,
        password: credentials.password,
      });

      // Store JWT token
      localStorage.setItem('bharat_traffic_token', tokenResponse.access_token);

      // Fetch user profile from /me
      const meResponse = await authApi.getMe();
      const authUser = toAuthUser(meResponse);

      setUser(authUser);
      setRoleState(authUser.role);
      setIsLoading(false);
      return authUser;
    } catch (err: unknown) {
      setIsLoading(false);
      const apiError = err as { response?: { data?: { detail?: unknown } }; message?: string };
      const rawDetail = apiError.response?.data?.detail;
      let msg: string;
      if (typeof rawDetail === 'string') {
        msg = rawDetail;
      } else if (Array.isArray(rawDetail) && rawDetail.length > 0) {
        msg = rawDetail.map((e: any) => e.msg || String(e)).join('; ');
      } else {
        msg = apiError.message || 'Login failed. Please try again.';
      }
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<AuthUser> => {
    setIsLoading(true);
    setError(null);

    try {
      // Register with role and additional info
      await authApi.register({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        phone: data.phone,
        department: data.department,
        organization: data.organization,
      });

      // Auto-login after registration
      const tokenResponse = await authApi.login({
        email: data.email,
        password: data.password,
      });

      localStorage.setItem('bharat_traffic_token', tokenResponse.access_token);

      // Fetch user profile from /me
      const meResponse = await authApi.getMe();
      const authUser = toAuthUser(meResponse);

      setUser(authUser);
      setRoleState(authUser.role);
      setIsLoading(false);
      return authUser;
    } catch (err: unknown) {
      setIsLoading(false);
      const apiError = err as { response?: { data?: { detail?: unknown } }; message?: string };
      const rawDetail = apiError.response?.data?.detail;
      let msg: string;
      if (typeof rawDetail === 'string') {
        msg = rawDetail;
      } else if (Array.isArray(rawDetail) && rawDetail.length > 0) {
        msg = rawDetail.map((e: any) => e.msg || String(e)).join('; ');
      } else {
        msg = apiError.message || 'Registration failed. Please try again.';
      }
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setRoleState('user');
    localStorage.removeItem('bharat_traffic_token');
    localStorage.removeItem('bharat_traffic_user');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError,
        setRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
