import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CalendarDays,
  Camera,
  ChevronRight,
  Medal,
  Trophy,
  Users,
  Award,
  FolderKanban,
} from 'lucide-react';
import OptimizedImage from '../components/OptimizedImage';
import api from '../services/api';
import './Archive.css';

const SUMMARY_ITEMS = [
  { key: 'eventCount', label: 'Events', Icon: CalendarDays },
  { key: 'playerCount', label: 'Players', Icon: Users },
  { key: 'resultCount', label: 'Results', Icon: Trophy },
  { key: 'winnerCount', label: 'Winners', Icon: Medal },
  { key: 'certificateCount', label: 'Certificates', Icon: Award },
  { key: 'galleryAssetCount', label: 'Gallery Media', Icon: Camera },
];

const MEDAL_COLORS = {
  Gold: '#f1b90c',
  Silver: '#94a3b8',
  Bronze: '#d97706',
  Participation: '#2563eb',
};

const SECTION_LIMITS = {
  featuredEvents: 6,
  topWinners: 6,
  latestMedia: 8,
  results: 6,
  groupResults: 6,
  certificates: 6,
  players: 8,
};

const safeArray = (value) => (Array.isArray(value) ? value : []);
const isLikelyImageAsset = (entry) => {
  if (entry?.source === 'gallery') {
    return true;
  }

  const url = String(entry?.url || '').trim().toLowerCase();
  return /\.(avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/.test(url);
};

const Archive = () => {
  const navigate = useNavigate();
  const { year } = useParams();
  const [archiveData, setArchiveData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isActive = true;

    const loadArchive = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const endpoint = year ? `/archive/${encodeURIComponent(year)}` : '/archive';
        const response = await api.get(endpoint);
        if (!isActive) {
          return;
        }

        setArchiveData(response?.data || null);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setArchiveData(null);
        setErrorMessage(error?.response?.data?.message || error?.message || 'Failed to load archive data.');
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadArchive();

    return () => {
      isActive = false;
    };
  }, [year]);

  const availableYears = safeArray(archiveData?.availableYears);
  const selectedYear = archiveData?.year || '';
  const summary = archiveData?.summary || {};
  const medalBreakdown = archiveData?.medalBreakdown || {};
  const highlights = archiveData?.highlights || {};
  const sections = archiveData?.sections || {};
  const links = archiveData?.links || {};
  const eventsLink = !links.events || links.events === '/events'
    ? '/sports-celebration?tab=events'
    : links.events;
  const visibleMediaHighlights = useMemo(
    () => safeArray(highlights.latestMedia).filter(isLikelyImageAsset),
    [highlights.latestMedia]
  );
  const hasAnySectionData = useMemo(
    () =>
      [
        ...safeArray(highlights.featuredEvents),
        ...safeArray(highlights.topWinners),
        ...visibleMediaHighlights,
        ...safeArray(sections.results),
        ...safeArray(sections.groupResults),
        ...safeArray(sections.certificates),
        ...safeArray(sections.players),
      ].length > 0,
    [highlights.featuredEvents, highlights.topWinners, sections, visibleMediaHighlights]
  );

  const handleYearChange = (nextYear) => {
    if (!nextYear) {
      navigate('/archive');
      return;
    }

    navigate(`/archive/${nextYear}`);
  };

  return (
    <main className="archive-page">
      <section className="archive-page__hero">
        <div className="archive-page__hero-copy">
          <p className="archive-page__eyebrow">KPT Sports Archive</p>
          <h1 className="archive-page__title">Sports Archive by Year</h1>
          <p className="archive-page__intro">
            Explore KPT sports history year by year with events, results, winners, certificates, players, and visual
            highlights in one public archive.
          </p>

          <div className="archive-page__hero-actions">
            <Link to={links.results || '/results'} className="archive-page__hero-link">
              <span>Results</span>
              <ChevronRight size={16} />
            </Link>
            <Link to={links.winners || '/winners'} className="archive-page__hero-link">
              <span>Winners</span>
              <ChevronRight size={16} />
            </Link>
            <Link to={links.gallery || '/gallery'} className="archive-page__hero-link">
              <span>Gallery</span>
              <ChevronRight size={16} />
            </Link>
            <Link to={eventsLink} className="archive-page__hero-link">
              <span>Events</span>
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>

        <div className="archive-page__year-panel">
          <div className="archive-page__year-panel-label">Selected Archive Year</div>
          <div className="archive-page__year-value">{selectedYear || '----'}</div>
          <label className="archive-page__year-select-wrap" htmlFor="archive-year-select">
            <span>Choose year</span>
            <select
              id="archive-year-select"
              name="archive-year-select"
              value={selectedYear || ''}
              onChange={(event) => handleYearChange(event.target.value)}
              disabled={isLoading}
            >
              {!selectedYear ? <option value="">No archive year</option> : null}
              {availableYears.map((availableYear) => (
                <option key={availableYear} value={availableYear}>
                  {availableYear}
                </option>
              ))}
            </select>
          </label>
          <p className="archive-page__year-copy">
            Switch the year to revisit the most important KPT sports records and public highlights.
          </p>
        </div>
      </section>

      <section className="archive-page__year-pills" aria-label="Archive years">
        {availableYears.map((availableYear) => {
          const isActive = Number(availableYear) === Number(selectedYear);
          return (
            <button
              key={availableYear}
              type="button"
              className={`archive-page__year-pill ${isActive ? 'is-active' : ''}`}
              onClick={() => handleYearChange(availableYear)}
            >
              {availableYear}
            </button>
          );
        })}
      </section>

      {isLoading ? (
        <section className="archive-page__state">
          <p>Loading archive data...</p>
        </section>
      ) : errorMessage ? (
        <section className="archive-page__state archive-page__state--error">
          <p>{errorMessage}</p>
        </section>
      ) : !archiveData?.hasAnyData ? (
        <section className="archive-page__state">
          <p>No archive data is available yet. Add sports data from the admin area to populate this page.</p>
        </section>
      ) : (
        <>
          <section className="archive-page__summary-grid">
            {SUMMARY_ITEMS.map(({ key, label, Icon }) => (
              <article key={key} className="archive-page__summary-card">
                <div className="archive-page__summary-icon">
                  <Icon size={18} />
                </div>
                <div className="archive-page__summary-value">{summary[key] || 0}</div>
                <div className="archive-page__summary-label">{label}</div>
              </article>
            ))}
          </section>

          <section className="archive-page__medal-strip">
            {Object.entries(MEDAL_COLORS).map(([medal, color]) => (
              <article key={medal} className="archive-page__medal-card" style={{ '--archive-medal-color': color }}>
                <span>{medal}</span>
                <strong>{medalBreakdown[medal] || 0}</strong>
              </article>
            ))}
          </section>

          <section className="archive-page__content-grid">
            <article className="archive-section archive-section--wide">
              <header className="archive-section__head">
                <div>
                  <p className="archive-section__eyebrow">Featured Events</p>
                  <h2 className="archive-section__title">Year {selectedYear} sports moments</h2>
                </div>
                <Link to={eventsLink} className="archive-section__link">
                  Open Events
                </Link>
              </header>

              <div className="archive-section__event-grid">
                {safeArray(highlights.featuredEvents).slice(0, SECTION_LIMITS.featuredEvents).map((event) => (
                  <article key={event.id} className="archive-event-card">
                    <div className="archive-event-card__pill">{event.sportType || 'Sports'}</div>
                    <h3>{event.title}</h3>
                    <p>{event.eventDate || 'Date to be announced'}</p>
                    <span>
                      {[event.venue, event.city, event.registrationStatus].filter(Boolean).join(' | ') || 'Details will be updated'}
                    </span>
                  </article>
                ))}
                {safeArray(highlights.featuredEvents).length === 0 ? (
                  <div className="archive-section__empty">No event records are available for {selectedYear}.</div>
                ) : null}
              </div>
            </article>

            <article className="archive-section">
              <header className="archive-section__head">
                <div>
                  <p className="archive-section__eyebrow">Winner Highlights</p>
                  <h2 className="archive-section__title">Top winners</h2>
                </div>
                <Link to={links.winners || '/winners'} className="archive-section__link">
                  Open Winners
                </Link>
              </header>

              <div className="archive-section__stack">
                {safeArray(highlights.topWinners).slice(0, SECTION_LIMITS.topWinners).map((winner) => (
                  <article key={winner.id} className="archive-mini-card">
                    <div className="archive-mini-card__top">
                      <strong>{winner.playerName}</strong>
                      <span className="archive-mini-card__badge" style={{ '--archive-badge-color': MEDAL_COLORS[winner.medal] || '#2563eb' }}>
                        {winner.medal}
                      </span>
                    </div>
                    <p>{winner.eventName}</p>
                    <span>{winner.branch || winner.teamName || 'KPT Sports'}</span>
                  </article>
                ))}
                {safeArray(highlights.topWinners).length === 0 ? (
                  <div className="archive-section__empty">No winner highlights are available for {selectedYear}.</div>
                ) : null}
              </div>
            </article>

            <article className="archive-section">
              <header className="archive-section__head">
                <div>
                  <p className="archive-section__eyebrow">Latest Media</p>
                  <h2 className="archive-section__title">Visual archive</h2>
                </div>
                <Link to={links.gallery || '/gallery'} className="archive-section__link">
                  Open Gallery
                </Link>
              </header>

              <div className="archive-media-grid">
                {visibleMediaHighlights.slice(0, SECTION_LIMITS.latestMedia).map((media) => (
                  <article key={media.id} className="archive-media-card">
                    <OptimizedImage
                      className="archive-media-card__image"
                      src={media.url}
                      alt={media.title || 'Archive media'}
                      width={640}
                      height={420}
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="archive-media-card__body">
                      <strong>{media.title || 'Archive media'}</strong>
                      <p>{media.overview || media.category || 'KPT Sports archive visual'}</p>
                    </div>
                  </article>
                ))}
                {visibleMediaHighlights.length === 0 ? (
                  <div className="archive-section__empty">No media highlights are available for {selectedYear}.</div>
                ) : null}
              </div>
            </article>

            <article className="archive-section">
              <header className="archive-section__head">
                <div>
                  <p className="archive-section__eyebrow">Results</p>
                  <h2 className="archive-section__title">Individual podiums</h2>
                </div>
                <Link to={links.results || '/results'} className="archive-section__link">
                  Open Results
                </Link>
              </header>

              <div className="archive-section__stack">
                {safeArray(sections.results).slice(0, SECTION_LIMITS.results).map((result) => (
                  <article key={result.id} className="archive-mini-card">
                    <div className="archive-mini-card__top">
                      <strong>{result.name}</strong>
                      <span className="archive-mini-card__badge" style={{ '--archive-badge-color': MEDAL_COLORS[result.medal] || '#2563eb' }}>
                        {result.medal}
                      </span>
                    </div>
                    <p>{result.event}</p>
                    <span>{[result.branch, result.level].filter(Boolean).join(' | ')}</span>
                  </article>
                ))}
                {safeArray(sections.results).length === 0 ? (
                  <div className="archive-section__empty">No individual results are available for {selectedYear}.</div>
                ) : null}
              </div>
            </article>

            <article className="archive-section">
              <header className="archive-section__head">
                <div>
                  <p className="archive-section__eyebrow">Team Results</p>
                  <h2 className="archive-section__title">Group performances</h2>
                </div>
                <Link to={links.results || '/results'} className="archive-section__link">
                  Open Results
                </Link>
              </header>

              <div className="archive-section__stack">
                {safeArray(sections.groupResults).slice(0, SECTION_LIMITS.groupResults).map((result) => (
                  <article key={result.id} className="archive-mini-card">
                    <div className="archive-mini-card__top">
                      <strong>{result.teamName}</strong>
                      <span className="archive-mini-card__badge" style={{ '--archive-badge-color': MEDAL_COLORS[result.medal] || '#2563eb' }}>
                        {result.medal}
                      </span>
                    </div>
                    <p>{result.event}</p>
                    <span>{result.members.slice(0, 3).join(', ') || 'Team details available in results'}</span>
                  </article>
                ))}
                {safeArray(sections.groupResults).length === 0 ? (
                  <div className="archive-section__empty">No team results are available for {selectedYear}.</div>
                ) : null}
              </div>
            </article>

            <article className="archive-section">
              <header className="archive-section__head">
                <div>
                  <p className="archive-section__eyebrow">Certificates</p>
                  <h2 className="archive-section__title">Issued recognitions</h2>
                </div>
                <span className="archive-section__link archive-section__link--muted">
                  Verification Active
                </span>
              </header>

              <div className="archive-section__stack">
                {safeArray(sections.certificates).slice(0, SECTION_LIMITS.certificates).map((certificate) => (
                  <article key={certificate.id} className="archive-mini-card">
                    <div className="archive-mini-card__top">
                      <strong>{certificate.name}</strong>
                      <span className="archive-mini-card__tag">{certificate.position || 'Certificate'}</span>
                    </div>
                    <p>{certificate.competition}</p>
                    <span>{[certificate.department, certificate.certificateId].filter(Boolean).join(' | ')}</span>
                  </article>
                ))}
                {safeArray(sections.certificates).length === 0 ? (
                  <div className="archive-section__empty">No certificates are available for {selectedYear}.</div>
                ) : null}
              </div>
            </article>

            <article className="archive-section archive-section--wide">
              <header className="archive-section__head">
                <div>
                  <p className="archive-section__eyebrow">Player Archive</p>
                  <h2 className="archive-section__title">Students and participation records</h2>
                </div>
                <span className="archive-section__count">
                  <FolderKanban size={15} />
                  <span>{(summary.playerCount || 0) + (summary.participationCount || 0)} tracked records</span>
                </span>
              </header>

              <div className="archive-player-grid">
                {safeArray(sections.players).slice(0, SECTION_LIMITS.players).map((player) => (
                  <Link
                    key={player.id}
                    to={player.profilePath || (player.profileId ? `/players/${encodeURIComponent(player.profileId)}` : '#')}
                    className={`archive-player-card archive-player-card--link ${!player.profileId && !player.profilePath ? 'is-disabled' : ''}`}
                    aria-disabled={!player.profileId && !player.profilePath}
                    onClick={(event) => {
                      if (!player.profileId && !player.profilePath) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <strong>{player.name}</strong>
                    <p>{player.branch || 'KPT Branch'}</p>
                    <span>
                      {[player.kpmNo, player.semester ? `Sem ${player.semester}` : '', player.currentDiplomaYear ? `Year ${player.currentDiplomaYear}` : '']
                        .filter(Boolean)
                        .join(' | ') || 'Player record'}
                    </span>
                  </Link>
                ))}
                {safeArray(sections.players).length === 0 ? (
                  <div className="archive-section__empty">No player records are available for {selectedYear}.</div>
                ) : null}
              </div>
            </article>
          </section>

          {!hasAnySectionData ? (
            <section className="archive-page__state">
              <p>Archive data exists, but there are no visible public records for {selectedYear} yet.</p>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
};

export default Archive;
