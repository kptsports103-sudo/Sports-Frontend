import axios from 'axios';

import {
  clearAuthStorage,
  clearSecretKeyToken,
  getAccessToken,
  getParsedUser,
  getSecretKeyToken,
} from '../context/tokenStorage';
import { API_BASE_URL } from '../utils/backendUrl';
import { requestSecretKeyChallenge } from '../services/secretKeyBridge';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const SECRET_KEY_ROLES = new Set(['creator', 'admin', 'superadmin']);
const SECRET_KEY_ERROR_CODES = new Set([
  'SECRET_KEY_REQUIRED',
  'INVALID_SECRET_KEY',
  'SECRET_KEY_SETUP_REQUIRED',
]);

const shouldProtectRequest = (config) => {
  if (config?.__skipSecretKeyInterceptor) {
    return false;
  }

  const method = String(config?.method || '').toUpperCase();
  return ['PUT', 'PATCH', 'DELETE'].includes(method);
};

const shouldUseSecretKeyFlow = () => {
  const role = String(getParsedUser()?.role || '').trim().toLowerCase();
  return SECRET_KEY_ROLES.has(role);
};

api.interceptors.request.use(async (config) => {
  if (!config.headers) {
    config.headers = {};
  }

  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (typeof window !== 'undefined') {
    config.headers['X-Client-Path'] = window.location.pathname || '/';
  }

  const requiresSecretKey = shouldProtectRequest(config) && shouldUseSecretKeyFlow();
  let secretKeyToken = requiresSecretKey ? getSecretKeyToken() : '';
  if (!secretKeyToken && requiresSecretKey) {
    secretKeyToken = await requestSecretKeyChallenge({
      reason: 'Verify your secret key before editing or deleting dashboard data.',
    });
  }

  if (requiresSecretKey && secretKeyToken) {
    config.headers['X-Secret-Key-Token'] = secretKeyToken;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      clearAuthStorage();
    }

    const status = error?.response?.status;
    const code = String(error?.response?.data?.code || '').trim();
    const originalRequest = error?.config;
    const canRetrySecretKey =
      !originalRequest?.__skipSecretKeyInterceptor &&
      !originalRequest?.__secretKeyRetried &&
      shouldUseSecretKeyFlow() &&
      (status === 428 || SECRET_KEY_ERROR_CODES.has(code));

    if (canRetrySecretKey) {
      clearSecretKeyToken();

      try {
        const nextSecretKeyToken = await requestSecretKeyChallenge({
          reason: error?.response?.data?.message || 'Verify your secret key before editing.',
          forceSetup: status === 428 || code === 'SECRET_KEY_SETUP_REQUIRED',
        });

        originalRequest.__secretKeyRetried = true;
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers['X-Secret-Key-Token'] = nextSecretKeyToken;
        return api.request(originalRequest);
      } catch (secretKeyError) {
        return Promise.reject(secretKeyError);
      }
    }

    throw error;
  }
);

export default api;
