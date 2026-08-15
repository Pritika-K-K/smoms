import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, UserRole } from '../types';
import { loginApi, getMeApi, updateProfileApi } from '../api/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<User>;
  logout: () => void;
  updateUserProfile: (data: { name?: string; email?: string; phone?: string; password?: string }) => Promise<User>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('smoms_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 5-Minute Inactivity Timeout (5 * 60 * 1000 = 300,000 ms)
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000;

  useEffect(() => {
    const initAuth = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const userData = await getMeApi();
        setUser(userData);
      } catch (err) {
        console.error('Failed to verify stored session:', err);
        localStorage.removeItem('smoms_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, [token]);

  const logout = () => {
    localStorage.removeItem('smoms_token');
    setToken(null);
    setUser(null);
  };

  // Auto Logout on 5 Minutes Inactivity
  useEffect(() => {
    if (!user) return;

    let timeoutId: any;

    const resetInactivityTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.warn('User inactive for 5 minutes. Automatically logging out for security reasons.');
        logout();
      }, INACTIVITY_TIMEOUT);
    };

    let lastActivityTime = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastActivityTime > 1000) {
        lastActivityTime = now;
        resetInactivityTimer();
      }
    };

    // Start timer on initial mount / login
    resetInactivityTimer();

    // Attach activity listeners
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity));

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
    };
  }, [user]);

  const login = async (email: string, pass: string): Promise<User> => {
    const data = await loginApi(email, pass);
    localStorage.setItem('smoms_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const updateUserProfile = async (data: { name?: string; email?: string; phone?: string; password?: string }): Promise<User> => {
    const updatedUser = await updateProfileApi(data);
    setUser(updatedUser);
    return updatedUser;
  };

  const hasRole = (...roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUserProfile, hasRole }}>
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
