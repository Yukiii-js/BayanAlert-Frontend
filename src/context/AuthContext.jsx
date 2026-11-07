import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);
const SESSION_ROLE_KEY = 'bayanalert_session_role';
const REPORT_PROMPT_SEEN_KEY = 'bayanalert_resident_report_prompt_seen';
const WEATHER_SESSION_KEYS = [
  'bayanalert_calapan_weather_signature',
  'bayanalert_calapan_weather_advisory_shown',
];

function accountType(user) {
  const roleName = String(user?.role_name || '').trim().toLowerCase();
  if (roleName === 'admin' || String(user?.role_id) === '1') return 'admin';
  if (roleName === 'resident' || roleName === 'user') return 'resident';
  return null;
}

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

    const handleStorage = (event) => {
      if (event.key && ![
        'bayanalert_token',
        'bayanalert_user',
        SESSION_ROLE_KEY,
      ].includes(event.key)) {
        return;
      }

      const savedUser = localStorage.getItem('bayanalert_user');
      const token = localStorage.getItem('bayanalert_token');
      if (!savedUser || !token) {
        setUser(null);
        return;
      }

      try {
        setUser(JSON.parse(savedUser));
      } catch {
        setUser(null);
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('bayanalert_token');
    if (!token) {
      setLoading(false);
      return;
    }

    api.getMe()
      .then(res => {
        if (localStorage.getItem('bayanalert_token') !== token) return;
        if (res?.data?.user) {
          setUser(res.data.user);
          localStorage.setItem('bayanalert_user', JSON.stringify(res.data.user));
          localStorage.setItem(SESSION_ROLE_KEY, accountType(res.data.user) || '');
        }
      })
      .catch(() => {
        if (localStorage.getItem('bayanalert_token') !== token) return;
        localStorage.removeItem('bayanalert_token');
        localStorage.removeItem('bayanalert_user');
        localStorage.removeItem(SESSION_ROLE_KEY);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (username, password, expectedType) => {
    const targetType = expectedType === 'admin' ? 'admin' : 'resident';
    const activeToken = localStorage.getItem('bayanalert_token');
    if (activeToken) {
      let activeUser = null;
      try {
        const savedUser = localStorage.getItem('bayanalert_user');
        activeUser = savedUser ? JSON.parse(savedUser) : null;
      } catch {
        activeUser = null;
      }

      const activeType = accountType(activeUser)
        || localStorage.getItem(SESSION_ROLE_KEY);
      if (!activeType) {
        throw new Error('A session is already active in this browser. Log out before signing in again.');
      }
      if (activeType !== targetType) {
        throw new Error(`An ${activeType} session is already active in this browser. Log out before signing in as a ${targetType}.`);
      }
    }

    const res = await api.login({ username, password });
    if (res?.data?.token) {
      const userType = accountType(res.data.user);
      if (userType !== targetType) {
        throw new Error(
          targetType === 'admin'
            ? 'This login is for administrator accounts only.'
            : 'This login is for resident accounts only.'
        );
      }
      localStorage.setItem('bayanalert_token', res.data.token);
      localStorage.setItem('bayanalert_user', JSON.stringify(res.data.user));
      localStorage.setItem(SESSION_ROLE_KEY, userType);
      localStorage.removeItem(REPORT_PROMPT_SEEN_KEY);
      WEATHER_SESSION_KEYS.forEach((key) => sessionStorage.removeItem(key));
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
      localStorage.removeItem(SESSION_ROLE_KEY);
      localStorage.removeItem(REPORT_PROMPT_SEEN_KEY);
      WEATHER_SESSION_KEYS.forEach((key) => sessionStorage.removeItem(key));
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
