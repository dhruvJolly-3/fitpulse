import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('fp_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('fp_token');
    if (token) {
      api.get('/user/profile')
        .then(r => setUser(r.data))
        .catch(() => localStorage.removeItem('fp_token'))
        .finally(() => setLoading(false));
    } else setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('fp_token', data.token);
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('fp_token', data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('fp_token');
    setUser(null);
  };

  const updateUser = (updated) => setUser(prev => ({ ...prev, ...updated }));

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, api }}>
      {children}
    </AuthContext.Provider>
  );
};

export { api };
