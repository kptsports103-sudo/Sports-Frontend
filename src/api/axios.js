import axios from 'axios';
import { clearAuthStorage, getAccessToken } from '../context/tokenStorage';
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

api.interceptors.response.use(
  r => r,
  async (err) => {
    if (err.response && err.response.status === 401) {
      clearAuthStorage();
    }
    throw err;
  }
);

export default api;
