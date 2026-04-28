import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { API_BASE, authHeaders } from '../api/base';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('growthpath_token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Memoize auth headers to prevent redundant objects
  const headers = useMemo(() => authHeaders(token), [token]);

  useEffect(() => {
    const storedToken = localStorage.getItem('growthpath_token');
    const storedUser = localStorage.getItem('growthpath_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      
      // Sync with server (Standardized endpoint)
      fetch(`${API_BASE}/auth/me`, { headers: authHeaders(storedToken) })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser(data.user);
            localStorage.setItem('growthpath_user', JSON.stringify(data.user));
          }
        })
        .catch(e => console.error("Profile sync failed", e));
    }
    setLoading(false);
  }, []);

  const login = useCallback((userData, userToken) => {
    localStorage.setItem('growthpath_token', userToken);
    localStorage.setItem('growthpath_user', JSON.stringify(userData));
    setToken(userToken);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('growthpath_token');
    localStorage.removeItem('growthpath_user');
    localStorage.removeItem('growthpath_goal_id');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((newData) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...newData };
      localStorage.setItem('growthpath_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // CRITICAL: Memoize the value object to prevent infinite loops in consumers (Dashboard, Analysis)
  const value = useMemo(() => ({
    token,
    user,
    login,
    logout,
    loading,
    updateUser
  }), [token, user, login, logout, loading, updateUser]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
