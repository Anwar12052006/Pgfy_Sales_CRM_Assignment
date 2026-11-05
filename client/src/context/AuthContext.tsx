import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Role, type User, type LoginCredentials } from '@/types';
import { authService } from '@/services/authService';

export interface AuthContextType {
  user: User | null;
  role: Role | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => void;
  setRoleForPreview: (role: Role) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Verify stored session on mount
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        if (isMounted) {
          setUser(null);
          setToken(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        // Fetch current user from /api/auth/me to verify token validity
        const profile = await authService.getMe();
        if (isMounted) {
          setUser(profile);
          setToken(storedToken);
          localStorage.setItem('user', JSON.stringify(profile));
        }
      } catch (error) {
        // Token is invalid or expired
        if (isMounted) {
          authService.logout();
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Centralized login handler: calls backend API, stores token & user in localStorage
   */
  const login = useCallback(async (credentials: LoginCredentials): Promise<User> => {
    setIsLoading(true);
    try {
      const authData = await authService.login(credentials);
      setToken(authData.token);
      setUser(authData.user);
      localStorage.setItem('token', authData.token);
      localStorage.setItem('user', JSON.stringify(authData.user));
      return authData.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Centralized logout handler: purges local tokens and resets auth state
   */
  const logout = useCallback(() => {
    authService.logout();
    setToken(null);
    setUser(null);
  }, []);

  /**
   * Helper for UI role switching during evaluation
   */
  const setRoleForPreview = useCallback((newRole: Role) => {
    setUser((prev) =>
      prev
        ? { ...prev, role: newRole }
        : {
            id: 'preview-id',
            name: newRole === Role.ADMIN ? 'PGfy Admin' : 'Demo Executive',
            email: newRole === Role.ADMIN ? 'admin@pgfy.demo' : 'sales@pgfy.demo',
            role: newRole,
            isActive: true,
          }
    );
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
        setRoleForPreview,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
