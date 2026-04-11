import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, ChevronRight, Flag, Trophy } from 'lucide-react';
import CreatorLayout from './CreatorLayout';
import Players from './Players';
import Attendance from './Attendance';
import PerformanceAnalysis from './PerformanceAnalysis';
import PlayerIntelligence from './PlayerIntelligence';
import SportsMeetDataEntry from './SportsMeetDataEntry';
import api from '../../services/api';

const DEFAULT_DASHBOARD_SCOPE = 'state-inter-polytechnic';
const DASHBOARD_SCOPE_OPTIONS = [
  { value: 'annual-sports-celebration', label: 'Annual Sports Celebration' },
  { value: DEFAULT_DASHBOARD_SCOPE, label: 'State Inter-Polytechnic' },
  { value: 'national-level', label: 'National Level' },
];

const isValidDashboardScope = (scope) =>
  DASHBOARD_SCOPE_OPTIONS.some((option) => option.value === scope);

const getDashboardScopeLabel = (scope) =>
  DASHBOARD_SCOPE_OPTIONS.find((option) => option.value === scope)?.label || 'State Inter-Polytechnic';

const CreatorOverview = ({ onNavigate }) => {
  const [poolStatus, setPoolStatus] = useState(null);
  const [poolError, setPoolError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const fetchPoolStatus = async () => {
      try {
        setPoolError('');
        const res = await api.get('/home/pool-status');
        if (!cancelled) {
          setPoolStatus(res.data || null);
        }
      } catch {
        if (!cancelled) {
          setPoolError('Unable to load pool status');
        }
      }
    };

    fetchPoolStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    {
      id: 1,
      title: 'Players Management',
      description: 'Manage and organize players by year, add new players, and maintain player records',
      icon: 'P',
      color: '#102f73',
      gradient: 'linear-gradient(135deg, #2f5fb9 0%, #102f73 100%)',
      tab: 'players',
    },
    {
      id: 2,
      title: 'Attendance Tracking',
      description: 'Track daily attendance, monitor presence, and generate attendance reports',
      icon: 'A',
      color: '#0f766e',
      gradient: 'linear-gradient(135deg, #1ba39c 0%, #0f766e 100%)',
      tab: 'attendance',
    },
    {
      id: 3,
      title: 'Performance Analytics',
      description: 'Analyze player performance, view statistics, and track progress over time',
      icon: 'R',
      color: '#9a6700',
      gradient: 'linear-gradient(135deg, #ffd54f 0%, #f1b90c 100%)',
      tab: 'performance',
    },
    {
      id: 4,
      title: 'Sports Meet Data Entry',
      description: 'Manage annual sports celebration events for indoor and outdoor categories',
      icon: 'S',
      color: '#1d4ed8',
      gradient: 'linear-gradient(135deg, #5f89dd 0%, #173f90 100%)',
      tab: 'sports-events',
    },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>Dashboard</h1>
        <p style={styles.pageSubtitle}>Manage your sports academy efficiently</p>
      </div>
      <div style={styles.kpmCard}>
        <div style={styles.kpmHeader}>KPM Pool Status</div>
        <div style={styles.kpmGrid}>
          <div style={styles.kpmItem}>
            <span style={styles.kpmLabel}>Total</span>
            <span style={styles.kpmValue}>{poolStatus?.total ?? '--'}</span>
          </div>
          <div style={styles.kpmItem}>
            <span style={styles.kpmLabel}>Used</span>
            <span style={styles.kpmValue}>{poolStatus?.allocated ?? '--'}</span>
          </div>
          <div style={styles.kpmItem}>
            <span style={styles.kpmLabel}>Free</span>
            <span style={styles.kpmValue}>{poolStatus?.available ?? '--'}</span>
          </div>
          <div style={styles.kpmItem}>
            <span style={styles.kpmLabel}>Usage</span>
            <span style={styles.kpmValue}>{poolStatus?.usagePercent ?? '--'}%</span>
          </div>
        </div>
        {poolError && <div style={styles.kpmError}>{poolError}</div>}
      </div>
      <div style={styles.cardsContainer}>
        {cards.map((card) => (
          <div key={card.id} style={styles.card}>
            <div style={{ ...styles.cardHeader, background: card.gradient }}>
              <div style={styles.iconContainer}>
                <span style={styles.icon}>{card.icon}</span>
              </div>
            </div>
            <div style={styles.cardContent}>
              <h3 style={styles.cardTitle}>{card.title}</h3>
              <p style={styles.cardDescription}>{card.description}</p>
              <button
                style={{ ...styles.viewButton, backgroundColor: card.color }}
                onClick={() => onNavigate(card.tab)}
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const NationalLevelPending = () => (
  <div style={styles.pendingWrap}>
    <div style={styles.pendingBadge}>Pending</div>
    <h2 style={styles.pendingTitle}>National Level</h2>
    <p style={styles.pendingText}>National level data entry is pending.</p>
  </div>
);

const MeetTypeSelection = ({ onSelect }) => {
  const cards = [
    {
      value: 'annual-sports-celebration',
      title: 'Annual Sports Celebration',
      description: 'Open only the Annual Sports Celebration data entry module.',
      icon: <Trophy size={22} />,
      accent: 'from-[#fff4c2] via-[#fff9e4] to-white',
      chip: 'Annual',
      chipClass: 'bg-[#ffe9a8] text-[#805400]',
    },
    {
      value: DEFAULT_DASHBOARD_SCOPE,
      title: 'State Inter-Polytechnic',
      description: 'Open the full creator dashboard with all standard sections.',
      icon: <Building2 size={22} />,
      accent: 'from-[#e9f1ff] via-[#f3f8ff] to-white',
      chip: 'Full Access',
      chipClass: 'bg-[#d9e8ff] text-[#102f73]',
    },
    {
      value: 'national-level',
      title: 'National Level',
      description: 'Open the national level module. This section is currently pending.',
      icon: <Flag size={22} />,
      accent: 'from-[#eef2f8] via-[#f8fafc] to-white',
      chip: 'Pending',
      chipClass: 'bg-[#e2e8f0] text-[#475569]',
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-[28px] border border-[#dbe2ea] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:p-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center rounded-full bg-[#e9f1ff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#102f73]">
            Creator Access
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#102f73]">
            Choose the meet type to open
          </h2>
          <p className="mt-3 text-base leading-7 text-[#526173]">
            Select one module first. After selection, only that meet flow will be shown.
          </p>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-3">
          {cards.map((card) => (
            <button
              key={card.value}
              type="button"
              onClick={() => onSelect(card.value)}
              className={`group flex h-full flex-col rounded-[24px] border border-[#dbe2ea] bg-gradient-to-br ${card.accent} p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(15,23,42,0.1)]`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#102f73] shadow-sm">
                  {card.icon}
                </div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${card.chipClass}`}>
                  {card.chip}
                </span>
              </div>

              <div className="mt-6">
                <h3 className="text-xl font-semibold text-[#102f73]">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#526173]">{card.description}</p>
              </div>

              <div className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#102f73]">
                Open Module
                <ChevronRight size={16} className="transition group-hover:translate-x-0.5" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const CreatorDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const scopeParam = searchParams.get('scope');
  const initialScope = isValidDashboardScope(scopeParam) ? scopeParam : '';
  const [activeTab, setActiveTab] = useState(tabParam || 'overview');
  const [dashboardScope, setDashboardScope] = useState(initialScope);
  const [lastStandardTab, setLastStandardTab] = useState(tabParam || 'overview');

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    const resolvedScope = isValidDashboardScope(scopeParam) ? scopeParam : '';
    setDashboardScope(resolvedScope);

    if (resolvedScope === DEFAULT_DASHBOARD_SCOPE && tabParam) {
      setLastStandardTab(tabParam);
    }
  }, [scopeParam, tabParam]);

  const syncSearchParams = (tab, scope) => {
    const params = new URLSearchParams();
    params.set('tab', tab || 'overview');

    if (scope) {
      params.set('scope', scope);
    }

    setSearchParams(params);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (dashboardScope === DEFAULT_DASHBOARD_SCOPE) {
      setLastStandardTab(tab);
    }
    syncSearchParams(tab, dashboardScope);
  };

  const handleScopeSelect = (nextScope) => {
    setDashboardScope(nextScope);

    if (nextScope === 'annual-sports-celebration') {
      setActiveTab('sports-events');
      syncSearchParams('sports-events', nextScope);
      return;
    }

    if (nextScope === 'national-level') {
      syncSearchParams(activeTab || 'overview', nextScope);
      return;
    }

    const restoredTab = lastStandardTab || 'overview';
    setActiveTab(restoredTab);
    syncSearchParams(restoredTab, nextScope);
  };

  const handleResetScope = () => {
    setDashboardScope('');
    setActiveTab('overview');
    setSearchParams(new URLSearchParams({ tab: 'overview' }));
  };

  const renderContent = () => {
    if (!dashboardScope) {
      return <MeetTypeSelection onSelect={handleScopeSelect} />;
    }

    if (dashboardScope === 'annual-sports-celebration') {
      return <SportsMeetDataEntry meetScope={dashboardScope} />;
    }

    if (dashboardScope === 'national-level') {
      return <NationalLevelPending />;
    }

    switch (activeTab) {
      case 'players':
        return <Players />;
      case 'attendance':
        return <Attendance />;
      case 'performance':
        return <PerformanceAnalysis />;
      case 'player-intelligence':
        return <PlayerIntelligence />;
      case 'sports-events':
        return <SportsMeetDataEntry meetScope={dashboardScope} />;
      default:
        return <CreatorOverview onNavigate={handleTabChange} />;
    }
  };

  return (
    <CreatorLayout>
      <div className="admin-page creator-dashboard-page">
        <div className="admin-page__shell creator-dashboard-page__shell">
          <div className="creator-dashboard-hero">
            <div className="creator-dashboard-hero__intro">
              <div className="creator-dashboard-hero__crest">KPT</div>
              <div>
                <div className="creator-dashboard-hero__eyebrow">Creator Workspace</div>
                <h1 className="creator-dashboard-hero__title">Creator Dashboard</h1>
                <p className="creator-dashboard-hero__subtitle">
                  {dashboardScope
                    ? `Current module: ${getDashboardScopeLabel(dashboardScope)}`
                    : 'Select a meet type to continue'}
                </p>
              </div>
            </div>

            <div className="creator-dashboard-hero__meta">
              <div className="creator-dashboard-hero__panel">
                <div className="creator-dashboard-hero__panel-label">Meet Type</div>
                <div className="creator-dashboard-hero__panel-value">
                  {dashboardScope ? getDashboardScopeLabel(dashboardScope) : 'No meet type selected'}
                </div>
                <p className="creator-dashboard-hero__panel-copy">
                  {dashboardScope
                    ? 'Use change to switch to a different meet flow.'
                    : 'Choose one meet type from the selection cards below.'}
                </p>
                {dashboardScope ? (
                  <button
                    type="button"
                    onClick={handleResetScope}
                    className="admin-btn admin-btn--primary mt-4"
                  >
                    Change Meet Type
                  </button>
                ) : null}
              </div>

              <div className="creator-dashboard-hero__identity">
                <div>
                  <div className="creator-dashboard-hero__identity-role">Creator</div>
                  <div className="creator-dashboard-hero__identity-copy">Workspace administrator</div>
                </div>
                <div className="creator-dashboard-hero__identity-avatar">C</div>
              </div>
            </div>
          </div>

          {dashboardScope === DEFAULT_DASHBOARD_SCOPE && (
            <div className="creator-dashboard-tabs">
              {[
                { key: 'players', label: 'Players' },
                { key: 'player-intelligence', label: 'Player Intelligence' },
                { key: 'attendance', label: 'Attendance' },
                { key: 'performance', label: 'Performance Analysis' },
                { key: 'sports-events', label: 'Sports Meet Data Entry' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabChange(tab.key)}
                  className={`creator-dashboard-tab ${activeTab === tab.key ? 'active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <div className="admin-page__section creator-dashboard-content">{renderContent()}</div>
        </div>
      </div>
    </CreatorLayout>
  );
};

export default CreatorDashboard;

const styles = {
  page: {
    minHeight: '100%',
    backgroundColor: 'transparent',
    padding: '0',
    boxSizing: 'border-box',
    width: '100%',
    minWidth: 0,
  },
  header: {
    textAlign: 'left',
    marginBottom: '28px',
  },
  pageTitle: {
    fontSize: '34px',
    fontWeight: 700,
    color: '#102f73',
    marginBottom: '8px',
  },
  pageSubtitle: {
    fontSize: '16px',
    color: '#526173',
    margin: 0,
  },
  kpmCard: {
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
    border: '1px solid #dbe2ea',
    borderRadius: '20px',
    padding: '20px',
    marginBottom: '28px',
    boxShadow: '0 16px 32px rgba(15, 23, 42, 0.06)',
  },
  kpmHeader: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#102f73',
    marginBottom: '12px',
  },
  kpmGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '10px',
  },
  kpmItem: {
    backgroundColor: '#ffffff',
    border: '1px solid #dbe2ea',
    borderRadius: '14px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  kpmLabel: {
    fontSize: '12px',
    color: '#526173',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    fontWeight: 700,
  },
  kpmValue: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#102f73',
  },
  kpmError: {
    marginTop: '10px',
    color: '#b91c1c',
    fontSize: '12px',
  },
  pendingWrap: {
    minHeight: '360px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '14px',
    textAlign: 'center',
    background: 'linear-gradient(180deg, #fff9e4 0%, #ffffff 100%)',
    border: '1px dashed #f1b90c',
    borderRadius: '22px',
    padding: '32px',
  },
  pendingBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 12px',
    borderRadius: '999px',
    backgroundColor: '#fff4c2',
    color: '#805400',
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  },
  pendingTitle: {
    margin: 0,
    fontSize: '30px',
    fontWeight: 700,
    color: '#102f73',
  },
  pendingText: {
    margin: 0,
    fontSize: '15px',
    color: '#526173',
  },
  cardsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    width: '100%',
  },
  card: {
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
    border: '1px solid #dbe2ea',
    borderRadius: '22px',
    overflow: 'hidden',
    boxShadow: '0 18px 34px rgba(15, 23, 42, 0.08)',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    cursor: 'pointer',
  },
  cardHeader: {
    height: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconContainer: {
    width: '80px',
    height: '80px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
  icon: {
    fontSize: '36px',
  },
  cardContent: {
    padding: '24px',
    textAlign: 'center',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#102f73',
    marginBottom: '12px',
    margin: '0 0 12px 0',
  },
  cardDescription: {
    fontSize: '14px',
    color: '#526173',
    lineHeight: '1.5',
    marginBottom: '20px',
    margin: '0 0 20px 0',
  },
  viewButton: {
    color: '#ffffff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
    width: '100%',
    boxShadow: '0 12px 24px rgba(16, 47, 115, 0.14)',
  },
};

