const ACCESS_TOKEN_KEY = 'accessToken';
const USER_KEY = 'user';
const SECRET_KEY_TOKEN_KEY = 'secretKeyToken';

const isBrowser = () => typeof window !== 'undefined';

const readSessionStorage = (callback, fallback = null) => {
  if (!isBrowser()) return fallback;
  try {
    return callback(window.sessionStorage);
  } catch {
    return fallback;
  }
};

const readLocalStorage = (callback, fallback = null) => {
  if (!isBrowser()) return fallback;
  try {
    return callback(window.localStorage);
  } catch {
    return fallback;
  }
};

const migrateLegacyKey = (key) => {
  const sessionValue = readSessionStorage((storage) => storage.getItem(key));
  const legacyValue = readLocalStorage((storage) => storage.getItem(key));

  if (!sessionValue && legacyValue) {
    readSessionStorage((storage) => storage.setItem(key, legacyValue));
  }

  if (legacyValue) {
    readLocalStorage((storage) => storage.removeItem(key));
  }
};

const migrateLegacyAuthStorage = () => {
  migrateLegacyKey(ACCESS_TOKEN_KEY);
  migrateLegacyKey(USER_KEY);
};

const getStorageItem = (key) => {
  migrateLegacyAuthStorage();
  return readSessionStorage((storage) => storage.getItem(key));
};

const setStorageItem = (key, value) => {
  if (!isBrowser()) return;
  readSessionStorage((storage) => storage.setItem(key, value));
  readLocalStorage((storage) => storage.removeItem(key));
};

const removeStorageItem = (key) => {
  if (!isBrowser()) return;
  readSessionStorage((storage) => storage.removeItem(key));
  readLocalStorage((storage) => storage.removeItem(key));
};

const getAccessToken = () => getStorageItem(ACCESS_TOKEN_KEY);

const setAccessToken = (token) => {
  if (!token) {
    removeStorageItem(ACCESS_TOKEN_KEY);
    return;
  }

  setStorageItem(ACCESS_TOKEN_KEY, token);
};

const getStoredUser = () => getStorageItem(USER_KEY);

const getSecretKeyToken = () => getStorageItem(SECRET_KEY_TOKEN_KEY);

const getParsedUser = () => {
  const raw = getStoredUser();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    removeStorageItem(USER_KEY);
    return null;
  }
};

const setStoredUser = (user) => {
  if (!user) {
    removeStorageItem(USER_KEY);
    return;
  }

  setStorageItem(USER_KEY, JSON.stringify(user));
};

const setSecretKeyToken = (token) => {
  if (!token) {
    removeStorageItem(SECRET_KEY_TOKEN_KEY);
    return;
  }

  setStorageItem(SECRET_KEY_TOKEN_KEY, token);
};

const clearSecretKeyToken = () => {
  removeStorageItem(SECRET_KEY_TOKEN_KEY);
};

const clearAuthStorage = () => {
  removeStorageItem(ACCESS_TOKEN_KEY);
  removeStorageItem(USER_KEY);
  removeStorageItem(SECRET_KEY_TOKEN_KEY);
};

export {
  clearAuthStorage,
  clearSecretKeyToken,
  getAccessToken,
  getParsedUser,
  getSecretKeyToken,
  getStoredUser,
  setAccessToken,
  setSecretKeyToken,
  setStoredUser,
};
