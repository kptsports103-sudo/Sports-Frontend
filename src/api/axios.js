import axios from 'axios';
import { clearAuthStorage, getAccessToken, setAccessToken } from '../context/tokenStorage';
import { API_BASE_URL } from '../utils/backendUrl';

// create an axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true // allow cookies (refresh token)
});

// request interceptor attaches access token if present
api.interceptors.request.use(config => {
  const token = getAccessToken();
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  if (typeof window !== 'undefined' && config.headers) {
    config.headers['X-Client-Path'] = window.location.pathname || '/';
  }
  return config;
});

// response interceptor to attempt refresh on 401
let isRefreshing = false;
let refreshPromise = null;

api.interceptors.response.use(
  r => r,
  async (err) => {
    const originalReq = err.config;
    if (err.response && err.response.status === 401 && !originalReq._retry) {
      originalReq._retry = true;
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = api.post('/auth/refresh').then(res => {
          const { accessToken } = res.data;
          setAccessToken(accessToken);
          isRefreshing = false;
          return accessToken;
        }).catch(e => {
          isRefreshing = false;
          clearAuthStorage();
          throw e;
        });
      }
      try {
        const newToken = await refreshPromise;
        originalReq.headers.Authorization = `Bearer ${newToken}`;
        return api(originalReq);
      } catch (e) {
        // won't refresh -> redirect to login on caller side
        throw e;
      }
    }
    throw err;
  }
);

export default api;
