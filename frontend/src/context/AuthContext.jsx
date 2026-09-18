import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

// Wraps the whole app (see App.jsx) and holds the currently logged-in
// user's info in memory. On first load it calls GET /auth/me to check
// whether the browser already has a valid session cookie.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = not logged in
  const [loading, setLoading] = useState(true); // true until the initial /auth/me check finishes

  async function loadUser() {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    setUser(res.data.user);
    return res.data.user; // caller uses this to decide where to redirect (see Login.jsx)
  }

  async function logout() {
    await api.post('/auth/logout');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Convenience hook - any component can call useAuth() to get
// { user, loading, login, logout } instead of importing AuthContext directly.
export function useAuth() {
  return useContext(AuthContext);
}