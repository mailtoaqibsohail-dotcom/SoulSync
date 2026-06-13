import axios from 'axios';

// Dedicated axios instance for the admin panel. It is fully isolated from the
// user app's global `axios.defaults` (set in AuthContext) — it carries the
// admin token, not the dating-app user token. The two never collide.
const ADMIN_TOKEN_KEY = 'spark_admin_token';

const adminApi = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export { ADMIN_TOKEN_KEY };
export default adminApi;
