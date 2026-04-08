import { useEffect, useId, useState } from 'react';
import api from '../../services/api';
import activityLogService from '../../services/activityLog.service';
import AdminLayout from './AdminLayout';
import PageLatestChangeCard from '../../components/PageLatestChangeCard';
import { emitPageUpdate } from '../../utils/eventBus';
import './ManageHome.css';

const createEmptyContent = () => ({
  heroTitle: '',
  heroSubtitle: '',
  heroButtons: [],
  banners: [],
  achievements: [],
  achievementSettings: {
    sportsMeetsConducted: '',
    yearsOfExcellence: ''
  },
  achievementDisplayYear: '',
  achievementDataStatus: null,
  sportsCategories: [],
  gallery: [],
  upcomingEvents: [],
  clubs: [],
  announcements: []
});

const ManagedInput = ({ id, name, placeholder, ...props }) => {
  const autoId = useId().replace(/:/g, '');
  const normalizedBase = (name || id || placeholder || 'field')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const fieldName = name || `${normalizedBase}-${autoId}`;
  const fieldId = id || fieldName;

  return <input id={fieldId} name={fieldName} placeholder={placeholder} {...props} />;
};

const cleanLeadingIconText = (text) => {
  const value = String(text || '');
  return value.replace(/^[^A-Za-z0-9]+/, '').trim();
};

const defaultAchievementSettings = () => ({
  sportsMeetsConducted: '',
  yearsOfExcellence: ''
});

const ManageHome = () => {
  const [content, setContent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [toastTitle, setToastTitle] = useState('KPT Sports CMS');
  const [toastMessage, setToastMessage] = useState('Home page content has been updated successfully. All changes are now live on the website.');
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const res = await api.get('/home');
      if (!res.data || Object.keys(res.data).length === 0) {
        setContent(createEmptyContent());
        return;
      }
      setContent({
        heroTitle: res.data.heroTitle ?? '',
        heroSubtitle: res.data.heroSubtitle ?? '',
        heroButtons: Array.isArray(res.data.heroButtons) ? res.data.heroButtons : [],
        banners: Array.isArray(res.data.banners) ? res.data.banners : [],
        achievements: Array.isArray(res.data.achievements) ? res.data.achievements : [],
        achievementSettings: {
          ...defaultAchievementSettings(),
          ...(res.data.achievementSettings || {})
        },
        achievementDisplayYear: String(res.data.achievementDisplayYear || ''),
        achievementDataStatus: res.data.achievementDataStatus || null,
        sportsCategories: Array.isArray(res.data.sportsCategories) ? res.data.sportsCategories : [],
        gallery: Array.isArray(res.data.gallery) ? res.data.gallery : [],
        upcomingEvents: Array.isArray(res.data.upcomingEvents) ? res.data.upcomingEvents : [],
        clubs: Array.isArray(res.data.clubs) ? res.data.clubs : [],
        announcements: Array.isArray(res.data.announcements) ? res.data.announcements : []
      });
    } catch (error) {
      console.error('ManageHome - Failed to load home content:', error);
      setContent(createEmptyContent());
    }
  };

  const updateField = (section, index, field, value) => {
    setContent((prev) => ({
      ...prev,
      [section]: prev[section].map((item, i) => (
        i === index ? { ...item, [field]: value } : item
      ))
    }));
  };

  const updateRootField = (field, value) => {
    setContent((prev) => ({ ...prev, [field]: value }));
  };

  const updateAchievementSetting = (field, value) => {
    setContent((prev) => ({
      ...prev,
      achievementSettings: {
        ...defaultAchievementSettings(),
        ...(prev.achievementSettings || {}),
        [field]: value
      },
      achievements: Array.isArray(prev.achievements)
        ? prev.achievements.map((item) => (
            item.key === field ? { ...item, value } : item
          ))
        : prev.achievements
    }));
  };

  const addItem = (section, template) => {
    setContent((prev) => ({ ...prev, [section]: [...prev[section], template] }));
  };

  const removeItem = (section, index) => {
    setContent((prev) => ({ ...prev, [section]: prev[section].filter((_, i) => i !== index) }));
  };

  const openToast = (title, message) => {
    setToastTitle(title);
    setToastMessage(message);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content) return;
    setIsSaving(true);

    try {
      const payload = {
        heroTitle: content.heroTitle.trim(),
        heroSubtitle: content.heroSubtitle.trim(),
        heroButtons: content.heroButtons
          .filter((x) => x.text.trim() && x.link.trim())
          .map((x) => ({ text: x.text.trim(), link: x.link.trim() })),
        banners: content.banners
          .filter((x) => x.image.trim())
          .map((x) => ({ image: x.image.trim(), year: x.year.trim() })),
        achievementSettings: {
          sportsMeetsConducted: String(content.achievementSettings?.sportsMeetsConducted || '').trim(),
          yearsOfExcellence: String(content.achievementSettings?.yearsOfExcellence || '').trim()
        },
        sportsCategories: content.sportsCategories
          .filter((x) => x.name.trim() && x.image.trim())
          .map((x) => ({ name: x.name.trim(), image: x.image.trim() })),
        gallery: content.gallery
          .filter((x) => x.image.trim())
          .map((x) => ({ image: x.image.trim(), caption: x.caption.trim() })),
        upcomingEvents: content.upcomingEvents
          .filter((x) => x.name.trim())
          .map((x) => ({
            name: x.name.trim(),
            date: x.date.trim(),
            venue: x.venue.trim(),
            image: x.image.trim()
          })),
        clubs: content.clubs
          .filter((x) => x.name.trim() && x.url.trim())
          .map((x) => ({
            name: x.name.trim(),
            url: x.url.trim(),
            description: x.description.trim(),
            image: x.image.trim(),
            theme: x.theme.trim() || 'blue'
          })),
        announcements: content.announcements.map((x) => x.trim()).filter(Boolean)
      };

      await api.put('/home', payload);
      openToast('KPT Sports CMS', 'Home page content has been updated successfully. All changes are now live on the website.');
      setIsEditing(false);

      activityLogService.logActivity(
        'Home Page Updated',
        'Home Page',
        'Content was successfully modified',
        [
          { field: 'Hero Title', after: payload.heroTitle || '-' },
          { field: 'Hero Subtitle', after: payload.heroSubtitle || '-' },
          { field: 'Hero Buttons', after: String(payload.heroButtons.length) },
          { field: 'Banners', after: String(payload.banners.length) },
          { field: 'Sports Meets Conducted', after: payload.achievementSettings.sportsMeetsConducted || '0' },
          { field: 'Years of Excellence', after: payload.achievementSettings.yearsOfExcellence || '0' },
          { field: 'Sports Categories', after: String(payload.sportsCategories.length) },
          { field: 'Gallery Items', after: String(payload.gallery.length) },
          { field: 'Upcoming Events', after: String(payload.upcomingEvents.length) },
          { field: 'Latest Announcements', after: String(payload.announcements.length) }
        ]
      );
      emitPageUpdate('Home Page');
      // Backward-compatible event for older listeners.
      window.dispatchEvent(new CustomEvent('HOME_UPDATED', { detail: { pageName: 'Home Page', time: Date.now() } }));

      await fetchContent();
    } catch (error) {
      console.error('ManageHome - Save error:', error);
      alert('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  if (!content) {
    return (
      <AdminLayout>
        <div className="manage-home">Loading...</div>
      </AdminLayout>
    );
  }

  const getAchievementCard = (key) =>
    content.achievements.find((item) => item.key === key) || null;

  const sportsMeetsConductedValue =
    getAchievementCard('sportsMeetsConducted')?.value ||
    content.achievementSettings?.sportsMeetsConducted ||
    '0';

  const yearsOfExcellenceValue =
    getAchievementCard('yearsOfExcellence')?.value ||
    content.achievementSettings?.yearsOfExcellence ||
    '12';

  const autoAchievementYearLabel = content.achievementDisplayYear
    ? `Automatic data year: ${content.achievementDisplayYear}`
    : 'Automatic data year: not available';

  return (
    <AdminLayout>
      <div className="manage-home">
        <div className="manage-header">
          <div>
            <h1>Home Page CMS Manager</h1>
            <p>Manage all Home page sections from one control panel</p>
          </div>

          {!isEditing ? (
            <button className="primary-btn" onClick={() => setIsEditing(true)}>
              Edit Content
            </button>
          ) : (
            <button className="secondary-btn" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          )}
        </div>

        <PageLatestChangeCard pageName="Home Page" />

        {!isEditing ? (
          <>
            <div className="view-toggle">
              <button 
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} 
                onClick={() => setViewMode('grid')}
              >
                Grid View
              </button>
              <button 
                className={`view-btn ${viewMode === 'table' ? 'active' : ''}`} 
                onClick={() => setViewMode('table')}
              >
                Table View
              </button>
            </div>
            
            {viewMode === 'table' ? (
              <div className="sections-table-wrapper">
                <table className="sections-table">
                  <thead>
                    <tr>
                      <th>Section</th>
                      <th>Items</th>
                      <th>Status</th>
                      <th>Link to Home</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Hero Section</strong></td>
                      <td>{content.heroButtons.length} buttons</td>
                      <td><span className="status-badge active">Active</span></td>
                      <td><a href="/#hero" className="table-link" target="_self">View on Home</a></td>
                    </tr>
                    <tr>
                      <td><strong>Achievements</strong></td>
                      <td>{content.achievements.length} items</td>
                      <td><span className={`status-badge ${content.achievements.length > 0 ? 'active' : 'inactive'}`}>
                        {content.achievements.length > 0 ? 'Active' : 'Empty'}
                      </span></td>
                      <td><a href="/#hero" className="table-link" target="_self">View on Home</a></td>
                    </tr>
                    <tr>
                      <td><strong>Latest Announcements</strong></td>
                      <td>{content.announcements.length} items</td>
                      <td><span className={`status-badge ${content.announcements.length > 0 ? 'active' : 'inactive'}`}>
                        {content.announcements.length > 0 ? 'Active' : 'Empty'}
                      </span></td>
                      <td><a href="/#announcements" className="table-link" target="_self">View on Home</a></td>
                    </tr>
                    <tr>
                      <td><strong>Sports Categories</strong></td>
                      <td>{content.sportsCategories.length} categories</td>
                      <td><span className={`status-badge ${content.sportsCategories.length > 0 ? 'active' : 'inactive'}`}>
                        {content.sportsCategories.length > 0 ? 'Active' : 'Empty'}
                      </span></td>
                      <td><a href="/#sports-categories" className="table-link" target="_self">View on Home</a></td>
                    </tr>
                    <tr>
                      <td><strong>Gallery</strong></td>
                      <td>{content.gallery.length} images</td>
                      <td><span className={`status-badge ${content.gallery.length > 0 ? 'active' : 'inactive'}`}>
                        {content.gallery.length > 0 ? 'Active' : 'Empty'}
                      </span></td>
                      <td><a href="/#gallery" className="table-link" target="_self">View on Home</a></td>
                    </tr>
                    <tr>
                      <td><strong>Upcoming Events</strong></td>
                      <td>{content.upcomingEvents.length} events</td>
                      <td><span className={`status-badge ${content.upcomingEvents.length > 0 ? 'active' : 'inactive'}`}>
                        {content.upcomingEvents.length > 0 ? 'Active' : 'Empty'}
                      </span></td>
                      <td><a href="/#events" className="table-link" target="_self">View on Home</a></td>
                    </tr>
                    <tr>
                      <td><strong>Banners</strong></td>
                      <td>{content.banners.length} banners</td>
                      <td><span className={`status-badge ${content.banners.length > 0 ? 'active' : 'inactive'}`}>
                        {content.banners.length > 0 ? 'Active' : 'Empty'}
                      </span></td>
                      <td><a href="/#hero" className="table-link" target="_self">View on Home</a></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="preview-grid">
            <section className="admin-card">
              <h3>Hero Section</h3>
              <p><strong>Title:</strong> {content.heroTitle}</p>
              <p><strong>Subtitle:</strong> {content.heroSubtitle}</p>
                <div className="chips">
                  {content.heroButtons.map((button, i) => (
                    <span key={`${button.text}-${i}`} className="chip">{button.text}{' -> '}{button.link}</span>
                  ))}
                </div>
              </section>

            <section className="admin-card">
              <h3>Banners</h3>
              <div className="banner-preview">
                {content.banners.map((b, i) => (
                  <article key={i} className="banner-item">
                    {b.image ? <img src={b.image} alt={`Banner ${i + 1}`} /> : <div className="banner-placeholder">No image</div>}
                    <span>{b.year || 'Year not set'}</span>
                  </article>
                ))}
              </div>
            </section>

            <section className="admin-card">
              <h3>Achievements</h3>
              <div className="simple-grid">
                {content.achievements.map((x, i) => (
                  <div key={i} className="mini-card">
                    <strong>{x.value}</strong>
                    <p>{cleanLeadingIconText(x.title)}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="admin-card">
              <h3>Sports Categories</h3>
              <div className="simple-grid">
                {content.sportsCategories.map((x, i) => (
                  <div key={i} className="mini-card">
                    <strong>{x.name}</strong>
                    <p>{x.image}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="admin-card">
              <h3>Gallery</h3>
              <div className="simple-grid">
                {content.gallery.map((x, i) => (
                  <div key={i} className="mini-card">
                    <strong>{x.caption || 'No caption'}</strong>
                    <p>{x.image}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="admin-card">
              <h3>Upcoming Events</h3>
              <div className="simple-grid">
                {content.upcomingEvents.map((x, i) => (
                  <div key={i} className="mini-card">
                    <strong>{x.name}</strong>
                    <p>{x.date}</p>
                    <p>{x.venue}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="admin-card">
              <h3>Latest Announcements</h3>
              <div className="simple-grid">
                {content.announcements.map((x, i) => (
                  <div key={i} className="mini-card">
                    <strong>Announcement {i + 1}</strong>
                    <p>{x}</p>
                  </div>
                ))}
              </div>
            </section>

            </div>
            )}
          </>
        ) : (
          <div className="cms-layout">
            <div className="cms-editor">
              <form className="admin-form" onSubmit={handleSubmit}>
                <section className="admin-card">
                  <h3>Hero Section</h3>
                  <div className="form-row single-row">
                    <ManagedInput
                      placeholder="Hero Title"
                      value={content.heroTitle}
                      onChange={(e) => updateRootField('heroTitle', e.target.value)}
                    />
                  </div>
                  <div className="form-row single-row">
                    <ManagedInput
                      placeholder="Hero Subtitle"
                      value={content.heroSubtitle}
                      onChange={(e) => updateRootField('heroSubtitle', e.target.value)}
                    />
                  </div>
                  {content.heroButtons.map((button, i) => (
                    <div key={i} className="form-row hero-button-row">
                      <ManagedInput
                        placeholder="Button Text"
                        value={button.text}
                        onChange={(e) => updateField('heroButtons', i, 'text', e.target.value)}
                      />
                      <ManagedInput
                        placeholder="Button Link"
                        value={button.link}
                        onChange={(e) => updateField('heroButtons', i, 'link', e.target.value)}
                      />
                      <button type="button" className="danger-btn" onClick={() => removeItem('heroButtons', i)}>
                        Remove
                      </button>
                    </div>
                  ))}
                  <button type="button" className="add-btn" onClick={() => addItem('heroButtons', { text: '', link: '' })}>
                    Add Hero Button
                  </button>
                </section>

                <section className="admin-card">
                  <h3>Banner Images</h3>
                  {content.banners.map((b, i) => (
                    <div key={i} className="form-row banner-row">
                      <ManagedInput
                        placeholder="Image URL"
                        value={b.image}
                        onChange={(e) => updateField('banners', i, 'image', e.target.value)}
                      />
                      <ManagedInput
                        placeholder="Year"
                        value={b.year}
                        onChange={(e) => updateField('banners', i, 'year', e.target.value)}
                      />
                      <button type="button" className="danger-btn" onClick={() => removeItem('banners', i)}>
                        Remove
                      </button>
                    </div>
                  ))}
                  <button type="button" className="add-btn" onClick={() => addItem('banners', { image: '', year: '' })}>
                    Add Banner
                  </button>
                </section>

                <section className="admin-card">
                  <h3>Achievements</h3>
                  <p style={{ marginTop: 0, color: '#51627d' }}>
                    `Total Prizes Won`, `Active Players`, `Sports Meets Conducted`, and `Years of Excellence` are
                    filled automatically from backend data.
                    `Sports Meets Conducted` uses the last serial number from `Manage History`, and `Years of
                    Excellence` is `12` when Sports Meets Conducted is `45`, then `46 becomes 13`, `47 becomes 14`,
                    and so on.
                  </p>
                  <p style={{ marginTop: '-4px', color: '#0f3b82', fontWeight: 600 }}>
                    {autoAchievementYearLabel}
                    {content.achievementDataStatus?.usingFallbackYear ? ' (latest entered year fallback)' : ''}
                  </p>
                  <div className="simple-grid">
                    <div className="mini-card">
                      <strong>{getAchievementCard('totalPrizesWon')?.value || '0'}</strong>
                      <p>Total Prizes Won</p>
                    </div>
                    <div className="mini-card">
                      <strong>{getAchievementCard('activePlayers')?.value || '0'}</strong>
                      <p>Active Players</p>
                    </div>
                  </div>
                  <div className="form-row two-col-row">
                    <ManagedInput
                      placeholder="Sports Meets Conducted (Auto)"
                      value={sportsMeetsConductedValue}
                      readOnly
                      className="readonly-input"
                    />
                    <ManagedInput
                      placeholder="Years of Excellence (Auto)"
                      value={yearsOfExcellenceValue}
                      readOnly
                      className="readonly-input"
                    />
                  </div>
                </section>

                <section className="admin-card">
                  <h3>Sports Categories</h3>
                  {content.sportsCategories.map((x, i) => (
                    <div key={i} className="form-row two-col-row">
                      <ManagedInput
                        placeholder="Category Name"
                        value={x.name}
                        onChange={(e) => updateField('sportsCategories', i, 'name', e.target.value)}
                      />
                      <ManagedInput
                        placeholder="Image URL"
                        value={x.image}
                        onChange={(e) => updateField('sportsCategories', i, 'image', e.target.value)}
                      />
                      <button type="button" className="danger-btn" onClick={() => removeItem('sportsCategories', i)}>
                        Remove
                      </button>
                    </div>
                  ))}
                  <button type="button" className="add-btn" onClick={() => addItem('sportsCategories', { name: '', image: '' })}>
                    Add Category
                  </button>
                </section>

                <section className="admin-card">
                  <h3>Gallery Preview</h3>
                  {content.gallery.map((x, i) => (
                    <div key={i} className="form-row two-col-row">
                      <ManagedInput
                        placeholder="Image URL"
                        value={x.image}
                        onChange={(e) => updateField('gallery', i, 'image', e.target.value)}
                      />
                      <ManagedInput
                        placeholder="Caption"
                        value={x.caption}
                        onChange={(e) => updateField('gallery', i, 'caption', e.target.value)}
                      />
                      <button type="button" className="danger-btn" onClick={() => removeItem('gallery', i)}>
                        Remove
                      </button>
                    </div>
                  ))}
                  <button type="button" className="add-btn" onClick={() => addItem('gallery', { image: '', caption: '' })}>
                    Add Gallery Item
                  </button>
                </section>

                <section className="admin-card">
                  <h3>Upcoming Events</h3>
                  {content.upcomingEvents.map((x, i) => (
                    <div key={i} className="form-row event-row">
                      <ManagedInput
                        placeholder="Event Name"
                        value={x.name}
                        onChange={(e) => updateField('upcomingEvents', i, 'name', e.target.value)}
                      />
                      <ManagedInput
                        placeholder="Date"
                        value={x.date}
                        onChange={(e) => updateField('upcomingEvents', i, 'date', e.target.value)}
                      />
                      <ManagedInput
                        placeholder="Venue"
                        value={x.venue}
                        onChange={(e) => updateField('upcomingEvents', i, 'venue', e.target.value)}
                      />
                      <ManagedInput
                        placeholder="Image URL"
                        value={x.image}
                        onChange={(e) => updateField('upcomingEvents', i, 'image', e.target.value)}
                      />
                      <button type="button" className="danger-btn" onClick={() => removeItem('upcomingEvents', i)}>
                        Remove
                      </button>
                    </div>
                  ))}
                  <button type="button" className="add-btn" onClick={() => addItem('upcomingEvents', { name: '', date: '', venue: '', image: '' })}>
                    Add Event
                  </button>
                </section>

                <section className="admin-card">
                  <h3>Latest Announcements</h3>
                  {content.announcements.map((text, i) => (
                    <div key={i} className="form-row single-row">
                      <ManagedInput
                        placeholder="Announcement text"
                        value={text}
                        onChange={(e) => {
                          const next = [...content.announcements];
                          next[i] = e.target.value;
                          updateRootField('announcements', next);
                        }}
                      />
                      <button type="button" className="danger-btn" onClick={() => removeItem('announcements', i)}>
                        Remove
                      </button>
                    </div>
                  ))}
                  <button type="button" className="add-btn" onClick={() => addItem('announcements', '')}>
                    Add Announcement
                  </button>
                </section>

                <button type="submit" className="save-btn" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>

            <div className="cms-preview">
              <div className="preview-hero">
                <h1>{content.heroTitle}</h1>
                <p>{content.heroSubtitle}</p>
                <div className="preview-buttons">
                  {content.heroButtons.slice(0, 2).map((button, i) => (
                    <span key={`${button.text}-${i}`} className="preview-btn">{button.text}</span>
                  ))}
                </div>
              </div>

              <div className="preview-stats">
                {content.achievements.map((a, i) => (
                  <div key={i} className="preview-stat">
                    <h2>{a.value}</h2>
                    <span>{cleanLeadingIconText(a.title)}</span>
                  </div>
                ))}
              </div>

              <div className="preview-section">
                <h4>Sports Categories</h4>
                <div className="preview-list">
                  {content.sportsCategories.map((item, i) => (
                    <div key={i}>{item.name || 'Category'}</div>
                  ))}
                </div>
              </div>

              <div className="preview-section">
                <h4>Upcoming Events</h4>
                <div className="preview-list">
                  {content.upcomingEvents.map((item, i) => (
                    <div key={i}>{item.name || 'Event'} - {item.date || '-'}</div>
                  ))}
                </div>
              </div>

              <div className="preview-section">
                <h4>Latest Announcements</h4>
                <div className="preview-list">
                  {content.announcements.map((item, i) => (
                    <div key={i}>{item || 'No announcement'}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {showSuccess && (
        <div className="success-overlay">
          <div className="success-card">
            <h2>{toastTitle}</h2>
            <p>{toastMessage}</p>
            <button type="button" onClick={() => setShowSuccess(false)}>OK</button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ManageHome;


