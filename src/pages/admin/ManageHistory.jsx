import { useEffect, useState } from 'react';
import { History as HistoryIcon, Pencil, Plus, Save, X } from 'lucide-react';
import api from '../../services/api';
import activityLogService from '../../services/activityLog.service';
import PageLatestChangeCard from '../../components/PageLatestChangeCard';
import AdminLayout from './AdminLayout';
import {
  HISTORY_TABS,
  createEmptyHistoryTimeline,
  createEmptyTimelineRow,
  getHistoryTimelineTotal,
  normalizeHistoryTimeline,
} from '../../utils/historyTimeline';

const ManageHistory = () => {
  const [timeline, setTimeline] = useState(() => createEmptyHistoryTimeline());
  const [savedTimeline, setSavedTimeline] = useState(() => createEmptyHistoryTimeline());
  const [activeTab, setActiveTab] = useState('state');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadTimeline();
  }, []);

  const loadTimeline = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/home/about-timeline');
      const normalizedTimeline = normalizeHistoryTimeline(data.timeline);
      setTimeline(normalizedTimeline);
      setSavedTimeline(normalizedTimeline);
    } catch (error) {
      console.error('Failed to load history timeline', error);
      alert('Failed to load timeline');
    } finally {
      setIsLoading(false);
    }
  };

  const activeSection = HISTORY_TABS.find((tab) => tab.key === activeTab) || HISTORY_TABS[0];
  const activeRows = timeline[activeTab] || [];
  const totalEntries = getHistoryTimelineTotal(timeline);

  const updateActiveRows = (updater) => {
    setTimeline((current) => ({
      ...current,
      [activeTab]: updater(Array.isArray(current[activeTab]) ? current[activeTab] : []),
    }));
  };

  const updateRow = (index, field, value) => {
    updateActiveRows((rows) =>
      rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row))
    );
  };

  const addRow = () => {
    updateActiveRows((rows) => [...rows, createEmptyTimelineRow()]);
  };

  const removeRow = (index) => {
    updateActiveRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index));
  };

  const toggleFixedRow = (index) => {
    updateActiveRows((rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, fixed: !row.fixed } : row
      )
    );
  };

  const handleEditToggle = () => {
    if (isEditing) {
      setTimeline(normalizeHistoryTimeline(savedTimeline));
      setIsEditing(false);
      return;
    }

    setIsEditing(true);
  };

  const saveTimeline = async (event) => {
    event.preventDefault();
    const normalizedTimeline = normalizeHistoryTimeline(timeline);

    try {
      setIsSaving(true);
      await api.put('/home/about-timeline', { timeline: normalizedTimeline });
      setTimeline(normalizedTimeline);
      setSavedTimeline(normalizedTimeline);
      setIsEditing(false);
      alert('Timeline updated');

      activityLogService.logActivity(
        'Updated History Page Content',
        'History Page',
        `Updated ${getHistoryTimelineTotal(normalizedTimeline)} history entries`,
        [
          { field: 'State Entries', after: String(normalizedTimeline.state.length) },
          { field: 'National Entries', after: String(normalizedTimeline.national.length) },
        ]
      );
    } catch (error) {
      console.error('Failed to save history timeline', error);
      alert('Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const renderReadOnlyTable = () => {
    if (isLoading) {
      return <div style={emptyState}>Loading timeline...</div>;
    }

    if (!activeRows.length) {
      return (
        <div style={emptyState}>
          No {activeSection.label.toLowerCase()} timeline records added yet.
        </div>
      );
    }

    return (
      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr style={thead}>
              <th style={th}>#</th>
              <th style={th}>Academic Year</th>
              <th style={th}>{activeSection.hostLabel}</th>
              <th style={th}>Venue</th>
            </tr>
          </thead>
          <tbody>
            {activeRows.map((row, index) => (
              <tr key={`${activeTab}-${row.year}-${index}`} style={index % 2 === 0 ? rowEven : rowOdd}>
                <td style={tdCenter}>{index + 1}</td>
                <td style={td}>{row.year}</td>
                <td style={td}>{row.host}</td>
                <td style={td}>{row.venue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderEditTable = () => (
    <form onSubmit={saveTimeline}>
      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr style={thead}>
              <th style={th}>#</th>
              <th style={th}>Academic Year</th>
              <th style={th}>{activeSection.hostLabel}</th>
              <th style={th}>Venue</th>
              <th style={th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {activeRows.length > 0 ? (
              activeRows.map((row, index) => (
                <tr key={`${activeTab}-edit-${index}`} style={index % 2 === 0 ? rowEven : rowOdd}>
                  <td style={tdCenter}>{index + 1}</td>
                  <td style={td}>
                    <input
                      id={`${activeTab}-history-year-${index}`}
                      name={`${activeTab}HistoryYear-${index}`}
                      value={row.year}
                      disabled={row.fixed}
                      onChange={(event) => updateRow(index, 'year', event.target.value)}
                      style={inputStyle(row.fixed)}
                    />
                  </td>
                  <td style={td}>
                    <input
                      id={`${activeTab}-history-host-${index}`}
                      name={`${activeTab}HistoryHost-${index}`}
                      value={row.host}
                      disabled={row.fixed}
                      onChange={(event) => updateRow(index, 'host', event.target.value)}
                      style={inputStyle(row.fixed)}
                    />
                  </td>
                  <td style={td}>
                    <input
                      id={`${activeTab}-history-venue-${index}`}
                      name={`${activeTab}HistoryVenue-${index}`}
                      value={row.venue}
                      disabled={row.fixed}
                      onChange={(event) => updateRow(index, 'venue', event.target.value)}
                      style={inputStyle(row.fixed)}
                    />
                  </td>
                  <td style={tdCenter}>
                    <div style={rowActions}>
                      <button
                        type="button"
                        onClick={() => toggleFixedRow(index)}
                        style={row.fixed ? btnFixed : btnFix}
                      >
                        {row.fixed ? 'Fixed' : 'Fix'}
                      </button>
                      {!row.fixed && (
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          style={btnRemove}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={emptyRowCell}>
                  No rows in this section yet. Use Add Row to create the first entry.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={actions}>
        <button
          type="button"
          onClick={addRow}
          style={btnAdd}
        >
          <Plus size={18} />
          Add Row
        </button>
        <button
          type="submit"
          style={btnSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : (
            <>
              <Save size={18} />
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  );

  return (
    <AdminLayout>
      <div style={page}>
        <PageLatestChangeCard pageName="History Page" />

        <div style={panel}>
          <header style={header}>
            <div>
              <h2 style={title}>
                <HistoryIcon size={26} />
                Manage History
              </h2>
              <p style={subtitle}>
                Maintain separate state and national history timelines. State tab is visible by default.
              </p>
            </div>

            <button
              onClick={handleEditToggle}
              style={isEditing ? btnCancel : btnEdit}
              disabled={isLoading || isSaving}
            >
              {isEditing ? (
                <>
                  <X size={16} />
                  Cancel
                </>
              ) : (
                <>
                  <Pencil size={16} />
                  Edit
                </>
              )}
            </button>
          </header>

          <div style={tabBar}>
            {HISTORY_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  style={isActive ? tabButtonActive : tabButton}
                >
                  {tab.label}
                  <span style={isActive ? tabCountActive : tabCount}>
                    {timeline[tab.key]?.length || 0}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={summaryGrid}>
            <div style={summaryCard}>
              <span style={summaryValue}>{timeline.state.length}</span>
              <span style={summaryLabel}>State Entries</span>
            </div>
            <div style={summaryCard}>
              <span style={summaryValue}>{timeline.national.length}</span>
              <span style={summaryLabel}>National Entries</span>
            </div>
            <div style={summaryCard}>
              <span style={summaryValue}>{totalEntries}</span>
              <span style={summaryLabel}>Total Entries</span>
            </div>
          </div>

          <section style={sectionCard}>
            <div style={sectionHeader}>
              <div>
                <h3 style={sectionTitle}>{activeSection.title}</h3>
                <p style={sectionCopy}>{activeSection.description}</p>
              </div>
              <div style={recordPill}>{activeRows.length} Records</div>
            </div>

            {isEditing ? renderEditTable() : renderReadOnlyTable()}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
};

const page = {
  background: '#f4f6f8',
  minHeight: '100vh',
  padding: '20px',
};

const panel = {
  background: '#ffffff',
  borderRadius: '24px',
  padding: '24px',
  boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)',
  border: '1px solid #dbe2ea',
};

const header = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '16px',
  flexWrap: 'wrap',
  marginBottom: '20px',
};

const title = {
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  fontSize: '28px',
  fontWeight: '700',
  color: '#0b3ea8',
};

const subtitle = {
  margin: '8px 0 0',
  color: '#526173',
  fontSize: '15px',
  lineHeight: 1.5,
};

const tabBar = {
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
  marginBottom: '18px',
};

const baseTabButton = {
  border: 'none',
  borderRadius: '999px',
  padding: '12px 18px',
  fontSize: '15px',
  fontWeight: '700',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '10px',
};

const tabButton = {
  ...baseTabButton,
  background: 'linear-gradient(180deg, #ffd54f 0%, #f1b90c 100%)',
  color: '#172033',
};

const tabButtonActive = {
  ...baseTabButton,
  background: 'linear-gradient(180deg, #244b9a 0%, #102f73 100%)',
  color: '#ffffff',
  boxShadow: '0 10px 24px rgba(16, 47, 115, 0.24)',
};

const tabCount = {
  minWidth: '28px',
  padding: '4px 8px',
  borderRadius: '999px',
  background: 'rgba(23, 32, 51, 0.12)',
  color: '#172033',
  textAlign: 'center',
  fontSize: '13px',
};

const tabCountActive = {
  ...tabCount,
  background: 'rgba(255, 255, 255, 0.14)',
  color: '#ffffff',
};

const summaryGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '14px',
  marginBottom: '20px',
};

const summaryCard = {
  borderRadius: '18px',
  border: '1px solid #dbe2ea',
  background: 'linear-gradient(180deg, #f8fbff 0%, #edf3fb 100%)',
  padding: '18px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const summaryValue = {
  fontSize: '30px',
  fontWeight: '700',
  color: '#0f172a',
};

const summaryLabel = {
  fontSize: '14px',
  color: '#526173',
  fontWeight: '600',
};

const sectionCard = {
  borderRadius: '22px',
  border: '1px solid #dbe2ea',
  background: '#f8fafc',
  overflow: 'hidden',
};

const sectionHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '14px',
  flexWrap: 'wrap',
  padding: '22px 22px 0',
};

const sectionTitle = {
  margin: 0,
  fontSize: '24px',
  color: '#102f73',
};

const sectionCopy = {
  margin: '8px 0 0',
  fontSize: '15px',
  color: '#526173',
};

const recordPill = {
  padding: '10px 14px',
  borderRadius: '999px',
  background: '#102f73',
  color: '#ffffff',
  fontWeight: '700',
  fontSize: '14px',
};

const tableWrap = {
  overflowX: 'auto',
  padding: '22px',
};

const table = {
  width: '100%',
  minWidth: '760px',
  borderCollapse: 'collapse',
  background: '#ffffff',
  borderRadius: '18px',
  overflow: 'hidden',
  boxShadow: '0 12px 28px rgba(71, 85, 105, 0.08)',
  border: '1px solid #dbe2ea',
};

const thead = {
  background: 'linear-gradient(90deg, #244b9a 0%, #102f73 100%)',
};

const th = {
  padding: '16px',
  textAlign: 'left',
  fontWeight: '700',
  color: '#ffffff',
  fontSize: '15px',
};

const td = {
  padding: '14px 16px',
  fontSize: '16px',
  color: '#0f172a',
  borderBottom: '1px solid #e5ebf2',
};

const tdCenter = {
  ...td,
  textAlign: 'center',
  fontWeight: '600',
};

const rowEven = { background: '#ffffff' };
const rowOdd = { background: '#f8fafc' };

const emptyState = {
  padding: '52px 24px',
  textAlign: 'center',
  color: '#526173',
  fontSize: '16px',
};

const emptyRowCell = {
  padding: '28px 16px',
  textAlign: 'center',
  color: '#526173',
  fontSize: '15px',
  borderBottom: '1px solid #e5ebf2',
};

const baseInput = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #c8d3df',
  borderRadius: '10px',
  color: '#0f172a',
  fontSize: '15px',
  backgroundColor: '#ffffff',
  boxSizing: 'border-box',
};

const inputStyle = (isFixed) => ({
  ...baseInput,
  backgroundColor: isFixed ? '#eef2f7' : '#ffffff',
  cursor: isFixed ? 'not-allowed' : 'text',
});

const actions = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  flexWrap: 'wrap',
  padding: '0 22px 22px',
};

const baseActionButton = {
  border: 'none',
  borderRadius: '12px',
  padding: '12px 18px',
  fontSize: '15px',
  fontWeight: '700',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
};

const btnEdit = {
  ...baseActionButton,
  background: '#0b3ea8',
  color: '#ffffff',
};

const btnCancel = {
  ...baseActionButton,
  background: '#64748b',
  color: '#ffffff',
};

const btnAdd = {
  ...baseActionButton,
  background: '#102f73',
  color: '#ffffff',
};

const btnSave = {
  ...baseActionButton,
  background: '#15803d',
  color: '#ffffff',
};

const rowActions = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap',
};

const btnFix = {
  border: 'none',
  borderRadius: '8px',
  padding: '8px 12px',
  background: '#0b3ea8',
  color: '#ffffff',
  cursor: 'pointer',
  fontWeight: '700',
};

const btnFixed = {
  ...btnFix,
  background: '#64748b',
};

const btnRemove = {
  border: 'none',
  borderRadius: '8px',
  padding: '8px 12px',
  background: '#dc2626',
  color: '#ffffff',
  cursor: 'pointer',
  fontWeight: '700',
};

export default ManageHistory;
