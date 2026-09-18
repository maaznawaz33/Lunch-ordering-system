import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  withCredentials: true, // send/receive httpOnly cookies
});

// Auto-refresh the access token once on a 401, then retry the original request.
// Skip this entirely for auth endpoints themselves - a failed /auth/me or
// /auth/login should just mean "not logged in", not trigger a redirect loop.
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
        return api(original);
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
