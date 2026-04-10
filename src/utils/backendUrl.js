const trimTrailingSlash = (value = "") => String(value || "").trim().replace(/\/+$/, "");

const isLocalHttpUrl = (value = "") => /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/i.test(String(value || "").trim());

const DEFAULT_REMOTE_API_BASE = "https://kpt-sports-backend.vercel.app/api/v1";
const DEFAULT_LOCAL_API_PROXY = "/api/v1";
const DEFAULT_LOCAL_OCR_PROXY = "/ocr";
const API_PREFIX = "/api/v1";

const normalizeApiBase = (value = "") => {
  const trimmed = trimTrailingSlash(value);

  if (!trimmed) {
    return "";
  }

  if (/\/api\/v\d+$/i.test(trimmed)) {
    return trimmed;
  }

  if (/\/api$/i.test(trimmed)) {
    return `${trimmed}/v1`;
  }

  return `${trimmed}${API_PREFIX}`;
};

const configuredApiBase = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL);
const configuredOcrBase = trimTrailingSlash(import.meta.env.VITE_OCR_API_URL);

export const API_BASE_URL = (() => {
  if (!import.meta.env.DEV) {
    return normalizeApiBase(configuredApiBase || DEFAULT_REMOTE_API_BASE);
  }

  if (!configuredApiBase || isLocalHttpUrl(configuredApiBase)) {
    return DEFAULT_LOCAL_API_PROXY;
  }

  return normalizeApiBase(configuredApiBase);
})();

export const OCR_BASE_URL = (() => {
  if (!import.meta.env.DEV) {
    return configuredOcrBase;
  }

  if (!configuredOcrBase || isLocalHttpUrl(configuredOcrBase)) {
    return DEFAULT_LOCAL_OCR_PROXY;
  }

  return configuredOcrBase;
})();

const backendOrigin = (() => {
  if (!API_BASE_URL || API_BASE_URL.startsWith("/")) {
    return "";
  }

  return trimTrailingSlash(API_BASE_URL.replace(/\/api(?:\/v\d+)?$/i, ""));
})();

export const buildBackendUrl = (path = "") => {
  const safePath = String(path || "").trim();
  if (!safePath) {
    return backendOrigin || API_BASE_URL;
  }

  if (/^https?:\/\//i.test(safePath)) {
    return safePath;
  }

  const normalizedPath = safePath.startsWith("/") ? safePath : `/${safePath}`;
  return backendOrigin ? `${backendOrigin}${normalizedPath}` : normalizedPath;
};
