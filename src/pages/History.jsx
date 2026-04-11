import { useEffect, useState } from 'react';
import api from '../services/api';
import './History.css';
import {
  HISTORY_TABS,
  getHistoryTimelineTotal,
  normalizeHistoryTimeline,
} from '../utils/historyTimeline';

const History = () => {
  const [timeline, setTimeline] = useState(() => normalizeHistoryTimeline());
  const [activeTab, setActiveTab] = useState('state');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeline();
  }, []);

  const loadTimeline = async () => {
    try {
      const { data } = await api.get('/home/about-timeline');
      setTimeline(normalizeHistoryTimeline(data.timeline));
    } catch (error) {
      console.error('Failed to load timeline', error);
    } finally {
      setLoading(false);
    }
  };

  const currentTab = HISTORY_TABS.find((tab) => tab.key === activeTab) || HISTORY_TABS[0];
  const currentRows = timeline[activeTab] || [];

  if (loading) {
    return (
      <div className="history-page">
        <div className="history-page__shell">
          <div className="history-page__panel">
            <div className="history-page__loader">Loading history timeline...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="history-page__shell">
        <header className="history-page__hero">
          <p className="history-page__eyebrow">KPT Sports Archive</p>
          <h1 className="history-page__title">KPT Sports History</h1>
          <p className="history-page__intro">
            Browse state and national timeline records from the KPT Sports history archive.
          </p>
        </header>

        <section className="history-page__panel">
          <div className="history-page__panel-header">
            <div>
              <h2 className="history-page__section-title">{currentTab.title}</h2>
              <p className="history-page__section-copy">{currentTab.description}</p>
            </div>

            <div className="history-page__stats" aria-label="Timeline counts">
              <div className="history-page__stat">
                <span className="history-page__stat-value">{timeline.state.length}</span>
                <span className="history-page__stat-label">State</span>
              </div>
              <div className="history-page__stat">
                <span className="history-page__stat-value">{timeline.national.length}</span>
                <span className="history-page__stat-label">National</span>
              </div>
              <div className="history-page__stat">
                <span className="history-page__stat-value">{getHistoryTimelineTotal(timeline)}</span>
                <span className="history-page__stat-label">Total</span>
              </div>
            </div>
          </div>

          <div className="history-page__tabs">
            <div className="history-page__tab-group" role="tablist" aria-label="History timeline">
              {HISTORY_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  className={`history-page__tab ${activeTab === tab.key ? 'is-active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="history-page__table-wrap">
            {currentRows.length > 0 ? (
              <table className="history-page__table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Academic Year</th>
                    <th>Host Polytechnic</th>
                    <th>Venue</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRows.map((row, index) => (
                    <tr key={`${activeTab}-${row.year}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{row.year}</td>
                      <td>{row.host}</td>
                      <td>{row.venue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="history-page__empty">
                No {currentTab.label.toLowerCase()} timeline records are available yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default History;
