import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_BASE, authHeaders } from '../api/base';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('growthpath_token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('growthpath_token');
    const storedUser = localStorage.getItem('growthpath_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      
      // Sync with server
      fetch(`${API_BASE}/me`, { headers: authHeaders(storedToken) })
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

  const login = (userData, userToken) => {
    localStorage.setItem('growthpath_token', userToken);
    localStorage.setItem('growthpath_user', JSON.stringify(userData));
    setToken(userToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('growthpath_token');
    localStorage.removeItem('growthpath_user');
    localStorage.removeItem('growthpath_goal_id');
    setToken(null);
    setUser(null);
  };

  const updateUser = (newData) => {
    setUser(prev => {
      const updated = { ...prev, ...newData };
      localStorage.setItem('growthpath_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, loading, updateUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
