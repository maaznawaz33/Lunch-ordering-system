import axios from 'axios';

// Shared axios instance every page imports instead of calling axios
// directly. baseURL comes from the VITE_API_URL environment variable set
// at build time (see .github/workflows/deploy-frontend.yml).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  withCredentials: true, // send/receive the httpOnly accessToken/refreshToken cookies
});

// Auto-refresh: if a request comes back 401 (expired access token), try
// POST /auth/refresh once to get a new one, then retry the original
// request. If the refresh itself fails, the session is truly gone and we
// send the user to /login.
//
// Auth endpoints (/auth/login, /auth/me, etc) are excluded from this logic
// on purpose - a failed login or "am I logged in?" check should just mean
// "not logged in", not trigger a refresh-and-retry loop.
let isRefreshing = false;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthEndpoint = original?.url?.includes('/auth/');

    if (error.response?.status === 401 && !original._retry && !isRefreshing && !isAuthEndpoint) {
      original._retry = true;
      isRefreshing = true;
      try {
        await api.post('/auth/refresh');
        isRefreshing = false;
        return api(original); // retry the original request now that we have a fresh token
      } catch (refreshErr) {
        isRefreshing = false;
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
