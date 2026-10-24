import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('bayanalert_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('bayanalert_token');
    if (!token) {
      setLoading(false);
      return;
    }

    api.getMe()
      .then(res => {
        if (res?.data?.user) {
          setUser(res.data.user);
          localStorage.setItem('bayanalert_user', JSON.stringify(res.data.user));
        }
      })
      .catch(() => {
        localStorage.removeItem('bayanalert_token');
        localStorage.removeItem('bayanalert_user');
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (username, password) => {
    const res = await api.login({ username, password });
    if (res?.data?.token) {
      localStorage.setItem('bayanalert_token', res.data.token);
      localStorage.setItem('bayanalert_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res?.message || 'Failed to authenticate');
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // Ignore API logout failures and purge local state
    } finally {
      localStorage.removeItem('bayanalert_token');
      localStorage.removeItem('bayanalert_user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
