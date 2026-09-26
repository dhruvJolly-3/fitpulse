import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { faviconLogin, faviconLogout, faviconHeartbeat } from '../favicon';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// Backend origin. Set REACT_APP_API_URL on Vercel (inlined at build time by
// Create React App); local dev falls back to the Express server on :5001.
// A trailing slash or `/api` suffix is stripped so either form works.
const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5001')
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

const api = axios.create({ baseURL: `${API_URL}/api` });

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
      // Render's free tier can take ~a minute to wake up, so don't hold the
      // splash screen forever: give up after 20s and show the sign-in page.
      // Only drop the token when the server actually rejects it (401).
      api.get('/user/profile', { timeout: 20000 })
        .then(r => setUser(r.data))
        .catch(err => { if (err.response?.status === 401) localStorage.removeItem('fp_token'); })
        .finally(() => setLoading(false));
    } else setLoading(false);
  }, []);

  // Every auth endpoint returns { token, user }; store both.
  const startSession = (data) => {
    localStorage.setItem('fp_token', data.token);
    setUser(data.user);
    faviconLogin();
    return data;
  };

  const login = async (email, password) =>
    startSession((await api.post('/auth/login', { email, password })).data);

  const register = async (name, email, password) =>
    startSession((await api.post('/auth/register', { name, email, password })).data);

  // `credential` is the ID token from the Google Identity Services button.
  const googleLogin = async (credential) =>
    startSession((await api.post('/auth/google', { credential })).data);

  // Sets a new password from an emailed reset link, then signs straight in.
  const resetPassword = async (token, password) =>
    startSession((await api.post('/auth/reset-password', { token, password })).data);

  const logout = () => {
    localStorage.removeItem('fp_token');
    setUser(null);
    faviconLogout();
  };

  // Favicon heartbeat only while signed in
  const signedIn = Boolean(user);
  useEffect(() => (signedIn ? faviconHeartbeat() : undefined), [signedIn]);

  const updateUser = (updated) => setUser(prev => ({ ...prev, ...updated }));

  return (
    <AuthContext.Provider value={{ user, loading, login, register, googleLogin, resetPassword, logout, updateUser, api }}>
      {children}
    </AuthContext.Provider>
  );
};

export { api };
