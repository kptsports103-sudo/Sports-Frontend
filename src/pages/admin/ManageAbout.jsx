import { useEffect, useState } from 'react';
import api from '../../services/api';
import activityLogService from '../../services/activityLog.service';
import AdminLayout from './AdminLayout';
import PageLatestChangeCard from '../../components/PageLatestChangeCard';
import { CircleHelp, Pencil, Plus, Save, X } from 'lucide-react';
import { buildBackendUrl } from '../../utils/backendUrl';

const DEFAULT_STATE = {
  bannerImages: [{ image: '', year: '', fixed: false }],
  boxes: ['', '', ''],
  bigHeader: '',
  bigText: ''
};

const ManageAbout = () => {
  const [content, setContent] = useState(DEFAULT_STATE);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/home');
      const normalizedBannerImages = (data.bannerImages || []).map((b) => ({
        image: b.image || '',
        year: b.year || '',
        fixed: true
      }));

      setContent({
        bannerImages: normalizedBannerImages.length
          ? normalizedBannerImages
          : [{ image: '', year: '', fixed: false }],
        boxes: Array.isArray(data.boxes) && data.boxes.length ? data.boxes : ['', '', ''],
        bigHeader: data.bigHeader || '',
        bigText: data.bigText || ''
      });
    } catch (err) {
      console.error('Load failed:', err);
      alert('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const processedBannerImages = content.bannerImages
        .filter((b) => b.fixed && b.image.trim() && b.year)
        .map((b) => ({
          image: b.image.startsWith('http')
            ? b.image
            : b.image.startsWith('/')
              ? buildBackendUrl(b.image)
              : `https://${b.image}`,
          year: parseInt(b.year, 10) || 0
        }));

      const payload = {
        ...content,
        bannerImages: processedBannerImages
      };

      await api.put('/home', payload);
      alert('Content updated successfully');
      setIsEditing(false);
      loadContent();

      activityLogService.logActivity(
        'Updated About Page Content',
        'About Page',
        'Updated banner images, boxes, header and text',
        [
          { field: 'Banner Images', after: String(payload.bannerImages.length) },
          { field: 'Info Boxes', after: String(payload.boxes.filter((b) => String(b || '').trim()).length) },
          { field: 'Main Header', after: String(payload.bigHeader || '-').slice(0, 120) },
          { field: 'Main Text', after: String(payload.bigText || '-').slice(0, 120) }
        ]
      );
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save content');
    } finally {
      setLoading(false);
    }
  };

  const updateBox = (index, value) => {
    const updated = [...content.boxes];
    updated[index] = value;
    setContent({ ...content, boxes: updated });
  };

  const updateBannerImages = (index, field, value) => {
    const bannerImages = [...content.bannerImages];
    bannerImages[index] = { ...bannerImages[index], [field]: value };
    setContent({ ...content, bannerImages });
  };

  const toggleFixedBanner = (index) => {
    const bannerImages = [...content.bannerImages];
    bannerImages[index].fixed = !bannerImages[index].fixed;
    setContent({ ...content, bannerImages });
  };

  const removeBanner = (index) => {
    setContent({
      ...content,
      bannerImages: content.bannerImages.filter((_, i) => i !== index)
    });
  };

  const addBanner = () => {
    setContent({
      ...content,
      bannerImages: [...content.bannerImages, { image: '', year: '', fixed: false }]
    });
  };

  const handleEditToggle = () => {
    if (isEditing) {
      setIsEditing(false);
      loadContent();
      return;
    }

    setIsEditing(true);
  };

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="admin-page__shell">
          <PageLatestChangeCard pageName="About Page" />

          <header className="admin-page__header">
            <div className="admin-page__title-wrap">
              <span className="admin-page__eyebrow">Content Management</span>
              <h2 className="admin-page__title">
                <CircleHelp size={30} color="#0b3ea8" />
                Update About
              </h2>
              <p className="admin-page__subtitle">Manage about page content with the same admin styling system.</p>
            </div>

            <div className="admin-page__toolbar">
              <button
                type="button"
                onClick={handleEditToggle}
                className={`admin-btn ${isEditing ? 'admin-btn--muted' : 'admin-btn--primary'}`}
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
            </div>
          </header>

          {!isEditing ? (
            <div className="admin-page__section">
              <h4 style={{ marginTop: 0, marginBottom: 10 }}>Banner Images</h4>
              {content.bannerImages.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  {b.image && (
                    <img
                      src={b.image}
                      alt={`Banner ${i + 1}`}
                      style={{ width: '50px', height: '30px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                  )}
                  <span>{b.year}</span>
                </div>
              ))}

              <div style={{ marginTop: '18px' }}>
                <h4 style={{ marginBottom: 10 }}>Box Content</h4>
                {content.boxes.map((box, i) => (
                  <div key={i} style={{ padding: '10px 12px', marginBottom: '8px', background: '#ffffff', border: '1px solid #dbe2ea', borderRadius: '10px' }}>
                    {box || `Box ${i + 1} is empty`}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '18px' }}>
                <h4 style={{ marginBottom: 10 }}>{content.bigHeader || 'Our Story'}</h4>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#1f2937' }}>
                  {content.bigText || 'No story content added yet.'}
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="admin-page__section">
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ marginBottom: '10px' }}>Banner Images</h4>
                {content.bannerImages.map((b, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                    <input
                      id={`banner-image-${i}`}
                      name={`banner-image-${i}`}
                      value={b.image}
                      disabled={b.fixed}
                      placeholder="Image URL"
                      onChange={(e) => updateBannerImages(i, 'image', e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #c8d3df', borderRadius: '10px' }}
                    />

                    <input
                      id={`banner-year-${i}`}
                      name={`banner-year-${i}`}
                      value={b.year}
                      disabled={b.fixed}
                      placeholder="Year"
                      onChange={(e) => updateBannerImages(i, 'year', e.target.value)}
                      style={{ padding: '10px 12px', border: '1px solid #c8d3df', borderRadius: '10px' }}
                    />

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => toggleFixedBanner(i)} className="admin-btn admin-btn--secondary">
                        {b.fixed ? 'Fixed' : 'Fix'}
                      </button>
                      {!b.fixed && (
                        <button type="button" onClick={() => removeBanner(i)} className="admin-btn admin-btn--danger">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: '15px', padding: '18px', background: '#edf3fb', borderRadius: '16px', border: '1px dashed #0b3ea8' }}>
                  <button
                    type="button"
                    onClick={addBanner}
                    className="admin-btn admin-btn--primary"
                  >
                    <Plus size={16} />
                    Add Banner
                  </button>
                  <p style={{ margin: '10px 0 0', color: '#526173', fontSize: '14px' }}>
                    Click to add a new banner image
                  </p>
                </div>
              </div>

              {content.boxes.map((box, i) => (
                <div key={i} style={{ marginBottom: '15px' }}>
                  <label htmlFor={`box-${i}`}>Box {i + 1}</label>
                  <input
                    id={`box-${i}`}
                    name={`box-${i}`}
                    value={box}
                    onChange={(e) => updateBox(i, e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #c8d3df', borderRadius: '10px', marginTop: '6px' }}
                  />
                </div>
              ))}

              <input
                id="big-header"
                name="big-header"
                value={content.bigHeader}
                onChange={(e) => setContent({ ...content, bigHeader: e.target.value })}
                placeholder="Our Story Heading"
                style={{ width: '100%', padding: '10px 12px', marginBottom: '10px', border: '1px solid #c8d3df', borderRadius: '10px' }}
              />

              <textarea
                id="big-text"
                name="bigText"
                value={content.bigText}
                onChange={(e) => setContent({ ...content, bigText: e.target.value })}
                placeholder="Our Story text"
                style={{ width: '100%', height: '150px', padding: '10px 12px', border: '1px solid #c8d3df', borderRadius: '10px' }}
              />

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="admin-btn admin-btn--primary"
                >
                  {loading ? (
                    'Saving...'
                  ) : (
                    <>
                      <Save size={18} />
                      Save
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default ManageAbout;
