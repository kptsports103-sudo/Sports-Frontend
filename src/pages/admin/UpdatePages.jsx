import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BellDot,
  CircleHelp,
  Clock3,
  History as HistoryIcon,
  Home,
  Image as ImageIcon,
  Trophy,
} from 'lucide-react';
import AdminLayout from './AdminLayout';
import activityLogService from '../../services/activityLog.service';
import { CMS_PAGE_UPDATED } from '../../utils/eventBus';

const CMS_SEEN_STORAGE_KEY = 'cms_page_last_seen_v1';

const UPDATE_CARDS = [
  { title: 'Update Home', icon: Home, description: 'Manage home page content', pageName: 'Home Page' },
  { title: 'Update About', icon: CircleHelp, description: 'Manage about page content', pageName: 'About Page' },
  { title: 'Update History', icon: HistoryIcon, description: 'Manage history page content', pageName: 'History Page' },
  { title: 'Update Gallery', icon: ImageIcon, description: 'Manage gallery page content', pageName: 'Gallery Page' },
  { title: 'Update Results', icon: Trophy, description: 'Manage results page content', pageName: 'Results Page' },
];

const UpdatePages = () => {
  const navigate = useNavigate();
  const [dateTime, setDateTime] = useState(new Date());
  const [changeCountByPage, setChangeCountByPage] = useState({});
  const [latestByPage, setLatestByPage] = useState({});

  const readSeenMap = () => {
    try {
      const raw = localStorage.getItem(CMS_SEEN_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const writeSeenMap = (next) => {
    localStorage.setItem(CMS_SEEN_STORAGE_KEY, JSON.stringify(next));
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadPageChangeCounts = async () => {
      try {
        const seenMap = readSeenMap();
        const responses = await Promise.all(
          UPDATE_CARDS.map((card) => activityLogService.getPageActivityLogs(card.pageName, 50))
        );

        const next = {};
        const nextLatest = {};
        UPDATE_CARDS.forEach((card, index) => {
          const logs = Array.isArray(responses[index]?.data) ? responses[index].data : [];
          const latest = logs[0]?.createdAt || null;
          nextLatest[card.pageName] = latest;
          const lastSeen = seenMap[card.pageName] ? new Date(seenMap[card.pageName]).getTime() : 0;
          next[card.pageName] = logs.filter((log) => {
            const created = log?.createdAt ? new Date(log.createdAt).getTime() : 0;
            return created > lastSeen;
          }).length;
        });
        setChangeCountByPage(next);
        setLatestByPage(nextLatest);
      } catch (error) {
        console.error('Failed to load page change counts:', error);
        setChangeCountByPage({});
        setLatestByPage({});
      }
    };

    loadPageChangeCounts();
    window.addEventListener(CMS_PAGE_UPDATED, loadPageChangeCounts);
    window.addEventListener('HOME_UPDATED', loadPageChangeCounts);
    return () => {
      window.removeEventListener(CMS_PAGE_UPDATED, loadPageChangeCounts);
      window.removeEventListener('HOME_UPDATED', loadPageChangeCounts);
    };
  }, []);

  const handleOpenPageChanges = (pageName) => {
    const seenMap = readSeenMap();
    seenMap[pageName] = latestByPage[pageName] || new Date().toISOString();
    writeSeenMap(seenMap);
    setChangeCountByPage((prev) => ({ ...prev, [pageName]: 0 }));
    navigate(`/admin/update-details/${encodeURIComponent(pageName)}`);
  };

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="admin-page__shell">
          <header className="admin-page__header">
            <div className="admin-page__title-wrap">
              <span className="admin-page__eyebrow">Content Management</span>
              <h1 className="admin-page__title">Content Management Dashboard</h1>
              <p className="admin-page__subtitle">
                Monitor, manage, and track all website content updates in one place.
              </p>
            </div>
          </header>

          <div className="admin-page__section">
            <div style={styles.clockWrap}>
              <div style={styles.clockItem}>
                <Clock3 size={18} />
                <span>Date: {dateTime.toLocaleDateString()}</span>
              </div>
              <div style={styles.clockItem}>
                <Clock3 size={18} />
                <span>Time: {dateTime.toLocaleTimeString()}</span>
              </div>
            </div>

            <div style={styles.grid}>
              {UPDATE_CARDS.map((card) => {
                const count = changeCountByPage[card.pageName] || 0;
                const hasChanges = count > 0;
                const CardIcon = card.icon;

                return (
                  <div
                    key={card.pageName}
                    onClick={() => handleOpenPageChanges(card.pageName)}
                    style={styles.card}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.transform = 'translateY(-4px)';
                      event.currentTarget.style.boxShadow = '0 18px 30px rgba(15, 23, 42, 0.14)';
                      event.currentTarget.style.borderColor = '#bfd3f5';
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.transform = 'translateY(0)';
                      event.currentTarget.style.boxShadow = '0 16px 30px rgba(15, 23, 42, 0.08)';
                      event.currentTarget.style.borderColor = '#dbe2ea';
                    }}
                  >
                    <div style={styles.notifyWrap}>
                      <BellDot size={18} style={{ color: hasChanges ? '#dc2626' : '#64748b' }} />
                      {hasChanges ? (
                        <span style={styles.badge}>{count > 9 ? '9+' : count}</span>
                      ) : null}
                    </div>

                    <h3 style={styles.cardTitle}>
                      <span style={styles.icon}>
                        <CardIcon size={20} />
                      </span>
                      {card.title}
                    </h3>
                    <p style={styles.cardDescription}>{card.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

const styles = {
  clockWrap: {
    margin: '8px 0 18px',
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  clockItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    borderRadius: '999px',
    background: '#ffffff',
    border: '1px solid #dbe2ea',
    color: '#102f73',
    fontWeight: 700,
    fontSize: '15px',
    boxShadow: '0 10px 20px rgba(15, 23, 42, 0.06)',
  },
  grid: {
    marginTop: '10px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '20px',
  },
  card: {
    position: 'relative',
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
    borderRadius: '20px',
    padding: '22px',
    boxShadow: '0 16px 30px rgba(15, 23, 42, 0.08)',
    border: '1px solid #dbe2ea',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  notifyWrap: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    minWidth: '30px',
    height: '30px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#eef3fb',
  },
  badge: {
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    minWidth: '20px',
    height: '20px',
    borderRadius: '999px',
    padding: '0 6px',
    background: '#dc2626',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #fff',
  },
  cardTitle: {
    margin: '0 0 10px 0',
    color: '#111827',
    fontSize: '22px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  icon: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#102f73',
    background: 'linear-gradient(180deg, #ffd54f 0%, #f1b90c 100%)',
    boxShadow: '0 10px 18px rgba(241, 185, 12, 0.18)',
  },
  cardDescription: {
    margin: 0,
    color: '#1f2937',
    fontSize: '15px',
    lineHeight: 1.5,
    fontWeight: 500,
  },
};

export default UpdatePages;
