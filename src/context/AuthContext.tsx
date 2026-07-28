import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { AuthState, User } from '../types/user';

interface AuthContextType extends AuthState {
  login: (user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Check for existing session on mount
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const storedUser = localStorage.getItem('egov_user');
      const sessionExpiry = localStorage.getItem('egov_session_expiry');

      if (storedUser && sessionExpiry) {
        const expiryTime = parseInt(sessionExpiry, 10);
        if (Date.now() < expiryTime) {
          const user = JSON.parse(storedUser);
          if (!user.mobileNumber) {
            user.mobileNumber = '+639531771034';
            localStorage.setItem('egov_user', JSON.stringify(user));
          }
          setAuthState({
            isAuthenticated: true,
            user,
            loading: false,
            error: null,
          });
          return;
        }
      }

      // Session expired or doesn't exist
      clearSession();
    } catch (error) {
      console.error('Session check failed:', error);
      clearSession();
    }
  };

  const clearSession = () => {
    localStorage.removeItem('egov_user');
    localStorage.removeItem('egov_session_expiry');
    setAuthState({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null,
    });
  };

  const login = (user: User) => {
    const sessionExpiry = Date.now() + 30 * 60 * 1000; // 30 minutes
    localStorage.setItem('egov_user', JSON.stringify(user));
    localStorage.setItem('egov_session_expiry', sessionExpiry.toString());

    setAuthState({
      isAuthenticated: true,
      user,
      loading: false,
      error: null,
    });
  };

  const logout = () => {
    clearSession();
  };

  const updateUser = (user: User) => {
    localStorage.setItem('egov_user', JSON.stringify(user));
    setAuthState(prev => ({
      ...prev,
      user,
    }));
  };

  return <AuthContext.Provider value={{ ...authState, login, logout, updateUser }}>{children}</AuthContext.Provider>;
};
