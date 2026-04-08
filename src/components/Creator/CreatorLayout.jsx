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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
      style={{ '--sidebar-width': isSidebarOpen ? '350px' : '60px' }}
    >
      {/* Creator Sidebar */}
      <div className="sidebar" style={{ 
        width: isSidebarOpen ? '350px' : '60px',
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
      }}>
        {/* Profile Section */}
        <div 
          className="profile"
          style={{
          }}
        >
          
          <img
            src={user?.profileImage || "/avatar.png"}
            alt="Profile"
            style={{ 
              width: '150px', 
              height: '150px', 
              imageRendering: 'auto', 
              borderRadius: '12px', 
              objectFit: 'cover',
              border: '3px solid rgba(255,255,255,0.3)'
            }}
          />
          {/* User Info Table */}
          <div style={{ marginTop: '16px' }}>
            <table style={{ width: '100%', fontSize: '14px', color: '#fff' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '4px 0', fontWeight: 600, color: 'rgba(255,255,255,0.8)', width: '80px' }}>Name:</td>
                  <td style={{ padding: '4px 0', fontWeight: 600 }}>{user?.name || 'Creator'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Email:</td>
                  <td style={{ padding: '4px 0', fontSize: '13px' }}>{user?.email}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Role:</td>
                  <td style={{ padding: '4px 0' }}>
                    <span style={{
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.2)',
                      color: '#fff',
                      textTransform: 'uppercase'
                    }}>
                      {user?.role || 'Creator'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>

        {/* Logout Button */}
        <button 
          className="logout-btn" 
          onClick={handleLogout}
          style={{
            background: 'rgba(255,255,255,0.2)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.3)'
          }}
        >
          Logout
        </button>

        {/* Menu */}
        <div className="menu">
          {visibleCreatorMenuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`menu-item ${isActive(item.path) ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                textDecoration: 'none',
                color: 'rgba(255,255,255,0.95)',
                padding: '14px 20px',
                borderRadius: '10px',
                margin: '6px 12px',
                transition: 'all 0.25s ease',
                background: isActive(item.path) ? 'rgba(255,255,255,0.25)' : 'transparent',
                boxShadow: isActive(item.path) ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                borderLeft: isActive(item.path) ? '4px solid #fff' : '4px solid transparent'
              }}
            >
              <span style={{ marginRight: '12px', fontSize: '18px' }}>{item.icon}</span>
              {isSidebarOpen && <span style={{ fontWeight: 600 }}>{item.label}</span>}
            </Link>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content" style={{ background: '#f8f9fa' }}>
        {children}
      </div>
    </div>
  );
};

export default CreatorLayout;






