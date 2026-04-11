import { useEffect, useState } from 'react';
import api from '../../services/api';
import activityLogService from '../../services/activityLog.service';
import AdminLayout from './AdminLayout';
import { confirmAction } from '../../utils/notify';
import PageLatestChangeCard from '../../components/PageLatestChangeCard';
import { Image as ImageIcon, Pencil, Trash2, Plus, Save, X } from 'lucide-react';

const ManageGallery = () => {
  const [galleries, setGalleries] = useState([]);
  const [form, setForm] = useState({
    title: '',
    visibility: true,
    images: [{ url: '', overview: '', fixed: false }]
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [previewGallery, setPreviewGallery] = useState(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const tableStyles = {
    tableContainer: {
      background: '#fff',
      borderRadius: 16,
      overflowX: 'auto',
      boxShadow: '0 8px 24px rgba(71, 85, 105, 0.12)',
      marginBottom: 24,
      border: '1px solid #cfd6df'
    },
    table: {
      width: '100%',
      background: '#ffffff',
      color: '#1f2937',
      borderCollapse: 'collapse',
      fontSize: 14,
      lineHeight: 1.5
    },
    headerRow: {
      background: 'linear-gradient(135deg, #eef2f6 0%, #d6dde5 100%)',
      color: '#111827',
      borderBottom: '1px solid #c0c8d2'
    },
    headerCell: {
      padding: '15px',
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: '0.8px',
      fontWeight: 600
    },
    row: {
      borderBottom: '1px solid #e5e7eb',
      backgroundColor: '#ffffff'
    },
    rowAlt: {
      borderBottom: '1px solid #e5e7eb',
      backgroundColor: '#f5f7fa'
    },
    cell: {
      padding: '15px',
      fontSize: 14,
      color: '#1f2937'
    },
    editBox: {
      background: '#f5f7fa',
      padding: '10px',
      borderRadius: '6px',
      border: '1px solid #dbe2ea'
    },
  };

  /* ================= FETCH ================= */
  useEffect(() => {
    fetchGalleries();
  }, []);

  const fetchGalleries = async () => {
    try {
      const res = await api.get('/galleries');
      setGalleries(res.data || []);
    } catch (error) {
      console.error('Error fetching galleries:', error);
      alert('Failed to load galleries.');
    }
  };

  /* ================= HELPERS ================= */
  const resetForm = () => {
    setForm({
      title: '',
      visibility: true,
      images: [{ url: '', overview: '', fixed: false }]
    });
    setEditingId(null);
    setIsEditing(false);
  };

  const handleEdit = (gallery) => {
    setForm({
      title: gallery.title,
      visibility: gallery.visibility,
      images: gallery.media?.length
        ? gallery.media.map(item => ({
            url: item.url || item,
            overview: item.overview || '',
            fixed: true
          }))
        : [{ url: '', overview: '', fixed: false }]
    });
    setEditingId(gallery._id);
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    const shouldDelete = await confirmAction('Delete this gallery?');
    if (!shouldDelete) return;

    try {
      await api.delete(`/galleries/${id}`);
      fetchGalleries();
    } catch (error) {
      console.error('Error deleting gallery:', error);
      alert('Failed to delete gallery.');
    }
  };

  const getGalleryImages = (gallery) => {
    if (!gallery?.media?.length) return [];
    return gallery.media
      .map((item) => (typeof item === 'string'
        ? { url: item, overview: '' }
        : { url: item.url || '', overview: item.overview || '' }))
      .filter((item) => item.url.trim());
  };

  const openImagePreview = (gallery) => {
    const images = getGalleryImages(gallery);
    if (!images.length) return;
    setPreviewGallery(gallery);
    setPreviewIndex(0);
  };

  const closeImagePreview = () => {
    setPreviewGallery(null);
    setPreviewIndex(0);
  };

  const updateRow = (index, field, value) => {
    const images = [...form.images];
    images[index][field] = value;
    setForm({ ...form, images });
  };

  const toggleFix = (index) => {
    const images = [...form.images];
    images[index].fixed = !images[index].fixed;
    setForm({ ...form, images });
  };

  const addRow = () => {
    setForm({
      ...form,
      images: [...form.images, { url: '', overview: '', fixed: false }]
    });
  };

  const removeRow = (index) => {
    setForm({
      ...form,
      images: form.images.filter((_, i) => i !== index)
    });
  };

  /* ================= SAVE ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      title: form.title,
      visibility: form.visibility,
      media: form.images
        .filter(img => img.url.trim())
        .map(img => ({
          url: img.url,
          overview: img.overview
        }))
    };

    try {
      editingId
        ? await api.put(`/galleries/${editingId}`, payload)
        : await api.post('/galleries', payload);

      resetForm();
      fetchGalleries();
      
      // Log the activity
      activityLogService.logActivity(
        'Updated Gallery',
        'Gallery Page',
        editingId ? `Updated gallery: ${form.title}` : `Created new gallery: ${form.title}`,
        [
          { field: 'Gallery Title', after: form.title || '-' },
          { field: 'Visibility', after: form.visibility || '-' },
          { field: 'Media Items', after: String(payload.media.length) },
          { field: 'Operation', after: editingId ? 'Update' : 'Create' }
        ]
      );
    } catch (error) {
      console.error('Error saving gallery:', error);
      alert('Failed to save gallery. Please try again.');
    }
  };

  /* ================= UI ================= */
  const previewImages = getGalleryImages(previewGallery);
  const previewItem = previewImages[previewIndex] || null;
  const canGoPrev = previewIndex > 0;
  const canGoNext = previewIndex < previewImages.length - 1;

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="admin-page__shell">
          <PageLatestChangeCard pageName="Gallery Page" />

          <header className="admin-page__header">
            <div className="admin-page__title-wrap">
              <span className="admin-page__eyebrow">Content Management</span>
              <h3 className="admin-page__title">
                <ImageIcon size={30} color="#0b3ea8" />
                Update Gallery
              </h3>
              <p className="admin-page__subtitle">Manage gallery page content with the same history-page color system.</p>
            </div>

            <div className="admin-page__toolbar">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="admin-btn admin-btn--primary"
                >
                  <Pencil size={16} />
                  Edit
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resetForm}
                  className="admin-btn admin-btn--muted"
                >
                  <X size={16} />
                  Cancel
                </button>
              )}
            </div>
          </header>

          {/* ================= VIEW MODE ================= */}
          {!isEditing ? (
            <div className="admin-page__section">
              <div style={tableStyles.tableContainer}>
                <table style={tableStyles.table}>
                  <thead>
                    <tr style={tableStyles.headerRow}>
                      <th style={{ ...tableStyles.headerCell, textAlign: 'left' }}>Title</th>
                      <th style={{ ...tableStyles.headerCell, textAlign: 'center' }}>Images</th>
                      <th style={{ ...tableStyles.headerCell, textAlign: 'center' }}>Visible</th>
                      <th style={{ ...tableStyles.headerCell, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {galleries.map((g, i) => (
                      <tr key={g._id} style={i % 2 ? tableStyles.rowAlt : tableStyles.row}>
                        <td style={{ ...tableStyles.cell, fontWeight: 600 }}>{g.title}</td>
                        <td style={{ ...tableStyles.cell, textAlign: 'center' }}>{g.media?.length || 0}</td>
                        <td style={{ ...tableStyles.cell, textAlign: 'center' }}>{g.visibility ? 'Yes' : 'No'}</td>
                        <td style={{ ...tableStyles.cell, textAlign: 'right' }}>
                          <button
                            style={{ background: 'none', border: 'none', fontSize: 14, marginRight: '10px', cursor: 'pointer' }}
                            onClick={() => openImagePreview(g)}
                            disabled={!getGalleryImages(g).length}
                          >
                            View Images
                          </button>
                          <button
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', verticalAlign: 'middle' }}
                            onClick={() => handleEdit(g)}
                            title="Edit"
                            aria-label="Edit"
                          >
                            <Pencil size={20} color="#1f2937" />
                          </button>
                          <button
                            style={{ background: 'none', border: 'none', padding: 0, marginLeft: '10px', cursor: 'pointer', verticalAlign: 'middle' }}
                            onClick={() => handleDelete(g._id)}
                            title="Delete"
                            aria-label="Delete"
                          >
                            <Trash2 size={20} color="#dc2626" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ================= EDIT MODE ================= */
            <form onSubmit={handleSubmit} className="admin-page__section">
              <div style={tableStyles.tableContainer}>
                <table style={tableStyles.table}>
                  <tbody>
                    <tr style={tableStyles.headerRow}>
                      <th style={{ ...tableStyles.headerCell, width: '25%', textAlign: 'left' }}>Field</th>
                      <th style={{ ...tableStyles.headerCell, textAlign: 'left' }}>Value</th>
                    </tr>

                    <tr style={tableStyles.row}>
                      <td style={{ ...tableStyles.cell, fontWeight: 600 }}>Title</td>
                      <td style={tableStyles.cell}>
                        <input
                          id="gallery-title"
                          name="title"
                          value={form.title}
                          onChange={e => setForm({ ...form, title: e.target.value })}
                          style={{ width: '100%', padding: '10px 12px', border: '1px solid #c8d3df', color: '#000', fontSize: 14, borderRadius: 10 }}
                          required
                        />
                      </td>
                    </tr>

                <tr style={tableStyles.rowAlt}>
                  <td style={{ ...tableStyles.cell, fontWeight: 600 }}>Images & Overview</td>
                  <td style={tableStyles.cell}>
                    {form.images.map((img, i) => (
                      <div
                        key={i}
                        style={{
                          ...tableStyles.editBox,
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr auto auto',
                          gap: '10px',
                          marginBottom: '10px'
                        }}
                      >
                        <input
                          id={`gallery-image-url-${i}`}
                          name={`imageUrl-${i}`}
                          placeholder="Image URL"
                          value={img.url}
                          disabled={img.fixed}
                          onChange={e => updateRow(i, 'url', e.target.value)}
                          style={{ padding: '8px', border: '1px solid #ccc', background: img.fixed ? '#e9ecef' : '#fff', fontSize: 14 }}
                        />

                        <input
                          id={`gallery-image-overview-${i}`}
                          name={`imageOverview-${i}`}
                          placeholder="Overview"
                          value={img.overview}
                          disabled={img.fixed}
                          onChange={e => updateRow(i, 'overview', e.target.value)}
                          style={{ padding: '8px', border: '1px solid #ccc', background: img.fixed ? '#e9ecef' : '#fff', fontSize: 14 }}
                        />

                        <button
                          type="button"
                          onClick={() => toggleFix(i)}
                          style={{ padding: '6px 12px', border: '1px solid #adb5bd', background: '#dee2e6', fontSize: 14 }}
                        >
                          {img.fixed ? 'Fixed' : 'Fix'}
                        </button>

                        {!img.fixed && (
                          <button
                            type="button"
                            onClick={() => removeRow(i)}
                            style={{ padding: '6px 12px', border: '1px solid #adb5bd', background: '#dee2e6', fontSize: 14 }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addRow}
                      style={{
                        padding: '8px 14px',
                        border: '1px solid #adb5bd',
                        background: '#dee2e6',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: 14
                      }}
                    >
                      <Plus size={16} />
                      Add Row
                    </button>
                  </td>
                </tr>

                <tr style={tableStyles.row}>
                  <td style={{ ...tableStyles.cell, fontWeight: 600 }}>Visible</td>
                  <td style={tableStyles.cell}>
                    <input
                      id="gallery-visibility"
                      name="visibility"
                      type="checkbox"
                      checked={form.visibility}
                      onChange={e => setForm({ ...form, visibility: e.target.checked })}
                    />
                  </td>
                </tr>
              </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="submit"
                  className="admin-btn admin-btn--primary"
                >
                  <Save size={18} />
                  Save Gallery
                </button>
              </div>
            </form>
          )}

          {previewGallery && previewItem && (
            <div
              role="dialog"
              aria-modal="true"
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.65)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                zIndex: 2000
              }}
              onClick={closeImagePreview}
            >
              <div
                style={{
                  width: 'min(900px, 100%)',
                  background: '#ffffff',
                  borderRadius: 14,
                  border: '1px solid #cfd6df',
                  boxShadow: '0 20px 40px rgba(15, 23, 42, 0.25)',
                  overflow: 'hidden'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                    {previewGallery.title}
                  </div>
                  <button
                    type="button"
                    onClick={closeImagePreview}
                    style={{ border: '1px solid #cbd5e1', background: '#f8fafc', padding: '6px 10px', fontSize: 13 }}
                  >
                    Close
                  </button>
                </div>

                <div style={{ padding: '16px' }}>
                  <div style={{ fontSize: 13, color: '#475569', marginBottom: 10 }}>
                    Image {previewIndex + 1} of {previewImages.length}
                  </div>
                  <img
                    src={previewItem.url}
                    alt={`Gallery ${previewIndex + 1}`}
                    style={{ width: '100%', maxHeight: '520px', objectFit: 'contain', background: '#f8fafc', border: '1px solid #e2e8f0' }}
                  />
                  {previewItem.overview && (
                    <div style={{ marginTop: '10px', fontSize: 14, color: '#334155' }}>
                      {previewItem.overview}
                    </div>
                  )}
                </div>

                <div style={{ padding: '0 16px 16px', display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                  <button
                    type="button"
                    onClick={() => canGoPrev && setPreviewIndex((idx) => idx - 1)}
                    disabled={!canGoPrev}
                    style={{ padding: '8px 12px', border: '1px solid #cbd5e1', background: canGoPrev ? '#eef2f6' : '#f8fafc', fontSize: 14 }}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => canGoNext && setPreviewIndex((idx) => idx + 1)}
                    disabled={!canGoNext}
                    style={{ padding: '8px 12px', border: '1px solid #cbd5e1', background: canGoNext ? '#eef2f6' : '#f8fafc', fontSize: 14 }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default ManageGallery;



