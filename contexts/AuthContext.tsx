import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, AuthContextType } from '../types';
import { DEMO_USERS } from '../constants';

const AUTH_STORAGE_KEY = 'derivhr_session';
const SESSION_EXPIRY_HOURS = 8;

interface StoredSession {
  user: User;
  expiresAt: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const restoreSession = () => {
      try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const session: StoredSession = JSON.parse(stored);
          if (session.expiresAt > Date.now()) {
            setUser(session.user);
          } else {
            localStorage.removeItem(AUTH_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = (email: string, role: UserRole): boolean => {
    // Find matching demo user
    const matchedUser = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.role === role
    );

    if (matchedUser) {
      setUser(matchedUser);

      // Persist session to localStorage
      const session: StoredSession = {
        user: matchedUser,
        expiresAt: Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000,
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));

      return true;
    }

    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
