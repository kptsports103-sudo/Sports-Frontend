import { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import api from '../../services/api';
import activityLogService from '../../services/activityLog.service';
import PageLatestChangeCard from '../../components/PageLatestChangeCard';
import { CalendarDays, Pencil, Plus, Save } from 'lucide-react';

const ManageEvents = () => {
  const [boxContent, setBoxContent] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const res = await api.get('/home');
        const home = res.data || {};

        setBoxContent(home.about || 'Events Overview');

        const highlights = home.highlights || [];

        setRows(
          highlights.length > 0
            ? highlights
            : [{ title: '', overview: '', url: '', urlFixed: false }]
        );

        setError('');
      } catch (err) {
        console.error('Load error:', err.response?.data || err);
        setError('Server error while loading data. Using default data for recovery.');
        // Data recovery: set default rows so user can still edit
        setRows([{ title: '', overview: '', url: '', urlFixed: false }]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  /* ================= HANDLERS ================= */
  const handleChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;
    setRows(updated);
  };

  const addRow = () => {
    if (!isEditing) return;
    setRows([...rows, { title: '', overview: '', url: '', urlFixed: false }]);
  };

  const deleteRow = (index) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const fixUrl = (index) => {
    const updated = [...rows];
    updated[index].urlFixed = true;
    setRows(updated);
  };

  const removeFix = (index) => {
    const updated = [...rows];
    updated[index].urlFixed = false;
    setRows(updated);
  };

  /* ================= SAVE ================= */
  const saveAll = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const cleanedHighlights = rows
        .filter(r => r.title.trim() && r.overview.trim())
        .map(r => ({
          title: r.title.trim(),
          overview: r.overview.trim(),
          url: r.url.trim()
        }));

      if (cleanedHighlights.length === 0) {
        setError('At least one valid event is required.');
        setSaving(false);
        return;
      }

      await api.put('/home', {
        about: boxContent,
        highlights: cleanedHighlights
      });

      setSuccess('Data saved successfully.');
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 3000);
      
      // Log the activity
      activityLogService.logActivity(
        'Updated Events Page',
        'Events Page',
        `Updated ${cleanedHighlights.length} events`,
        [
          { field: 'About Section', after: String(boxContent || '-').slice(0, 120) },
          { field: 'Events Count', after: String(cleanedHighlights.length) },
          { field: 'Primary Event', after: cleanedHighlights[0]?.title || '-' }
        ]
      );
    } catch (err) {
      console.error('Save error:', err.response?.data || err);
      setError(err.response?.data?.message || 'Server error while saving data.');
    } finally {
      setSaving(false);
    }
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <AdminLayout>
        <div style={pageStyle}>
          <h1 style={{ ...pageTitle, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CalendarDays size={30} />
          Update Events
        </h1>
          <p style={{ marginTop: 0, marginBottom: '12px', color: '#000' }}>Manage events page content</p>
          <PageLatestChangeCard pageName="Events Page" />
          <p style={{ color: '#000' }}>Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  /* ================= UI ================= */
  return (
    <AdminLayout>
      <div style={pageStyle}>
        <h1 style={{ ...pageTitle, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CalendarDays size={30} />
          Update Events
        </h1>
        <p style={{ marginTop: 0, marginBottom: '12px', color: '#000' }}>Manage events page content</p>
        <PageLatestChangeCard pageName="Events Page" />

        {error && <div style={errorBox}>{error}</div>}
        {success && <div style={successBox}>{success}</div>}

        <div style={{ display: 'flex', gap: '10px', margin: '20px 0' }}>
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)} 
              style={{
                ...btnBlue,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Pencil size={16} />
              Edit
            </button>
          )}
          {isEditing && (
            <>
              <button 
                onClick={saveAll} 
                style={{
                  ...btnGreen,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }} 
                disabled={saving}
              >
                {saving ? (
                  'Saving...'
                ) : (
                  <>
                    <Save size={16} />
                    Save All
                  </>
                )}
              </button>
              <button onClick={() => setIsEditing(false)} style={btnGrey}>Back</button>
            </>
          )}
        </div>

        {/* BOX */}
        <div style={boxStyle}>
          <h2 style={boxTitle}>Box</h2>
          {isEditing ? (
            <textarea
              id="boxContent"
              name="boxContent"
              value={boxContent}
              onChange={(e) => setBoxContent(e.target.value)}
              style={textareaStyle}
            />
          ) : (
            <div style={{ whiteSpace: 'pre-wrap', color: '#000' }}>
              {boxContent || ' '}
            </div>
          )}
        </div>

        {/* TABLE */}
        <div style={tableContainerStyle}>
          <table style={eventsTableStyle}>
            <thead>
              <tr style={headerRowStyle}>
                <th style={headerCellStyle}>Title</th>
                <th style={headerCellStyle}>Overview</th>
                <th style={headerCellStyle}>URL</th>
                {isEditing && <th style={headerCellStyle}>Action</th>}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr key={index} style={index % 2 ? bodyRowAltStyle : bodyRowStyle}>
                  <td style={tdStyle}>
                    <input
                      id={`title-${index}`}
                      name={`title-${index}`}
                      value={row.title}
                      disabled={!isEditing}
                      onChange={(e) => handleChange(index, 'title', e.target.value)}
                      style={inputStyle(isEditing)}
                    />
                  </td>

                  <td style={tdStyle}>
                    <textarea
                      id={`overview-${index}`}
                      name={`overview-${index}`}
                      value={row.overview}
                      disabled={!isEditing}
                      onChange={(e) => handleChange(index, 'overview', e.target.value)}
                      style={textareaRowStyle(isEditing)}
                    />
                  </td>

                  <td style={tdStyle}>
                    <input
                      id={`url-${index}`}
                      name={`url-${index}`}
                      value={row.url}
                      disabled={!isEditing || row.urlFixed}
                      onChange={(e) => handleChange(index, 'url', e.target.value)}
                      style={inputStyle(isEditing && !row.urlFixed)}
                    />

                    {isEditing && (
                      <div style={{ marginTop: '6px' }}>
                        {!row.urlFixed ? (
                          <button onClick={() => fixUrl(index)} style={btnFix}>Fix</button>
                        ) : (
                          <button onClick={() => removeFix(index)} style={btnGrey}>Remove</button>
                        )}
                      </div>
                    )}
                  </td>

                  {isEditing && (
                    <td style={tdStyle}>
                      <button onClick={() => deleteRow(index)} style={btnRemove}>Delete</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {isEditing && (
            <button 
              onClick={addRow} 
              style={{
                ...btnBlue,
                marginTop: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Plus size={16} />
              Add Row
            </button>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

/* ================= STYLES ================= */

const pageStyle = {
  padding: '20px',
  background: '#f4f7ff',
  minHeight: '100vh',
  color: '#000'
};

const pageTitle = {
  fontSize: '32px',
  fontWeight: '700',
  color: '#000'
};

const boxStyle = {
  background: '#fff',
  borderRadius: '14px',
  padding: '20px',
  marginBottom: '30px',
  boxShadow: '0 6px 14px rgba(0,0,0,0.08)',
  color: '#000'
};

const boxTitle = { marginBottom: '15px', color: '#000' };
const tableContainerStyle = {
  background: '#fff',
  borderRadius: 16,
  overflow: 'hidden',
  boxShadow: '0 8px 24px rgba(71, 85, 105, 0.12)',
  marginBottom: 24,
  border: '1px solid #cfd6df',
  padding: '0 0 16px 0'
};

const eventsTableStyle = {
  width: '100%',
  background: '#ffffff',
  color: '#1f2937',
  borderCollapse: 'collapse',
  fontSize: 14,
  lineHeight: 1.5
};

const headerRowStyle = {
  background: 'linear-gradient(135deg, #eef2f6 0%, #d6dde5 100%)',
  color: '#111827',
  borderBottom: '1px solid #c0c8d2'
};

const headerCellStyle = {
  padding: '16px 20px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.8px'
};

const bodyRowStyle = {
  borderBottom: '1px solid #e5e7eb',
  backgroundColor: '#ffffff'
};

const bodyRowAltStyle = {
  borderBottom: '1px solid #e5e7eb',
  backgroundColor: '#f5f7fa'
};

const tdStyle = {
  padding: '16px 20px',
  verticalAlign: 'top',
  color: '#1f2937',
  borderBottom: '1px solid #e5e7eb',
  fontSize: 14
};

const inputStyle = (enabled) => ({
  width: '100%',
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid #000',
  background: enabled ? '#fff' : '#f1f1f1',
  color: '#000'
});

const textareaRowStyle = (enabled) => ({
  width: '100%',
  height: '160px',
  padding: '10px',
  borderRadius: '6px',
  border: '1px solid #000',
  background: enabled ? '#fff' : '#f1f1f1',
  resize: 'vertical',
  color: '#000'
});

const textareaStyle = {
  width: '100%',
  height: '140px',
  padding: '10px',
  borderRadius: '8px',
  border: '1px solid #000',
  color: '#000'
};

const btnBlue = { padding: '10px 18px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '6px' };
const btnGreen = { padding: '10px 18px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '6px' };
const btnGrey = { padding: '10px 18px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '6px' };
const btnFix = { padding: '6px 12px', background: '#17a2b8', color: '#fff', border: 'none', borderRadius: '5px' };
const btnRemove = { padding: '6px 12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '5px' };

const errorBox = { background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '6px', marginBottom: '10px' };
const successBox = { background: '#d4edda', color: '#155724', padding: '10px', borderRadius: '6px', marginBottom: '10px' };

export default ManageEvents;



