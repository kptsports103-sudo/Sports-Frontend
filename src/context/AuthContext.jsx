import { createContext, useContext, useMemo, useCallback, useState, useEffect } from "react";
import { useUser, useClerk } from '@clerk/clerk-react';
import api from '../api/axios';
import {
  clearAuthStorage,
  getParsedUser,
  setAccessToken,
  setStoredUser,
} from './tokenStorage';

const AuthContext = createContext(null);
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const normalizeOtp = (value) => String(value || "").replace(/\D/g, "").slice(0, 6);

export const AuthProvider = ({ children }) => {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { signOut } = useClerk();
  const [customUser, setCustomUser] = useState(null);

  useEffect(() => {
    setCustomUser(getParsedUser());
  }, []);

  const user = customUser || (clerkUser ? {
    id: clerkUser.id,
    name: clerkUser.fullName || clerkUser.firstName,
    email: clerkUser.primaryEmailAddress?.emailAddress,
    role: "admin" // Default role, can be customized based on metadata
  } : null);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get('/me');
      const userData = response.data.user;
      setStoredUser(userData);
      setCustomUser(userData);
      return userData;
    } catch (error) {
      console.error('Failed to refresh user:', error);
      return null;
    }
  }, []);

  const login = useCallback(async (email, password, role) => {
    const normalizedEmail = normalizeEmail(email);

    try {
      const payload = role ? { email: normalizedEmail, password, role } : { email: normalizedEmail, password };
      const response = await api.post('/auth/login', payload);
      const data = response.data;
      
      // ✅ Check if OTP is required for admin roles
      if (data.message && data.message.includes('OTP sent')) {
        return {
          requiresOTP: true,
          email: normalizeEmail(data.user?.email || normalizedEmail),
          role: data.user?.role || role || null,
        };
      }
      
      // ✅ Direct login for non-admin roles
      if (data.token) {
        setAccessToken(data.token);
        setStoredUser(data.user);
        setCustomUser(data.user);
        return { requiresOTP: false, ...data };
      } else {
        throw new Error('Login failed: No token received');
      }
    } catch (error) {
      if (error.response?.status === 503) {
        const retryAfter = error.response.data?.retryAfter || 5;
        const backendMessage = String(error.response?.data?.message || '').trim();
        throw new Error(backendMessage || `Server is waking up. Retrying in ${retryAfter} seconds...`);
      }
      
      throw error;
    }
  }, []);

  const verifyOTP = useCallback(async (email, otp) => {
    const normalizedEmail = normalizeEmail(email);
    const normalizedOtp = normalizeOtp(otp);

    if (normalizedOtp.length !== 6) {
      throw new Error('Please enter a valid 6-digit OTP');
    }

    const response = await api.post('/auth/verify-otp', {
      email: normalizedEmail,
      otp: normalizedOtp,
    });
    const data = response.data;
    setAccessToken(data.token);
    setStoredUser(data.user);
    setCustomUser(data.user);
    return data.user;
  }, []);

  const autoLoginFromToken = useCallback((token, user) => {
    setAccessToken(token);
    setStoredUser(user);
    setCustomUser(user);
  }, []);

  const logout = useCallback(async () => {
    if (clerkUser) {
      await signOut();
    }
    clearAuthStorage();
    setCustomUser(null);
  }, [clerkUser, signOut]);

  const value = useMemo(() => ({ user, login, logout, verifyOTP, autoLoginFromToken, refreshUser, isLoaded: clerkLoaded }), [user, login, logout, verifyOTP, autoLoginFromToken, refreshUser, clerkLoaded]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};

export { AuthContext };

export default AuthProvider;
