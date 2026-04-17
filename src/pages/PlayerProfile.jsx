import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  CalendarDays,
  Medal,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';
import OptimizedImage from '../components/OptimizedImage';
import api from '../services/api';
import './PlayerProfile.css';

const STAT_ITEMS = [
  { key: 'activeYears', label: 'Active Years', Icon: CalendarDays },
  { key: 'individualResults', label: 'Individual Results', Icon: Trophy },
  { key: 'teamResults', label: 'Team Results', Icon: Users },
  { key: 'winnerCards', label: 'Winner Cards', Icon: Medal },
  { key: 'certificates', label: 'Certificates', Icon: Award },
  { key: 'participations', label: 'Participation Logs', Icon: ShieldCheck },
];

const MEDAL_COLORS = {
  Gold: '#f1b90c',
  Silver: '#94a3b8',
  Bronze: '#d97706',
  Participation: '#2563eb',
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

const PlayerProfile = () => {
  const { playerId } = useParams();
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isActive = true;

    const loadProfile = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const response = await api.get(`/players/${encodeURIComponent(playerId || '')}`);
        if (!isActive) {
          return;
        }

        setProfileData(response?.data || null);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setProfileData(null);
        setErrorMessage(error?.response?.data?.message || error?.message || 'Failed to load player profile.');
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    if (playerId) {
      loadProfile();
    } else {
      setProfileData(null);
      setIsLoading(false);
      setErrorMessage('Player profile not found.');
    }

    return () => {
      isActive = false;
    };
  }, [playerId]);

  const player = profileData?.player || {};
  const summary = profileData?.summary || {};
  const medalBreakdown = profileData?.medalBreakdown || {};
  const history = profileData?.history || {};
  const links = profileData?.links || {};
  const heroInitial = useMemo(() => String(player.name || 'P').trim().charAt(0).toUpperCase(), [player.name]);
  const profileMeta = [player.branch, player.currentDiplomaYear ? `Year ${player.currentDiplomaYear}` : '', player.semester ? `Sem ${player.semester}` : '']
    .filter(Boolean)
    .join(' • ');

  return (
    <main className="player-profile-page">
      {isLoading ? (
        <section className="player-profile-page__state">
          <p>Loading player profile...</p>
        </section>
      ) : errorMessage ? (
        <section className="player-profile-page__state player-profile-page__state--error">
          <p>{errorMessage}</p>
          <Link to="/archive" className="player-profile-page__back-link">
            <ArrowLeft size={16} />
            <span>Back to Archive</span>
          </Link>
        </section>
      ) : (
        <>
          <section className="player-profile-page__hero">
            <div className="player-profile-page__hero-copy">
              <Link to={links.archive || '/archive'} className="player-profile-page__back-link">
                <ArrowLeft size={16} />
                <span>Back to Archive</span>
              </Link>
              <p className="player-profile-page__eyebrow">KPT Sports Player Profile</p>
              <h1 className="player-profile-page__title">{player.name || 'Player Profile'}</h1>
              <p className="player-profile-page__intro">
                {profileMeta || 'KPT Sports player history'}{player.kpmNo ? ` • ${player.kpmNo}` : ''}{player.status ? ` • ${player.status}` : ''}
              </p>

              <div className="player-profile-page__actions">
                <Link to={links.directory || '/players'} className="player-profile-page__action">
                  Open Players Directory
                </Link>
                <Link to={links.archive || '/archive'} className="player-profile-page__action">
                  Open Archive
                </Link>
                <Link to={links.results || '/results'} className="player-profile-page__action player-profile-page__action--secondary">
                  Open Results
                </Link>
                <Link to={links.winners || '/winners'} className="player-profile-page__action player-profile-page__action--secondary">
                  Open Winners
                </Link>
              </div>

              <div className="player-profile-page__year-pills" aria-label="Player archive years">
                {safeArray(links.archiveYears).map((entry) => (
                  <Link key={entry.year} to={entry.path} className="player-profile-page__year-pill">
                    {entry.year}
                  </Link>
                ))}
              </div>
            </div>

            <aside className="player-profile-page__hero-card">
              {player.heroImageUrl ? (
                <OptimizedImage
                  className="player-profile-page__hero-image"
                  src={player.heroImageUrl}
                  alt={player.name || 'Player'}
                  width={520}
                  height={520}
                  sizes="(max-width: 900px) 100vw, 320px"
                />
              ) : (
                <div className="player-profile-page__hero-fallback" aria-hidden="true">
                  {heroInitial}
                </div>
              )}

              <div className="player-profile-page__hero-details">
                <strong>{player.branch || 'KPT Sports'}</strong>
                <span>{player.kpmNo || 'KPM pending'}</span>
                <span>{player.firstParticipationYear ? `First recorded year ${player.firstParticipationYear}` : 'Player profile linked to archive history'}</span>
              </div>
            </aside>
          </section>

          <section className="player-profile-page__stats">
            {STAT_ITEMS.map(({ key, label, Icon }) => (
              <article key={key} className="player-profile-page__stat-card">
                <div className="player-profile-page__stat-icon">
                  <Icon size={18} />
                </div>
                <strong>{summary[key] || 0}</strong>
                <span>{label}</span>
              </article>
            ))}
          </section>

          <section className="player-profile-page__medals">
            {Object.entries(MEDAL_COLORS).map(([medal, color]) => (
              <article key={medal} className="player-profile-page__medal-card" style={{ '--player-medal-color': color }}>
                <span>{medal}</span>
                <strong>{medalBreakdown[medal] || 0}</strong>
              </article>
            ))}
          </section>

          <section className="player-profile-page__content">
            <article className="player-profile-section player-profile-section--wide">
              <header className="player-profile-section__head">
                <div>
                  <p className="player-profile-section__eyebrow">Career Seasons</p>
                  <h2 className="player-profile-section__title">Year-by-year player record</h2>
                </div>
              </header>

              <div className="player-profile-page__season-grid">
                {safeArray(history.seasons).map((season) => (
                  <article key={season.id} className="player-profile-card">
                    <div className="player-profile-card__top">
                      <strong>{season.year || 'Year'}</strong>
                      <Link to={season.archivePath} className="player-profile-card__link">
                        Open Archive
                      </Link>
                    </div>
                    <p>{season.branch || 'KPT Branch'}</p>
                    <span>
                      {[season.currentDiplomaYear ? `Year ${season.currentDiplomaYear}` : '', season.semester ? `Sem ${season.semester}` : '', season.kpmNo]
                        .filter(Boolean)
                        .join(' • ') || 'Season record'}
                    </span>
                    <span className="player-profile-card__status">{season.status || 'ACTIVE'}</span>
                  </article>
                ))}
              </div>
            </article>

            <article className="player-profile-section">
              <header className="player-profile-section__head">
                <div>
                  <p className="player-profile-section__eyebrow">Individual Results</p>
                  <h2 className="player-profile-section__title">Medal results</h2>
                </div>
              </header>

              <div className="player-profile-section__stack">
                {safeArray(history.individualResults).length === 0 ? (
                  <div className="player-profile-section__empty">No individual results are linked to this player yet.</div>
                ) : (
                  safeArray(history.individualResults).map((entry) => (
                    <article key={entry.id} className="player-profile-list-card">
                      <div className="player-profile-list-card__top">
                        <strong>{entry.event}</strong>
                        <span className="player-profile-list-card__badge" style={{ '--player-badge-color': MEDAL_COLORS[entry.medal] || '#2563eb' }}>
                          {entry.medal}
                        </span>
                      </div>
                      <p>{[entry.level, entry.branch].filter(Boolean).join(' • ') || 'Result record'}</p>
                      <Link to={entry.archivePath} className="player-profile-card__link">Archive {entry.year}</Link>
                    </article>
                  ))
                )}
              </div>
            </article>

            <article className="player-profile-section">
              <header className="player-profile-section__head">
                <div>
                  <p className="player-profile-section__eyebrow">Winner Cards</p>
                  <h2 className="player-profile-section__title">Published winner highlights</h2>
                </div>
              </header>

              <div className="player-profile-section__stack">
                {safeArray(history.winners).length === 0 ? (
                  <div className="player-profile-section__empty">No winner cards are linked to this player yet.</div>
                ) : (
                  safeArray(history.winners).map((entry) => (
                    <article key={entry.id} className="player-profile-list-card">
                      <div className="player-profile-list-card__top">
                        <strong>{entry.eventName}</strong>
                        <span className="player-profile-list-card__badge" style={{ '--player-badge-color': MEDAL_COLORS[entry.medal] || '#2563eb' }}>
                          {entry.medal}
                        </span>
                      </div>
                      <p>{[entry.branch, entry.teamName].filter(Boolean).join(' • ') || 'Winner card'}</p>
                      <Link to={entry.archivePath} className="player-profile-card__link">Archive {entry.year}</Link>
                    </article>
                  ))
                )}
              </div>
            </article>

            <article className="player-profile-section player-profile-section--wide">
              <header className="player-profile-section__head">
                <div>
                  <p className="player-profile-section__eyebrow">Team Results</p>
                  <h2 className="player-profile-section__title">Group and team performances</h2>
                </div>
              </header>

              <div className="player-profile-page__season-grid">
                {safeArray(history.teamResults).length === 0 ? (
                  <div className="player-profile-section__empty">No team results are linked to this player yet.</div>
                ) : (
                  safeArray(history.teamResults).map((entry) => (
                    <article key={entry.id} className="player-profile-card">
                      <div className="player-profile-card__top">
                        <strong>{entry.teamName}</strong>
                        <span className="player-profile-list-card__badge" style={{ '--player-badge-color': MEDAL_COLORS[entry.medal] || '#2563eb' }}>
                          {entry.medal}
                        </span>
                      </div>
                      <p>{entry.event}</p>
                      <span>{entry.members.slice(0, 4).join(', ') || 'Team roster available in archive'}</span>
                      <Link to={entry.archivePath} className="player-profile-card__link">Archive {entry.year}</Link>
                    </article>
                  ))
                )}
              </div>
            </article>

            <article className="player-profile-section">
              <header className="player-profile-section__head">
                <div>
                  <p className="player-profile-section__eyebrow">Certificates</p>
                  <h2 className="player-profile-section__title">Issued certificates</h2>
                </div>
              </header>

              <div className="player-profile-section__stack">
                {safeArray(history.certificates).length === 0 ? (
                  <div className="player-profile-section__empty">No certificates are linked to this player yet.</div>
                ) : (
                  safeArray(history.certificates).map((entry) => (
                    <article key={entry.id} className="player-profile-list-card">
                      <div className="player-profile-list-card__top">
                        <strong>{entry.competition}</strong>
                        <span className="player-profile-list-card__tag">{entry.position || 'Certificate'}</span>
                      </div>
                      <p>{[entry.achievement, entry.department].filter(Boolean).join(' • ') || 'Certificate record'}</p>
                      <div className="player-profile-list-card__links">
                        <Link to={entry.archivePath} className="player-profile-card__link">Archive {entry.year}</Link>
                        <Link to={entry.verifyPath} className="player-profile-card__link">Verify</Link>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </article>

            <article className="player-profile-section">
              <header className="player-profile-section__head">
                <div>
                  <p className="player-profile-section__eyebrow">Participation</p>
                  <h2 className="player-profile-section__title">Sports meet entries</h2>
                </div>
              </header>

              <div className="player-profile-section__stack">
                {safeArray(history.participations).length === 0 ? (
                  <div className="player-profile-section__empty">No participation records are linked to this player yet.</div>
                ) : (
                  safeArray(history.participations).map((entry) => (
                    <article key={entry.id} className="player-profile-list-card">
                      <div className="player-profile-list-card__top">
                        <strong>{entry.sport || 'Sport'}</strong>
                        <span className="player-profile-list-card__tag">{entry.year || 'Year'}</span>
                      </div>
                      <p>{entry.event || 'Participation record'}</p>
                      <Link to={entry.archivePath} className="player-profile-card__link">Archive {entry.year}</Link>
                    </article>
                  ))
                )}
              </div>
            </article>
          </section>
        </>
      )}
    </main>
  );
};

export default PlayerProfile;
