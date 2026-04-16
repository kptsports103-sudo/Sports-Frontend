import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, Moon, Sun, X } from 'lucide-react';
import api from '../services/api';
import { applyTheme, getThemePreference, subscribeToThemeChanges } from '../utils/theme';
import './Navbar.css';

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/history', label: 'History' },
  { to: '/archive', label: 'Archive' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/results', label: 'Results' }
];

const READ_IDS_KEY = 'kpt_home_notifications_read_ids';
const EXPLICIT_ID_KEYS = ['id', '_id', 'eventId', 'announcementId', 'uuid'];

const getStoredReadIds = () => {
  try {
    const raw = localStorage.getItem(READ_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((id) => String(id)));
  } catch {
    return new Set();
  }
};

const saveReadIds = (readIds) => {
  localStorage.setItem(READ_IDS_KEY, JSON.stringify(Array.from(readIds)));
};

const getExplicitId = (item) => {
  if (!item || typeof item !== 'object') return '';
  for (const key of EXPLICIT_ID_KEYS) {
    const value = item[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
};

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => getThemePreference());
  const [homeNotifications, setHomeNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const notifyRef = useRef(null);
  const isHome = location.pathname === '/' || location.pathname === '/home';
  const isSolid = scrolled || !isHome;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => subscribeToThemeChanges(setDarkMode), []);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (notifyRef.current && !notifyRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const fetchHomeNotifications = async () => {
    try {
      const res = await api.get('/home');
      const data = res?.data || {};

      const upcomingEvents = Array.isArray(data.upcomingEvents) ? data.upcomingEvents : [];
      const announcements = Array.isArray(data.announcements) ? data.announcements : [];
      const seenCounts = new Map();
      const toUniqueId = (baseId) => {
        const nextCount = (seenCounts.get(baseId) || 0) + 1;
        seenCounts.set(baseId, nextCount);
        return nextCount === 1 ? baseId : `${baseId}#${nextCount}`;
      };

      const eventNotifications = upcomingEvents
        .filter((item) => String(item?.name || '').trim())
        .map((item) => {
          const name = String(item?.name || '').trim();
          const date = String(item?.date || '').trim();
          const venue = String(item?.venue || '').trim();
          const explicitId = getExplicitId(item);
          const baseId = explicitId
            ? `event:id:${explicitId}`
            : `event:${name}|${date}|${venue}`;
          return {
            id: toUniqueId(baseId),
            type: 'event',
            title: name,
            message: `${item?.date || 'Date not set'}${item?.venue ? ` - ${item.venue}` : ''}`.trim(),
          };
        });

      const announcementNotifications = announcements
        .filter((item) => {
          if (typeof item === 'string') return item.trim().length > 0;
          return String(item?.message || item?.text || item?.title || '').trim().length > 0;
        })
        .map((item) => {
          const text =
            typeof item === 'string'
              ? item.trim()
              : String(item?.message || item?.text || item?.title || '').trim();
          const explicitId = getExplicitId(item);
          const baseId = explicitId
            ? `announcement:id:${explicitId}`
            : `announcement:${text}`;
          return {
            id: toUniqueId(baseId),
            type: 'announcement',
            title: 'Latest Announcement',
            message: text,
          };
        });

      const allNotifications = [...eventNotifications, ...announcementNotifications];
      setHomeNotifications(allNotifications);

      const currentIds = new Set(allNotifications.map((item) => item.id));
      const storedReadIds = getStoredReadIds();
      const prunedReadIds = new Set([...storedReadIds].filter((id) => currentIds.has(id)));
      saveReadIds(prunedReadIds);

      const unread = allNotifications.filter((item) => !prunedReadIds.has(item.id)).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Failed to load navbar notifications:', error);
      setHomeNotifications([]);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchHomeNotifications();
  }, []);

  useEffect(() => {
    const handleHomeUpdate = () => {
      fetchHomeNotifications();
    };

    window.addEventListener('HOME_UPDATED', handleHomeUpdate);
    return () => window.removeEventListener('HOME_UPDATED', handleHomeUpdate);
  }, []);

  const goToLogin = () => navigate('/login', { replace: true });

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      applyTheme(next);
      return next;
    });
  };

  const handleNotificationClick = () => {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);

    if (!notificationsOpen) {
      const storedReadIds = getStoredReadIds();
      homeNotifications.forEach((item) => storedReadIds.add(item.id));
      saveReadIds(storedReadIds);
      setUnreadCount(0);
    }
  };

  const visibleNotifications = useMemo(() => homeNotifications.slice(0, 6), [homeNotifications]);

  return (
    <>
      <nav className={`kpt-navbar ${isSolid ? 'kpt-navbar--solid' : 'kpt-navbar--transparent'}`}>
        <div
          className="kpt-navbar__logo"
          onClick={() => navigate('/')}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/')}
          role="button"
          tabIndex={0}
        >
          <img src="/college-logo-left.png" alt="KPT logo" width="42" height="42" />
          <span>KPT Sports</span>
        </div>

        <ul className={`kpt-navbar__links ${mobileOpen ? 'is-open' : ''}`}>
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => (isActive ? 'kpt-navbar__link is-active' : 'kpt-navbar__link')}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
          <li className="kpt-navbar__dropdown">
            <NavLink
              to="/sports-celebration"
              className={({ isActive }) => (isActive ? 'kpt-navbar__link is-active' : 'kpt-navbar__link')}
            >
              Annual Sports Celebration
            </NavLink>
            <div className="kpt-navbar__dropdown-menu">
              <button type="button" onClick={() => navigate('/sports-celebration?tab=events')}>
                Events
              </button>
              <button type="button" onClick={() => navigate('/sports-celebration?tab=registration')}>
                Registration
              </button>
              <button type="button" onClick={() => navigate('/winners')}>
                Winners
              </button>
              <button type="button" onClick={() => navigate('/results')}>
                Results
              </button>
              <button type="button" onClick={() => navigate('/points-table')}>
                Points Table
              </button>
            </div>
          </li>
        </ul>

        <div className="kpt-navbar__right">
          <button type="button" className="kpt-navbar__icon-btn" onClick={toggleDarkMode} aria-label="Toggle theme">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="kpt-navbar__notify" ref={notifyRef}>
            <button
              type="button"
              className="kpt-navbar__icon-btn"
              onClick={handleNotificationClick}
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="kpt-navbar__badge">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notificationsOpen && (
              <div className="kpt-navbar__panel kpt-navbar__panel--notifications">
                {visibleNotifications.length > 0 ? (
                  visibleNotifications.map((item) => (
                    <div key={item.id} className="kpt-navbar__notification-item">
                      <strong>{item.title}</strong>
                      <p>{item.message}</p>
                    </div>
                  ))
                ) : (
                  <p>No new notifications</p>
                )}
              </div>
            )}
          </div>

          <div className="kpt-navbar__avatar-slot" aria-hidden="true">
            <img src="/img1.png" alt="Profile" width="40" height="40" />
          </div>

          <button type="button" className="kpt-navbar__cta" onClick={goToLogin}>
            Login
          </button>
          <button
            type="button"
            className="kpt-navbar__hamburger"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>
      {!isHome && <div className="kpt-navbar__spacer" aria-hidden="true" />}
    </>
  );
};

export default Navbar;
