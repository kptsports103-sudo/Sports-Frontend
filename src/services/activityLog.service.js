import api from './api';
import { getParsedUser } from '../context/tokenStorage';

const getUser = () => {
  try {
    return getParsedUser();
  } catch (error) {
    console.error('Error reading user from storage:', error);
  }
  return null;
};

const ROUTE_LABELS = [
  [/^\/admin\/super-admin-dashboard$/, 'Super Admin Dashboard'],
  [/^\/admin\/dashboard$/, 'Admin Dashboard'],
  [/^\/admin\/darya-notepad$/, 'Darya Notepad'],
  [/^\/admin\/creator-dashboard$/, 'Creator Dashboard'],
  [/^\/dashboard\/coach$/, 'Coach Dashboard'],
  [/^\/admin\/iam\/users$/, 'IAM Users'],
  [/^\/admin\/users-manage$/, 'Users Management'],
  [/^\/admin\/update-pages$/, 'Content Management Dashboard'],
  [/^\/admin\/manage-home$/, 'Manage Home'],
  [/^\/admin\/manage-about$/, 'Manage About'],
  [/^\/admin\/manage-history$/, 'Manage History'],
  [/^\/admin\/manage-gallery$/, 'Manage Gallery'],
  [/^\/admin\/manage-results$/, 'Manage Results'],
  [/^\/admin\/manage-winners$/, 'Manage Winners'],
  [/^\/admin\/sports-meet-registrations$/, 'Sports Meet Registrations'],
  [/^\/admin\/media$/, 'Media Management'],
  [/^\/admin\/add-media$/, 'Add Media'],
  [/^\/admin\/audit-logs$/, 'Audit Logs'],
  [/^\/admin\/media-stats$/, 'Media Statistics'],
  [/^\/admin\/login-activity$/, 'Login Activity'],
  [/^\/admin\/abuse-logs$/, 'Abuse Logs'],
  [/^\/admin\/settings$/, 'Settings'],
  [/^\/sports-dashboard$/, 'Sports Dashboard'],
  [/^\/verify\/.+$/, 'Certificate Verification'],
  [/^\/archive(?:\/\d{4})?$/, 'Sports Archive'],
  [/^\/players$/, 'Players Directory'],
  [/^\/players\/[^/]+$/, 'Player Profile'],
  [/^\/sports-celebration$/, 'Annual Sports Celebration'],
  [/^\/winners$/, 'Winners'],
  [/^\/points-table$/, 'Points Table'],
  [/^\/results$/, 'Results'],
  [/^\/gallery$/, 'Gallery'],
  [/^\/events$/, 'Annual Sports Celebration'],
  [/^\/history$/, 'History'],
  [/^\/about$/, 'About'],
  [/^\/(home|)$/, 'Home'],
];

const NAVIGATION_LOG_KEY = 'activity:last-navigation';

const normalizeRole = (role) => String(role || '').trim().toLowerCase();

const canTrackUser = (user) => Boolean(user && normalizeRole(user.role));

export const resolvePageNameFromPath = (pathname = '') => {
  const safePath = String(pathname || '').trim() || '/';
  const matched = ROUTE_LABELS.find(([pattern]) => pattern.test(safePath));
  if (matched) return matched[1];

  const lastPart = safePath.replace(/\/+$/, '').split('/').filter(Boolean).pop();
  if (!lastPart) return 'Dashboard';

  return lastPart
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const buildQueryString = (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `&${query}` : '';
};

const writeNavigationState = (pathname) => {
  try {
    sessionStorage.setItem(NAVIGATION_LOG_KEY, JSON.stringify({
      pathname,
      loggedAt: Date.now(),
    }));
  } catch {
    // Ignore storage issues - logging should remain best-effort.
  }
};

const shouldSkipNavigationLog = (pathname) => {
  try {
    const raw = sessionStorage.getItem(NAVIGATION_LOG_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed?.pathname !== pathname) return false;
    return Date.now() - Number(parsed?.loggedAt || 0) < 4000;
  } catch {
    return false;
  }
};

const logActivity = async (action, pageName, details = '', changes = [], extra = {}) => {
  try {
    const user = getUser();
    if (!canTrackUser(user)) {
      return null;
    }

    const payload = {
      action,
      pageName,
      details,
      changes: Array.isArray(changes) ? changes : [],
      source: extra.source || 'manual',
      method: extra.method || '',
      route: extra.route || '',
      clientPath: extra.clientPath || (typeof window !== 'undefined' ? window.location.pathname : ''),
      statusCode: extra.statusCode || 0,
      metadata: extra.metadata || {}
    };

    const response = await api.post('/admin-activity', payload);
    return response.data;
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw error - activity logging should not break main functionality
    return null;
  }
};

const logPageVisit = async (pathname, explicitPageName = '') => {
  const safePath = String(pathname || '').trim() || '/';
  const user = getUser();
  if (!canTrackUser(user) || shouldSkipNavigationLog(safePath)) {
    return null;
  }

  const pageName = explicitPageName || resolvePageNameFromPath(safePath);
  const result = await logActivity(
    'Visited Page',
    pageName,
    `Opened ${pageName}`,
    [],
    {
      source: 'navigation',
      method: 'NAVIGATE',
      route: safePath,
      clientPath: safePath,
    }
  );

  writeNavigationState(safePath);
  return result;
};

// Get current user's activity logs
const getMyActivityLogs = async (limit = 15, page = 1) => {
  try {
    const response = await api.get(`/admin-activity/my-logs?limit=${limit}&page=${page}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching my activity logs:', error);
    throw error;
  }
};

// Get all activity logs (Super Admin only)
const getAllActivityLogs = async (limit = 50, page = 1, filters = {}) => {
  try {
    let queryParams = `?limit=${limit}&page=${page}`;
    queryParams += buildQueryString({
      from: filters.from,
      to: filters.to,
      search: filters.search,
      role: filters.role,
      source: filters.source,
      pageName: filters.pageName,
      method: filters.method,
      action: filters.action,
    });

    const response = await api.get(`/admin-activity/all${queryParams}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching all activity logs:', error);
    throw error;
  }
};

// Get activity logs for a specific page
const getPageActivityLogs = async (pageName, limit = 20) => {
  try {
    const response = await api.get(`/admin-activity/page/${encodeURIComponent(pageName)}?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching page activity logs:', error);
    throw error;
  }
};

export const activityLogService = {
  logActivity,
  logPageVisit,
  getMyActivityLogs,
  getAllActivityLogs,
  getPageActivityLogs
};

export default activityLogService;
