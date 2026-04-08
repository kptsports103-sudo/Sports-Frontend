import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';

const initialForm = {
  eventName: '',
  category: 'Outdoor',
  sportType: 'Athletics',
  eventType: 'Individual',
  teamSizeMin: '1',
  teamSizeMax: '1',
  gender: 'Mixed',
  venue: '',
  eventDate: '',
  eventTime: '',
  registrationStartDate: '',
  registrationEndDate: '',
};

const sportsTypeOptions = ['Athletics', 'Team Sports', 'Others'];
const genderOptions = ['Male', 'Female', 'Mixed'];
const DEFAULT_MEET_SCOPE = 'state-inter-polytechnic';

const getMeetConfig = (scope = DEFAULT_MEET_SCOPE) => {
  if (scope === 'annual-sports-celebration') {
    return {
      title: 'Annual Sports Celebration Data Entry',
      subtitle: 'Add, update, and manage indoor and outdoor events for Annual Sports Celebration.',
      level: 'Annual Sports Celebration',
    };
  }

  return {
    title: 'State Inter-Polytechnic Data Entry',
    subtitle: 'Add, update, and manage indoor and outdoor events for State Inter-Polytechnic.',
    level: 'State Inter-Polytechnic',
  };
};

const normalizeName = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const normalizeSportType = (value) => {
  const safeValue = String(value || '').trim().toLowerCase();
  if (safeValue === 'team sport' || safeValue === 'team sports') return 'Team Sports';
  if (safeValue === 'athletics') return 'Athletics';
  return 'Others';
};

const deriveRegistrationStatus = (startDate, endDate) => {
  const safeStartDate = String(startDate || '').trim();
  const safeEndDate = String(endDate || '').trim();
  const today = new Date();
  const currentDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  if (!safeStartDate || !safeEndDate) return 'Closed';
  if (safeStartDate > safeEndDate) return 'Closed';

  return currentDate >= safeStartDate && currentDate <= safeEndDate ? 'Open' : 'Closed';
};

const normalizeEvent = (item) => ({
  ...item,
  id: item._id || item.id,
  eventName: item.eventName || item.event_title || '',
  category: item.category || 'Outdoor',
  sportType: normalizeSportType(item.sportType),
  eventType: normalizeSportType(item.sportType) === 'Team Sports' ? 'Team' : item.eventType || 'Individual',
  teamSizeMin:
    (normalizeSportType(item.sportType) === 'Team Sports' ? 'Team' : item.eventType || 'Individual') === 'Team'
      ? (item.teamSizeMin ?? '')
      : '1',
  teamSizeMax:
    (normalizeSportType(item.sportType) === 'Team Sports' ? 'Team' : item.eventType || 'Individual') === 'Team'
      ? (item.teamSizeMax ?? '')
      : '1',
  gender: item.gender || 'Mixed',
  venue: item.venue || '',
  eventDate: item.eventDate || item.date || item.event_date || '',
  eventTime: item.eventTime || '',
  registrationStartDate: item.registrationStartDate || '',
  registrationEndDate: item.registrationEndDate || '',
  registrationStatus: deriveRegistrationStatus(item.registrationStartDate, item.registrationEndDate),
});

const formatValue = (value, fallback = 'TBA') => {
  if (value === null || value === undefined || value === '') return fallback;
  return value;
};

const getTeamSizeText = (item) => {
  if (item.eventType !== 'Team') return '1';
  return `${formatValue(item.teamSizeMin, '-')} - ${formatValue(item.teamSizeMax, '-')}`;
};

const SportsMeetDataEntry = ({ meetScope = DEFAULT_MEET_SCOPE }) => {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const meetConfig = useMemo(() => getMeetConfig(meetScope), [meetScope]);

  const grouped = useMemo(
    () => ({
      indoor: events.filter((item) => item.category === 'Indoor'),
      outdoor: events.filter((item) => item.category === 'Outdoor'),
    }),
    [events]
  );

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/events');
      const list = Array.isArray(res.data) ? res.data.map(normalizeEvent) : [];
      setEvents(list);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const updated = { ...prev, [name]: value };

      if (name === 'sportType' && value === 'Team Sports') {
        updated.eventType = 'Team';
      }

      if (name === 'eventType' && value === 'Individual') {
        updated.teamSizeMin = '1';
        updated.teamSizeMax = '1';
      }

      return updated;
    });
  };

  const reset = () => {
    setForm(initialForm);
    setEditingId(null);
    setError('');
  };

  const registrationStatusPreview = useMemo(
    () => deriveRegistrationStatus(form.registrationStartDate, form.registrationEndDate),
    [form.registrationEndDate, form.registrationStartDate]
  );

  const buildPayload = () => ({
    eventName: form.eventName.trim(),
    event_title: form.eventName.trim(),
    category: form.category,
    sportType: normalizeSportType(form.sportType),
    eventType: normalizeSportType(form.sportType) === 'Team Sports' ? 'Team' : form.eventType,
    teamSizeMin:
      (normalizeSportType(form.sportType) === 'Team Sports' || form.eventType === 'Team') && form.teamSizeMin !== ''
        ? Number(form.teamSizeMin)
        : 1,
    teamSizeMax:
      (normalizeSportType(form.sportType) === 'Team Sports' || form.eventType === 'Team') && form.teamSizeMax !== ''
        ? Number(form.teamSizeMax)
        : 1,
    level: meetConfig.level,
    event_level: meetConfig.level,
    gender: form.gender,
    venue: form.venue.trim(),
    eventDate: form.eventDate,
    date: form.eventDate,
    event_date: form.eventDate,
    eventTime: form.eventTime,
    registrationStartDate: form.registrationStartDate,
    registrationEndDate: form.registrationEndDate,
    registrationStatus: deriveRegistrationStatus(form.registrationStartDate, form.registrationEndDate),
    status: deriveRegistrationStatus(form.registrationStartDate, form.registrationEndDate),
  });

  const validateForm = (payload) => {
    if (!payload.eventName) return 'Event name is required.';

    const duplicateEvent = events.find(
      (item) => item.id !== editingId && normalizeName(item.eventName) === normalizeName(payload.eventName)
    );
    if (duplicateEvent) {
      return 'That event name already exists. Enter a different event name.';
    }

    if (
      payload.eventType === 'Team' &&
      (payload.teamSizeMin === null ||
        payload.teamSizeMax === null ||
        payload.teamSizeMin < 2 ||
        payload.teamSizeMax < 2 ||
        payload.teamSizeMin > payload.teamSizeMax)
    ) {
      return 'Please enter a valid team size range.';
    }

    if (
      payload.registrationStartDate &&
      payload.registrationEndDate &&
      payload.registrationStartDate > payload.registrationEndDate
    ) {
      return 'Registration end date must be after registration start date.';
    }

    return '';
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = buildPayload();
    const validationError = validateForm(payload);

    if (validationError) {
      setError(validationError);
      setSaving(false);
      return;
    }

    try {
      if (editingId) {
        await api.put(`/events/${editingId}`, payload);
      } else {
        await api.post('/events', payload);
      }

      reset();
      await loadEvents();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save event.');
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (item) => {
    setEditingId(item.id);
    setForm({
      eventName: item.eventName || '',
      category: item.category || 'Outdoor',
      sportType: item.sportType || 'Athletics',
      eventType: item.eventType || 'Individual',
      teamSizeMin: item.eventType === 'Team' ? (item.teamSizeMin ?? '') : '1',
      teamSizeMax: item.eventType === 'Team' ? (item.teamSizeMax ?? '') : '1',
      gender: item.gender || 'Mixed',
      venue: item.venue || '',
      eventDate: item.eventDate || '',
      eventTime: item.eventTime || '',
      registrationStartDate: item.registrationStartDate || '',
      registrationEndDate: item.registrationEndDate || '',
    });

    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onDelete = async (id) => {
    const confirmed = window.confirm('Delete this event?');
    if (!confirmed) return;

    try {
      setError('');
      await api.delete(`/events/${id}`);
      await loadEvents();

      if (editingId === id) reset();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete event.');
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.headerBlock}>
        <h2 style={styles.heading}>{meetConfig.title}</h2>
        <p style={styles.subHeading}>{meetConfig.subtitle}</p>
      </div>

      <form onSubmit={onSubmit} style={styles.form}>
        <div style={styles.formTop}>
          <div>
            <h3 style={styles.formTitle}>{editingId ? 'Edit Event' : 'Create New Event'}</h3>
            <p style={styles.formHint}>Fill in the event details below.</p>
          </div>

          <div style={styles.formTopRight}>
            <div style={styles.fieldWrap}>
              <label style={styles.fieldLabel} htmlFor="registrationStartDate">
                Registration Start Date
              </label>
              <input
                id="registrationStartDate"
                style={styles.input}
                type="date"
                name="registrationStartDate"
                value={form.registrationStartDate}
                onChange={onChange}
              />
            </div>
            <div style={styles.fieldWrap}>
              <label style={styles.fieldLabel} htmlFor="registrationEndDate">
                Registration End Date
              </label>
              <input
                id="registrationEndDate"
                style={styles.input}
                type="date"
                name="registrationEndDate"
                value={form.registrationEndDate}
                onChange={onChange}
              />
            </div>
            {editingId ? <span style={styles.editBadge}>Editing mode</span> : null}
          </div>
        </div>

        <div style={styles.grid2}>
          <input
            style={styles.input}
            name="eventName"
            value={form.eventName}
            onChange={onChange}
            placeholder="Event Name"
            required
          />

          <select style={styles.input} name="category" value={form.category} onChange={onChange}>
            <option value="Indoor">Indoor</option>
            <option value="Outdoor">Outdoor</option>
          </select>
        </div>

        <div style={styles.grid4}>
          <select style={styles.input} name="sportType" value={form.sportType} onChange={onChange}>
            {sportsTypeOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            style={styles.input}
            name="eventType"
            value={form.eventType}
            onChange={onChange}
            disabled={form.sportType === 'Team Sports'}
          >
            <option value="Individual">Individual</option>
            <option value="Team">Team</option>
          </select>

          <select style={styles.input} name="gender" value={form.gender} onChange={onChange}>
            {genderOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {form.eventType === 'Team' && (
          <div style={styles.card}>
            <div style={styles.cardTitle}>Team Details</div>
            <div style={styles.grid2}>
              <input
                style={styles.input}
                type="number"
                min="2"
                name="teamSizeMin"
                value={form.teamSizeMin}
                onChange={onChange}
                placeholder="Minimum team size"
                required
              />
              <input
                style={styles.input}
                type="number"
                min={form.teamSizeMin || 2}
                name="teamSizeMax"
                value={form.teamSizeMax}
                onChange={onChange}
                placeholder="Maximum team size"
                required
              />
            </div>
          </div>
        )}

        <div style={styles.grid2}>
          <input style={styles.input} name="venue" value={form.venue} onChange={onChange} placeholder="Venue" />
          <div style={styles.grid2}>
            <div style={styles.fieldWrap}>
              <label style={styles.fieldLabel} htmlFor="eventDate">
                Event Date
              </label>
              <input
                id="eventDate"
                style={styles.input}
                type="date"
                name="eventDate"
                value={form.eventDate}
                onChange={onChange}
              />
            </div>
            <div style={styles.fieldWrap}>
              <label style={styles.fieldLabel} htmlFor="eventTime">
                Event Time
              </label>
              <input
                id="eventTime"
                style={styles.input}
                type="time"
                name="eventTime"
                value={form.eventTime}
                onChange={onChange}
              />
            </div>
          </div>
        </div>

        <div style={styles.grid2}>
          <div style={styles.autoStatusBox}>
            <div style={styles.autoStatusLabel}>Registration Status</div>
            <div
              style={{
                ...styles.statusPill,
                ...(registrationStatusPreview === 'Closed' ? styles.statusClosed : styles.statusOpen),
                width: 'fit-content',
              }}
            >
              {registrationStatusPreview}
            </div>
            <div style={styles.fieldHint}>
              Registration opens automatically only between the start and end date.
            </div>
          </div>
          <div style={styles.autoStatusBox}>
            <div style={styles.autoStatusLabel}>Sport Rules</div>
            <div style={{ color: '#0f172a', fontWeight: 700 }}>
              {form.sportType === 'Team Sports'
                ? 'Team Sports automatically use Team event type.'
                : 'Athletics and Others can use Individual or Team.'}
            </div>
          </div>
        </div>

        {error ? <div style={styles.errorBox}>{error}</div> : null}

        <div style={styles.actions}>
          <button type="submit" style={styles.primaryBtn} disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update Event' : 'Add Event'}
          </button>

          {editingId && (
            <button type="button" style={styles.secondaryBtn} onClick={reset}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? <div style={styles.statusBox}>Loading events...</div> : null}

      {!loading && events.length === 0 ? (
        <div style={styles.emptyState}>
          <h3 style={styles.emptyTitle}>No events yet</h3>
          <p style={styles.emptyText}>Create your first event using the form above.</p>
        </div>
      ) : (
        <div style={styles.tableGrid}>
          <EventsTable title="Indoor Events" items={grouped.indoor} onEdit={onEdit} onDelete={onDelete} />
          <EventsTable title="Outdoor Events" items={grouped.outdoor} onEdit={onEdit} onDelete={onDelete} />
        </div>
      )}
    </div>
  );
};

const EventsTable = ({ title, items, onEdit, onDelete }) => (
  <section style={styles.tableWrap}>
    <div style={styles.tableHeader}>
      <h3 style={styles.tableTitle}>{title}</h3>
      <span style={styles.countBadge}>{items.length}</span>
    </div>

    <div style={styles.scrollX}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Event</th>
            <th style={styles.th}>Sport Type</th>
            <th style={styles.th}>Event Type</th>
            <th style={styles.th}>Team Size</th>
            <th style={styles.th}>Date</th>
            <th style={styles.th}>Time</th>
            <th style={styles.th}>Venue</th>
            <th style={styles.th}>Registration</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {items.length === 0 ? (
            <tr>
              <td style={styles.empty} colSpan={9}>
                No events added
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} style={styles.row}>
                <td style={styles.td}>
                  <strong>{formatValue(item.eventName, 'Untitled Event')}</strong>
                  <div style={styles.meta}>{formatValue(item.category, 'General')}</div>
                </td>
                <td style={styles.td}>{formatValue(item.sportType, '-')}</td>
                <td style={styles.td}>{formatValue(item.eventType, '-')}</td>
                <td style={styles.td}>{getTeamSizeText(item)}</td>
                <td style={styles.td}>{formatValue(item.eventDate)}</td>
                <td style={styles.td}>{formatValue(item.eventTime, '-')}</td>
                <td style={styles.td}>{formatValue(item.venue)}</td>
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.statusPill,
                      ...(item.registrationStatus === 'Closed' ? styles.statusClosed : styles.statusOpen),
                    }}
                  >
                    {formatValue(item.registrationStatus, 'Open')}
                  </span>
                </td>
                <td style={styles.td}>
                  <div style={styles.inlineActions}>
                    <button type="button" style={styles.inlineBtn} onClick={() => onEdit(item)}>
                      Edit
                    </button>
                    <button type="button" style={styles.inlineDangerBtn} onClick={() => onDelete(item.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </section>
);

const styles = {
  page: {
    padding: '8px 0 16px',
    width: '100%',
    minWidth: 0,
  },

  headerBlock: {
    marginBottom: 16,
  },

  heading: {
    fontSize: '1.9rem',
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
  },

  subHeading: {
    marginTop: 8,
    marginBottom: 0,
    color: '#64748b',
    fontSize: '0.98rem',
  },

  form: {
    padding: 18,
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    marginBottom: 18,
    background: '#f8fafc',
    display: 'grid',
    gap: 12,
    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
    width: '100%',
    minWidth: 0,
  },

  formTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
  },
  formTopRight: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(180px, 1fr))',
    gap: 10,
    alignItems: 'start',
    width: 'min(100%, 430px)',
  },

  formTitle: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#0f172a',
  },

  formHint: {
    margin: '4px 0 0',
    color: '#64748b',
    fontSize: '0.92rem',
  },

  editBadge: {
    background: '#fff7ed',
    color: '#c2410c',
    border: '1px solid #fdba74',
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    width: 'fit-content',
  },

  card: {
    border: '1px dashed #cbd5e1',
    borderRadius: 12,
    background: '#ffffff',
    padding: 14,
  },

  cardTitle: {
    fontWeight: 700,
    marginBottom: 10,
    color: '#334155',
    fontSize: '0.95rem',
  },

  grid2: {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  },

  grid3: {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  },

  grid4: {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  },

  input: {
    border: '1px solid #cbd5e1',
    borderRadius: 12,
    padding: '12px 14px',
    background: '#fff',
    outline: 'none',
    fontSize: '0.96rem',
    color: '#0f172a',
  },
  fieldWrap: {
    display: 'grid',
    gap: 6,
  },
  fieldLabel: {
    fontSize: '0.82rem',
    fontWeight: 700,
    color: '#334155',
    paddingLeft: 2,
  },
  fieldHint: {
    margin: '-4px 0 0',
    fontSize: '0.84rem',
    color: '#64748b',
  },

  autoStatusBox: {
    border: '1px solid #cbd5e1',
    borderRadius: 12,
    padding: '12px 14px',
    background: '#fff',
    display: 'grid',
    gap: 8,
    alignContent: 'start',
  },

  autoStatusLabel: {
    fontSize: '0.82rem',
    fontWeight: 700,
    color: '#334155',
  },

  freeBox: {
    border: '1px solid #cbd5e1',
    borderRadius: 12,
    padding: '12px 14px',
    background: '#fff',
    color: '#0f172a',
    fontWeight: 700,
  },

  errorBox: {
    border: '1px solid #fecaca',
    background: '#fff1f2',
    color: '#be123c',
    borderRadius: 12,
    padding: '10px 12px',
    fontSize: '0.95rem',
  },

  actions: {
    display: 'flex',
    gap: 10,
    marginTop: 2,
    flexWrap: 'wrap',
  },

  primaryBtn: {
    border: 'none',
    background: '#0f172a',
    color: '#fff',
    borderRadius: 12,
    padding: '11px 16px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.95rem',
  },

  secondaryBtn: {
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#0f172a',
    borderRadius: 12,
    padding: '11px 16px',
    cursor: 'pointer',
    fontWeight: 600,
  },

  statusBox: {
    border: '1px solid #e2e8f0',
    background: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    color: '#475569',
  },

  emptyState: {
    border: '1px dashed #cbd5e1',
    background: '#fff',
    borderRadius: 16,
    padding: 28,
    textAlign: 'center',
  },

  emptyTitle: {
    margin: 0,
    color: '#0f172a',
    fontSize: '1.1rem',
  },

  emptyText: {
    margin: '8px 0 0',
    color: '#64748b',
  },

  tableGrid: {
    display: 'grid',
    gap: 14,
    gridTemplateColumns: '1fr',
  },

  tableWrap: {
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    background: '#fff',
    overflow: 'hidden',
    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.03)',
    width: '100%',
    minWidth: 0,
  },

  tableHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 14px 0',
  },

  tableTitle: {
    fontSize: '1.08rem',
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
  },

  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 999,
    background: '#e2e8f0',
    color: '#334155',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
    padding: '0 8px',
  },

  scrollX: {
    overflowX: 'auto',
    padding: 14,
  },

  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    minWidth: 760,
  },

  th: {
    textAlign: 'left',
    fontSize: 12,
    color: '#64748b',
    borderBottom: '1px solid #e2e8f0',
    padding: '10px 8px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 800,
    background: '#fff',
  },

  row: {
    background: '#fff',
  },

  td: {
    borderBottom: '1px solid #f1f5f9',
    padding: '12px 8px',
    verticalAlign: 'top',
    color: '#0f172a',
    fontSize: '0.95rem',
  },

  empty: {
    padding: 18,
    textAlign: 'center',
    color: '#64748b',
  },

  meta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },

  inlineActions: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },

  inlineBtn: {
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#0f172a',
    borderRadius: 8,
    padding: '6px 10px',
    cursor: 'pointer',
    fontWeight: 600,
  },

  inlineDangerBtn: {
    border: '1px solid #fecdd3',
    background: '#fff1f2',
    color: '#be123c',
    borderRadius: 8,
    padding: '6px 10px',
    cursor: 'pointer',
    fontWeight: 600,
  },

  statusPill: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '5px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
  },

  statusOpen: {
    background: '#dcfce7',
    color: '#166534',
  },

  statusClosed: {
    background: '#fee2e2',
    color: '#991b1b',
  },
};

export default SportsMeetDataEntry;
