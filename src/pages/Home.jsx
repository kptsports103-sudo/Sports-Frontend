import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCalendarCheck, FaMedal, FaTrophy, FaUsers } from 'react-icons/fa';
import ChatWindowShowcase from '../components/ChatWindowShowcase';
import OptimizedImage from '../components/OptimizedImage';
import api from '../services/api';
import { normalizeHistoryTimeline } from '../utils/historyTimeline';
import './Home.css';

const createEmptyHomeContent = () => ({
  heroTitle: 'KPT Sports',
  heroSubtitle: 'Train hard, compete smart, and celebrate every achievement.',
  heroButtons: [],
  banners: [],
  achievements: [],
  sportsCategories: [],
  gallery: [],
  upcomingEvents: [],
  clubs: [],
  announcements: []
});

const iconMap = {
  trophy: FaTrophy,
  users: FaUsers,
  calendar: FaCalendarCheck,
  medal: FaMedal
};

const fallbackIcons = [FaTrophy, FaUsers, FaCalendarCheck, FaMedal];

const cleanLeadingIconText = (text) => {
  const value = String(text || '');
  return value.replace(/^[^A-Za-z0-9]+/, '').trim();
};

const YEARS_OF_EXCELLENCE_BASE = 12;
const SPORTS_MEETS_EXCELLENCE_BASELINE = 45;

const overrideAchievementCountsWithStateTimeline = (achievements, timeline) => {
  const stateCountNumber = normalizeHistoryTimeline(timeline).state.length;
  const stateCount = String(stateCountNumber);
  const yearsOfExcellence = String(
    YEARS_OF_EXCELLENCE_BASE + Math.max(0, stateCountNumber - SPORTS_MEETS_EXCELLENCE_BASELINE)
  );

  return (Array.isArray(achievements) ? achievements : []).map((item) => {
    const key = String(item?.key || '').trim();
    const title = String(item?.title || '').trim().toLowerCase();

    if (key === 'sportsMeetsConducted' || title === 'sports meets conducted') {
      return {
        ...item,
        value: stateCount,
      };
    }

    if (key === 'yearsOfExcellence' || title === 'years of excellence') {
      return {
        ...item,
        value: yearsOfExcellence,
      };
    }

    return item;
  });
};

function Home() {
  const navigate = useNavigate();
  const [content, setContent] = useState(createEmptyHomeContent());
  const [featuredWinners, setFeaturedWinners] = useState([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [showDeferredSections, setShowDeferredSections] = useState(false);
  const activeBanner = content.banners[currentBannerIndex] ?? null;
  const heroImage = activeBanner?.image || content.gallery[0]?.image || '';

  useEffect(() => {
    const fetchHomeContent = async () => {
      const [homeResult, winnersResult] = await Promise.allSettled([
        api.get('/home'),
        api.get('/winners?limit=3')
      ]);

      if (homeResult.status === 'fulfilled') {
        const data = homeResult.value?.data ?? {};
        setContent({
          heroTitle: data.heroTitle ?? 'KPT Sports',
          heroSubtitle: data.heroSubtitle ?? 'Train hard, compete smart, and celebrate every achievement.',
          heroButtons: Array.isArray(data.heroButtons) ? data.heroButtons : [],
          banners: Array.isArray(data.banners) ? data.banners : [],
          achievements: overrideAchievementCountsWithStateTimeline(data.achievements, data.timeline),
          sportsCategories: Array.isArray(data.sportsCategories) ? data.sportsCategories : [],
          gallery: Array.isArray(data.gallery) ? data.gallery : [],
          upcomingEvents: Array.isArray(data.upcomingEvents) ? data.upcomingEvents : [],
          clubs: Array.isArray(data.clubs) ? data.clubs : [],
          announcements: Array.isArray(data.announcements) ? data.announcements : []
        });
      } else {
        console.error('Failed to fetch home content:', homeResult.reason);
        setContent(createEmptyHomeContent());
      }

      if (winnersResult.status === 'fulfilled') {
        setFeaturedWinners(Array.isArray(winnersResult.value?.data) ? winnersResult.value.data : []);
      } else {
        console.error('Failed to fetch featured winners:', winnersResult.reason);
        setFeaturedWinners([]);
      }
    };

    fetchHomeContent();
  }, []);

  useEffect(() => {
    if (!Array.isArray(content.banners) || content.banners.length <= 1) {
      setCurrentBannerIndex(0);
      return undefined;
    }

    const id = window.setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % content.banners.length);
    }, 5000);

    return () => window.clearInterval(id);
  }, [content.banners]);

  useEffect(() => {
    let timeoutId;
    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(() => setShowDeferredSections(true), { timeout: 1500 });
      return () => window.cancelIdleCallback(idleId);
    }
    timeoutId = window.setTimeout(() => setShowDeferredSections(true), 700);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const routeTo = (link) => {
    if (!link) return;
    if (link.startsWith('/')) {
      navigate(link);
      return;
    }
    window.location.href = link;
  };

  return (
    <main className="home-page">
      <section id="hero" className="home-hero">
        <div className="home-hero__overlay" />
        <div className="home-hero__lights" />
        {activeBanner?.year ? <span className="banner-year">{activeBanner.year}</span> : null}

        <div className="home-hero__layout">
          <div className="home-hero__content">
            <p style={{ margin: 0, fontSize: '14px', letterSpacing: '1px', fontWeight: 700, opacity: 0.9 }}>
              KPT Sports Home
            </p>
            <h1>{content.heroTitle}</h1>
            <p>{content.heroSubtitle}</p>

            {content.heroButtons.length > 0 ? (
              <div className="home-hero__actions">
                {content.heroButtons.slice(0, 2).map((button, index) => (
                  <button
                    key={`${button.text}-${index}`}
                    className={`hero-btn ${index === 0 ? 'hero-btn--primary' : 'hero-btn--outline'}`}
                    type="button"
                    onClick={() => routeTo(button.link)}
                  >
                    {button.text}
                  </button>
                ))}
              </div>
            ) : <div className="home-hero__actions home-hero__actions--placeholder" aria-hidden="true" />}
          </div>

          <div className="home-hero__media" aria-hidden={!heroImage}>
            {heroImage ? (
              <OptimizedImage
                src={heroImage}
                alt="Sports highlight"
                fetchPriority="high"
                loading="eager"
                width={540}
                height={420}
                sizes="(max-width: 1024px) 100vw, 540px"
              />
            ) : (
              <div className="home-hero__media-placeholder" />
            )}
          </div>
        </div>

        <div className={`home-hero__stats ${content.achievements.length === 0 ? 'home-hero__stats--placeholder' : ''}`}>
          {(content.achievements.length > 0 ? content.achievements : new Array(4).fill(null)).map((item, index) => {
            if (!item) {
              return (
                <article key={`placeholder-${index}`} className="home-hero__stats-card home-hero__stats-card--placeholder" aria-hidden="true" />
              );
            }
            const Icon = iconMap[item?.icon] || fallbackIcons[index % fallbackIcons.length];
            return (
              <article key={`${item.title}-${index}`} className="home-hero__stats-card">
                <div className="stat-icon">
                  <Icon />
                </div>
                <h2>{item.value}</h2>
                <p>{cleanLeadingIconText(item.title)}</p>
              </article>
            );
          })}
        </div>

        <div className="home-hero__scroll-indicator">
          <span>Scroll</span>
          <span className="home-hero__scroll-arrow">v</span>
        </div>
      </section>

      <ChatWindowShowcase />

      {showDeferredSections && content.announcements.length > 0 ? (
        <section id="announcements" className="section-shell">
          <header className="section-header">
            <h2>Latest Announcements</h2>
          </header>
          <div className="announcement-list">
            {content.announcements.map((announcement, index) => (
              <article key={`${announcement}-${index}`} className="announcement-item">
                <span className="announcement-dot" />
                <p>{announcement}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {showDeferredSections && content.sportsCategories.length > 0 ? (
        <section id="sports-categories" className="section-shell">
          <header className="section-header">
            <h2>Sports Categories</h2>
          </header>
          <div className="sports-grid">
            {content.sportsCategories.map((category, index) => (
              <article key={`${category.name}-${index}`} className="sports-grid__item">
                <OptimizedImage
                  src={category.image}
                  alt={category.name}
                  width={400}
                  height={210}
                  sizes="(max-width: 560px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="sports-grid__overlay" />
                <h3>{category.name}</h3>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {showDeferredSections && featuredWinners.length > 0 ? (
        <section id="winners" className="section-shell">
          <header className="section-header section-header--with-action">
            <h2>Latest Winners</h2>
            <button className="section-view-more" type="button" onClick={() => navigate('/winners')}>
              View All Winners
            </button>
          </header>

          <div className="winner-preview-grid">
            {featuredWinners.map((winner, index) => (
              <article key={winner._id || `${winner.playerName}-${index}`} className="winner-preview-card">
                <div className="winner-preview-card__media">
                  <OptimizedImage
                    src={winner.imageUrl}
                    alt={winner.playerName || `Winner ${index + 1}`}
                    width={520}
                    height={340}
                    sizes="(max-width: 560px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <span className={`winner-preview-card__medal winner-preview-card__medal--${String(winner.medal || '').toLowerCase()}`}>
                    {winner.medal}
                  </span>
                </div>

                <div className="winner-preview-card__body">
                  <p className="winner-preview-card__event">{winner.eventName}</p>
                  <h3>{winner.playerName}</h3>
                  {winner.teamName || winner.branch ? (
                    <p className="winner-preview-card__description">
                      {[winner.teamName ? `Team: ${winner.teamName}` : '', winner.branch ? `Branch: ${winner.branch}` : '']
                        .filter(Boolean)
                        .join(' | ')}
                    </p>
                  ) : null}
                  <p className="winner-preview-card__description">
                    Honored for outstanding performance in {winner.eventName}.
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {showDeferredSections && content.gallery.length > 0 ? (
        <section id="gallery" className="section-shell">
          <header className="section-header section-header--with-action">
            <h2>Photo Gallery Preview</h2>
            <button className="section-view-more" type="button" onClick={() => navigate('/gallery')}>
              View More
            </button>
          </header>
          <div className="gallery-grid">
            {content.gallery.slice(0, 8).map((item, index) => (
              <figure key={`${item.image}-${index}`} className="gallery-card">
                <OptimizedImage
                  src={item.image}
                  alt={item.caption || `Gallery ${index + 1}`}
                  width={320}
                  height={220}
                  sizes="(max-width: 560px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                {item.caption ? <figcaption>{item.caption}</figcaption> : null}
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {showDeferredSections && content.upcomingEvents.length > 0 ? (
        <section id="events" className="section-shell">
          <header className="section-header">
            <h2>Upcoming Events</h2>
          </header>
          <div className="events-grid">
            {content.upcomingEvents.map((event, index) => (
              <article key={`${event.name}-${index}`} className="event-card">
                {event.image ? (
                  <OptimizedImage
                    src={event.image}
                    alt={event.name}
                    width={600}
                    height={180}
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                ) : null}
                <div className="event-card__body">
                  <h3>{event.name}</h3>
                  {event.date ? (
                    <p>
                      <span className="event-icon">DT</span>
                      {event.date}
                    </p>
                  ) : null}
                  {event.venue ? <span>{event.venue}</span> : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

export default Home;
