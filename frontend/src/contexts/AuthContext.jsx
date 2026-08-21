import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, authStorage } from '@/lib/api.js';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hydrate = async () => {
      const storedUser = localStorage.getItem('citifix_user');
      const token = authStorage.getToken();

      if (!token) {
        setLoading(false);
        return;
      }

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {}
      }

      try {
        const me = await authApi.me();
        if (me && me.user) {
          setUser(me.user);
          localStorage.setItem('citifix_user', JSON.stringify(me.user));
        }
      } catch (err) {
        // If we have stored user, retain it (demo/offline resilience)
        if (!storedUser) {
          localStorage.removeItem('citifix_user');
          authStorage.clearToken();
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    hydrate();
  }, []);

  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem('citifix_user', JSON.stringify(userData));
    if (token) {
      authStorage.setToken(token);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('citifix_user');
    authStorage.clearToken();
  };

  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('citifix_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};