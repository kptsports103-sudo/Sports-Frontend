import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Brain, CheckCircle, LayoutDashboard, ShieldUser, Trophy, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { clearAuthStorage } from '../../context/tokenStorage';
import '../../admin.css';

const DEFAULT_CREATOR_SCOPE = 'state-inter-polytechnic';
const getScopeLabel = (scope) => {
  if (scope === 'annual-sports-celebration') return 'Annual Sports Celebration';
  if (scope === 'national-level') return 'National Level';
  return 'State Inter-Polytechnic';
};

const CreatorLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [isSidebarOpen] = useState(true);
  const currentSearchParams = new URLSearchParams(location.search);
  const currentScope = currentSearchParams.get('scope');

  useEffect(() => {
    // Refresh user data to get latest profileImage from Cloudinary
    if (user) {
      refreshUser();
    }
  }, []);

  const creatorMenuItems = [
    { path: '/admin/creator-dashboard?tab=overview', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { path: '/admin/creator-dashboard?tab=players', label: 'Players', icon: <Users size={18} /> },
    { path: '/admin/creator-dashboard?tab=attendance', label: 'Attendance', icon: <CheckCircle size={18} /> },
    { path: '/admin/creator-dashboard?tab=performance', label: 'Performance Analysis', icon: <BarChart3 size={18} /> },
    { path: '/admin/creator-dashboard?tab=player-intelligence', label: 'Player Intelligence', icon: <Brain size={18} /> },
    { path: '/admin/creator-dashboard?tab=sports-events', label: 'Sports Meet Data Entry', icon: <Trophy size={18} /> },
    { path: '/admin/users-manage', label: 'Users Management', icon: <ShieldUser size={18} /> },
  ];
  const shouldUseMinimalCreatorMenu =
    location.pathname === '/admin/creator-dashboard' &&
    Boolean(currentScope) &&
    currentScope !== DEFAULT_CREATOR_SCOPE;
  const visibleCreatorMenuItems = shouldUseMinimalCreatorMenu
    ? [
        {
          path: currentScope
            ? `/admin/creator-dashboard?tab=overview&scope=${currentScope}`
            : '/admin/creator-dashboard?tab=overview',
          label: currentScope ? getScopeLabel(currentScope) : 'Select Meet Type',
          icon: <LayoutDashboard size={18} />,
        },
      ]
    : creatorMenuItems;

  const isActive = (itemPath) => {
    const [path, query] = itemPath.split('?');

    if (query) {
      return (
        location.pathname === path &&
        location.search.includes(query)
      );
    }

    // For base dashboard, only active when no query params or no tab param
    return location.pathname === path && (!location.search || !location.search.includes('tab='));
  };

  const handleLogout = () => {
    clearAuthStorage();
    navigate('/login', { replace: true });
  };

  return (
    <div
      className="dashboard-shell dashboard-layout"
      style={{ '--sidebar-width': isSidebarOpen ? '324px' : '92px' }}
    >
      <div className="sidebar admin-sidebar-panel creator-sidebar-panel">
        <div className="admin-sidebar-brand creator-sidebar-brand">
          <div className="admin-sidebar-brand__crest">CRT</div>
          <div className="admin-sidebar-brand__copy">
            <span className="admin-sidebar-brand__eyebrow">KPT Sports</span>
            <strong className="admin-sidebar-brand__title">Creator Workspace</strong>
            <span className="admin-sidebar-brand__subtext">Creator tools for players, attendance, analytics, and meets</span>
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
              <span className="admin-sidebar-profile__value">{user?.name || 'Creator User'}</span>
            </div>
            <div className="admin-sidebar-profile__row">
              <span className="admin-sidebar-profile__value admin-sidebar-profile__value--email">
                {user?.email || '-'}
              </span>
            </div>
            <div className="admin-sidebar-profile__row">
              <span className="admin-sidebar-profile__badge">{user?.role || 'Creator'}</span>
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
          {visibleCreatorMenuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`menu-item admin-sidebar-panel__item ${isActive(item.path) ? 'active' : ''}`}
            >
              <span className="admin-sidebar-panel__marker">{item.icon}</span>
              {isSidebarOpen && <span className="admin-sidebar-panel__text">{item.label}</span>}
            </Link>
          ))}
        </div>
      </div>

      <div className="main-content admin-main-content">
        <div className="admin-main-shell">{children}</div>
      </div>
    </div>
  );
};

export default CreatorLayout;






