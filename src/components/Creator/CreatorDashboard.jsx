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
      color: '#3b82f6',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      tab: 'players',
    },
    {
      id: 2,
      title: 'Attendance Tracking',
      description: 'Track daily attendance, monitor presence, and generate attendance reports',
      icon: 'A',
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
      tab: 'attendance',
    },
    {
      id: 3,
      title: 'Performance Analytics',
      description: 'Analyze player performance, view statistics, and track progress over time',
      icon: 'R',
      color: '#ec4899',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      tab: 'performance',
    },
    {
      id: 4,
      title: 'Sports Meet Data Entry',
      description: 'Manage annual sports celebration events for indoor and outdoor categories',
      icon: 'S',
      color: '#0ea5e9',
      gradient: 'linear-gradient(135deg, #93c5fd 0%, #38bdf8 100%)',
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
      accent: 'from-amber-100 via-orange-50 to-white',
      chip: 'Annual',
      chipClass: 'bg-amber-100 text-amber-700',
    },
    {
      value: DEFAULT_DASHBOARD_SCOPE,
      title: 'State Inter-Polytechnic',
      description: 'Open the full creator dashboard with all standard sections.',
      icon: <Building2 size={22} />,
      accent: 'from-sky-100 via-cyan-50 to-white',
      chip: 'Full Access',
      chipClass: 'bg-sky-100 text-sky-700',
    },
    {
      value: 'national-level',
      title: 'National Level',
      description: 'Open the national level module. This section is currently pending.',
      icon: <Flag size={22} />,
      accent: 'from-slate-100 via-gray-50 to-white',
      chip: 'Pending',
      chipClass: 'bg-slate-200 text-slate-700',
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600">
            Creator Access
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
            Choose the meet type to open
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Select one module first. After selection, only that meet flow will be shown.
          </p>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-3">
          {cards.map((card) => (
            <button
              key={card.value}
              type="button"
              onClick={() => onSelect(card.value)}
              className={`group flex h-full flex-col rounded-[24px] border border-slate-200 bg-gradient-to-br ${card.accent} p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-sm">
                  {card.icon}
                </div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${card.chipClass}`}>
                  {card.chip}
                </span>
              </div>

              <div className="mt-6">
                <h3 className="text-xl font-semibold text-slate-900">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{card.description}</p>
              </div>

              <div className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
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
      <div className="min-h-screen bg-[#e5e7eb]">
        <div className="bg-white border-b border-gray-300">
          <div className="creator-content-stretch px-8">
            <div className="flex flex-col gap-6 py-8 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-gray-900 text-white flex items-center justify-center font-semibold rounded-lg text-lg">
                  KPT
                </div>
                <div>
                  <h1 className="text-3xl font-semibold text-gray-900 leading-tight">CreatorDashboard</h1>
                  <p className="text-base text-gray-500 mt-1">
                    {dashboardScope
                      ? `Current module: ${getDashboardScopeLabel(dashboardScope)}`
                      : 'Select a meet type to continue'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-end">
                <div className="min-w-[300px] rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 shadow-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
                    Meet Type
                  </div>
                  <div className="mt-2 text-base font-semibold text-gray-900">
                    {dashboardScope ? getDashboardScopeLabel(dashboardScope) : 'No meet type selected'}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {dashboardScope
                      ? 'Use change to switch to a different meet flow.'
                      : 'Choose one meet type from the selection cards below.'}
                  </p>
                  {dashboardScope ? (
                    <button
                      type="button"
                      onClick={handleResetScope}
                      className="mt-3 inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-100"
                    >
                      Change Meet Type
                    </button>
                  ) : null}
                </div>
                <div className="text-right">
                  <div className="text-base font-medium text-gray-900">Creator</div>
                  <div className="text-sm text-gray-500">Administrator</div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-700 font-semibold text-base">
                  C
                </div>
              </div>
            </div>

            {dashboardScope === DEFAULT_DASHBOARD_SCOPE && (
              <div className="flex flex-wrap gap-10 pb-4">
                {[
                  { key: 'players', label: 'Players' },
                  { key: 'player-intelligence', label: 'Player Intelligence' },
                  { key: 'attendance', label: 'Attendance' },
                  { key: 'performance', label: 'Performance Analysis' },
                  { key: 'sports-events', label: 'Sports Meet Data Entry' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => handleTabChange(tab.key)}
                    className={`relative text-lg font-medium pb-3 transition-colors ${
                      activeTab === tab.key ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                    {activeTab === tab.key && (
                      <span className="absolute left-0 -bottom-[2px] w-full h-[3px] bg-gray-900 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="creator-content-stretch px-8 py-10">
          <div className="bg-white border border-gray-200">
            <div className="p-8">{renderContent()}</div>
          </div>
        </div>
      </div>
    </CreatorLayout>
  );
};

export default CreatorDashboard;

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
    boxSizing: 'border-box',
    width: '100%',
    minWidth: 0,
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  pageTitle: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: '8px',
  },
  pageSubtitle: {
    fontSize: '16px',
    color: '#6b7280',
    margin: 0,
  },
  kpmCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '24px',
  },
  kpmHeader: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '12px',
  },
  kpmGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '10px',
  },
  kpmItem: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  kpmLabel: {
    fontSize: '12px',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  kpmValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#111827',
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
    background: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)',
    border: '1px dashed #fdba74',
    borderRadius: '16px',
    padding: '32px',
  },
  pendingBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 12px',
    borderRadius: '999px',
    backgroundColor: '#ffedd5',
    color: '#c2410c',
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  },
  pendingTitle: {
    margin: 0,
    fontSize: '30px',
    fontWeight: 700,
    color: '#111827',
  },
  pendingText: {
    margin: 0,
    fontSize: '15px',
    color: '#6b7280',
  },
  cardsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    width: '100%',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
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
    color: '#1f2937',
    marginBottom: '12px',
    margin: '0 0 12px 0',
  },
  cardDescription: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5',
    marginBottom: '20px',
    margin: '0 0 20px 0',
  },
  viewButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
    width: '100%',
  },
};

