import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import activityLogService from '../../services/activityLog.service';
import { clearAuthStorage } from '../../context/tokenStorage';
import { CMS_PAGE_UPDATED } from '../../utils/eventBus';
import '../../admin.css';

const CMS_SEEN_STORAGE_KEY = 'cms_page_last_seen_v1';
const CMS_PAGES = [
  'Home Page',
  'About Page',
  'History Page',
  'Gallery Page',
  'Results Page'
];

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [cmsUnreadCount, setCmsUnreadCount] = useState(0);

  const readSeenMap = () => {
    try {
      const raw = localStorage.getItem(CMS_SEEN_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const loadCmsUnreadCount = async () => {
    try {
      const seenMap = readSeenMap();
      const responses = await Promise.all(
        CMS_PAGES.map((page) => activityLogService.getPageActivityLogs(page, 50))
      );

      const unread = responses.reduce((sum, response, index) => {
        const pageName = CMS_PAGES[index];
        const logs = Array.isArray(response?.data) ? response.data : [];
        const lastSeen = seenMap[pageName] ? new Date(seenMap[pageName]).getTime() : 0;
        const pageUnread = logs.filter((log) => {
          const created = log?.createdAt ? new Date(log.createdAt).getTime() : 0;
          return created > lastSeen;
        }).length;
        return sum + pageUnread;
      }, 0);

      setCmsUnreadCount(unread);
    } catch (error) {
      console.error('Failed to load CMS unread count:', error);
      setCmsUnreadCount(0);
    }
  };

  useEffect(() => {
    // Refresh user data to get latest profileImage from Cloudinary
    if (user) {
      refreshUser();
    }
  }, []);

  useEffect(() => {
    loadCmsUnreadCount();

    const refreshCounts = () => loadCmsUnreadCount();
    window.addEventListener(CMS_PAGE_UPDATED, refreshCounts);
    window.addEventListener('HOME_UPDATED', refreshCounts);

    return () => {
      window.removeEventListener(CMS_PAGE_UPDATED, refreshCounts);
      window.removeEventListener('HOME_UPDATED', refreshCounts);
    };
  }, [location.pathname]);
  const isCreator = user?.role === 'creator';

  const adminMenuItems = [
    { path: '/admin/dashboard', label: 'Dashboard', marker: 'D' },
    { path: '/admin/users-manage', label: 'IAM Users', marker: 'U' },
    { path: '/admin/media-stats', label: 'Media Statistics & Calculator', marker: 'S' },
    { path: '/admin/media', label: 'Media Management', marker: 'M' },
    { path: '/admin/update-pages', label: 'Content Management Dashboard', marker: 'C' },
    { path: '/admin/manage-home', label: 'Manage Home', marker: 'H' },
    { path: '/admin/manage-about', label: 'Manage About', marker: 'I' },
    { path: '/admin/manage-history', label: 'Manage History', marker: 'R' },
    { path: '/admin/manage-gallery', label: 'Manage Gallery', marker: 'G' },
    { path: '/admin/manage-results', label: 'Manage Results', marker: 'T' },
    { path: '/admin/manage-winners', label: 'Winners', marker: 'W' },
    { path: '/admin/sports-meet-registrations', label: 'Sports Meet Registration', marker: 'R' },
  ];

  const creatorMenuItems = [
    { path: '/admin/dashboard', label: 'Dashboard', marker: 'D' },
    { path: '/admin/users-manage', label: 'IAM Users', marker: 'U' },
    { path: '/admin/media', label: 'Media Management', marker: 'M' },
    { path: '/admin/manage-results', label: 'Manage Results', marker: 'T' },
    { path: '/admin/manage-winners', label: 'Winners', marker: 'W' },
    { path: '/admin/sports-meet-registrations', label: 'Sports Meet Registration', marker: 'R' },
  ];


  const menuItems = isCreator ? creatorMenuItems : adminMenuItems;

  const handleLogout = () => {
    clearAuthStorage();
    navigate('/login', { replace: true });
  };

  return (
    <div className="dashboard-shell" style={{ '--sidebar-width': '324px' }}>
      <div className="sidebar admin-sidebar-panel">
        <div className="admin-sidebar-brand">
          <div className="admin-sidebar-brand__crest">CMS</div>
          <div className="admin-sidebar-brand__copy">
            <span className="admin-sidebar-brand__eyebrow">KPT Sports</span>
            <strong className="admin-sidebar-brand__title">Admin Workspace</strong>
            <span className="admin-sidebar-brand__subtext">Unified content and data control panel</span>
          </div>
        </div>

        <div className="profile admin-sidebar-profile">
          <img
            src={user?.profileImage || '/avatar.png'}
            alt="Profile"
            className="admin-sidebar-profile__image"
          />

          <div className="admin-sidebar-profile__meta">
            <div className="admin-sidebar-profile__row">
              <span className="admin-sidebar-profile__label">Name:</span>
              <span className="admin-sidebar-profile__value">{user?.name || 'Admin User'}</span>
            </div>
            <div className="admin-sidebar-profile__row">
              <span className="admin-sidebar-profile__label">Email:</span>
              <span className="admin-sidebar-profile__value admin-sidebar-profile__value--email">
                {user?.email || '-'}
              </span>
            </div>
            <div className="admin-sidebar-profile__row">
              <span className="admin-sidebar-profile__label">Role:</span>
              <span className="admin-sidebar-profile__badge">{user?.role || 'Admin'}</span>
            </div>
          </div>
        </div>

        <button
          className="logout-btn admin-sidebar-panel__logout"
          onClick={handleLogout}
          type="button"
        >
          Logout
        </button>

        <div className="menu admin-sidebar-panel__menu">
          {menuItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`menu-item admin-sidebar-panel__item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="admin-sidebar-panel__marker">{item.marker}</span>
              <span className="admin-sidebar-panel__text">{item.label}</span>
              {item.path === '/admin/update-pages' && cmsUnreadCount > 0 ? (
                <span className="admin-sidebar-panel__badge" title={`${cmsUnreadCount} unread content change${cmsUnreadCount > 1 ? 's' : ''}`}>
                  {cmsUnreadCount > 99 ? '99+' : cmsUnreadCount}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      </div>

      <div className="main-content admin-main-content">
        <div className="admin-main-shell">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;


