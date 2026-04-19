import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
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
  { key: 'stateResultCount', label: 'State Results', Icon: Trophy },
  { key: 'certificateCount', label: 'Certificates', Icon: Award },
  { key: 'latestRosterPlayerCount', label: 'Roster Request', Icon: ClipboardCheck },
  { key: 'performancePlayerCount', label: '3-Year Analysis', Icon: BarChart3 },
  { key: 'playerCount', label: 'Players', Icon: Users },
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
  players: 8,
};

const APPROVAL_STATUS_META = {
  PENDING: { label: 'Pending', className: 'is-pending' },
  APPROVED: { label: 'Approved', className: 'is-approved' },
  REJECTED: { label: 'Rejected', className: 'is-rejected' },
  SUPERSEDED: { label: 'Superseded', className: 'is-superseded' },
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

const formatDate = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleDateString();
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString();
};

const isLikelyImageAsset = (entry) => {
  if (entry?.source === 'gallery') {
    return true;
  }

  const url = String(entry?.url || '').trim().toLowerCase();
  return /\.(avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/.test(url);
};

const buildMedalSummary = (entry) =>
  [
    entry?.medalTally?.Gold ? `G ${entry.medalTally.Gold}` : '',
    entry?.medalTally?.Silver ? `S ${entry.medalTally.Silver}` : '',
    entry?.medalTally?.Bronze ? `B ${entry.medalTally.Bronze}` : '',
  ]
    .filter(Boolean)
    .join(' | ') || 'No medals';

const buildHighlightSummary = (entry) =>
  safeArray(entry?.highlights)
    .map((item) => `${item.year}: ${item.medal} in ${item.label}`)
    .join(' | ') || 'Highlights will appear after results are recorded.';

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
  const approvalWorkflow = sections.approvalWorkflow || {};
  const latestApprovalRequest = approvalWorkflow.latestRequest || null;
  const performanceAnalysis = sections.performanceAnalysis || {};
  const performanceYears = safeArray(performanceAnalysis.years);
  const performanceRows = safeArray(performanceAnalysis.rows);
  const stateResults = safeArray(sections.stateResults);
  const stateGroupResults = safeArray(sections.stateGroupResults);
  const activeEvents = useMemo(
    () =>
      safeArray(sections.events).filter((event) =>
        /active|open|ongoing|live/i.test(String(event.registrationStatus || '').trim())
      ),
    [sections.events]
  );
  const recentArchiveYears = availableYears.slice(0, 3);
  const eventsLink = !links.events || links.events === '/events'
    ? '/sports-celebration?tab=events'
    : links.events;
  const playersLink = links.players || '/players';
  const activeApprovalStatus = latestApprovalRequest
    ? (APPROVAL_STATUS_META[latestApprovalRequest?.status] || APPROVAL_STATUS_META.PENDING)
    : { label: 'No Request', className: 'is-superseded' };
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
        ...stateResults,
        ...stateGroupResults,
        ...safeArray(sections.certificates),
        ...performanceRows,
        ...safeArray(sections.players),
        ...(latestApprovalRequest ? [latestApprovalRequest] : []),
      ].length > 0,
    [highlights.featuredEvents, highlights.topWinners, latestApprovalRequest, performanceRows, sections.certificates, sections.players, stateGroupResults, stateResults, visibleMediaHighlights]
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
            Explore KPT sports history year by year with state results, certificate verification records, player roster
            workflow snapshots, three-year performance analysis, and visual highlights in one public archive.
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
          <section className="archive-page__focus-grid">
            <article className="archive-focus-card archive-focus-card--verification">
              <p className="archive-focus-card__eyebrow">Verification Active</p>
              <h2>{recentArchiveYears.join(' / ') || selectedYear || 'Archive'}</h2>
              <p>
                Certificate verification stays visible for the selected archive year and the latest three archive years.
              </p>
            </article>

            <article className="archive-focus-card archive-focus-card--events">
              <p className="archive-focus-card__eyebrow">Active Events</p>
              <h2>{activeEvents.length}</h2>
              <p>
                {activeEvents.length > 0
                  ? activeEvents.slice(0, 2).map((event) => event.title).join(' | ')
                  : `No active registration events are tagged for ${selectedYear}.`}
              </p>
            </article>

            <article className="archive-focus-card archive-focus-card--workflow">
              <p className="archive-focus-card__eyebrow">Latest Roster Workflow</p>
              <h2>{activeApprovalStatus.label}</h2>
              <p>
                {latestApprovalRequest
                  ? `${latestApprovalRequest.summary?.totalPlayers || 0} players in the latest request by ${latestApprovalRequest.requestedByName || 'creator'}.`
                  : 'No roster request is available yet.'}
              </p>
            </article>

            <article className="archive-focus-card archive-focus-card--profiles">
              <p className="archive-focus-card__eyebrow">Profile Navigation</p>
              <h2>Clear Player Details</h2>
              <p>
                Use the last-three-years analysis table to open a player profile with seasons, results, team records,
                certificates, and participation history.
              </p>
            </article>
          </section>

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
                    <div className="archive-event-card__top">
                      <div className="archive-event-card__pill">{event.sportType || 'Sports'}</div>
                      <div className={`archive-status-pill ${/active|open|ongoing|live/i.test(String(event.registrationStatus || '')) ? 'is-approved' : 'is-superseded'}`}>
                        {event.registrationStatus || 'Planned'}
                      </div>
                    </div>
                    <h3>{event.title}</h3>
                    <p>{event.eventDate || 'Date to be announced'}</p>
                    <span>
                      {[event.venue, event.city, event.level].filter(Boolean).join(' | ') || 'Details will be updated'}
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

            <article className="archive-section archive-section--wide">
              <header className="archive-section__head">
                <div>
                  <p className="archive-section__eyebrow">State Results Table</p>
                  <h2 className="archive-section__title">State individual and team podiums</h2>
                </div>
                <div className="archive-section__head-actions">
                  <span className="archive-section__count">
                    <Trophy size={15} />
                    <span>{summary.stateResultCount || 0} state records</span>
                  </span>
                  <Link to={links.results || '/results'} className="archive-section__link">
                    Open Results
                  </Link>
                </div>
              </header>

              <div className="archive-results-grid">
                <div className="archive-table-card">
                  <div className="archive-table-card__head">
                    <strong>Individual</strong>
                    <span>{stateResults.length} players</span>
                  </div>
                  <div className="archive-table-wrap">
                    <table className="archive-table">
                      <thead>
                        <tr>
                          <th>Player</th>
                          <th>KPM No.</th>
                          <th>Event</th>
                          <th>Branch</th>
                          <th>Medal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stateResults.length === 0 ? (
                          <tr>
                            <td colSpan="5">No state individual results are available for {selectedYear}.</td>
                          </tr>
                        ) : (
                          stateResults.map((result) => (
                            <tr key={result.id}>
                              <td>
                                <div className="archive-table-primary">{result.name}</div>
                              </td>
                              <td>{result.kpmNo || '-'}</td>
                              <td>{result.event || '-'}</td>
                              <td>{result.branch || '-'}</td>
                              <td>
                                <span className="archive-mini-card__badge" style={{ '--archive-badge-color': MEDAL_COLORS[result.medal] || '#2563eb' }}>
                                  {result.medal}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="archive-table-card">
                  <div className="archive-table-card__head">
                    <strong>Team</strong>
                    <span>{stateGroupResults.length} teams</span>
                  </div>
                  <div className="archive-table-wrap">
                    <table className="archive-table">
                      <thead>
                        <tr>
                          <th>Team</th>
                          <th>Event</th>
                          <th>Members</th>
                          <th>Medal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stateGroupResults.length === 0 ? (
                          <tr>
                            <td colSpan="4">No state team results are available for {selectedYear}.</td>
                          </tr>
                        ) : (
                          stateGroupResults.map((result) => (
                            <tr key={result.id}>
                              <td>
                                <div className="archive-table-primary">{result.teamName}</div>
                              </td>
                              <td>{result.event || '-'}</td>
                              <td>{result.members.join(', ') || '-'}</td>
                              <td>
                                <span className="archive-mini-card__badge" style={{ '--archive-badge-color': MEDAL_COLORS[result.medal] || '#2563eb' }}>
                                  {result.medal}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </article>

            <article className="archive-section archive-section--wide">
              <header className="archive-section__head">
                <div>
                  <p className="archive-section__eyebrow">Certificate Verified</p>
                  <h2 className="archive-section__title">Issued certificates for all archived players</h2>
                </div>
                <span className="archive-section__link archive-section__link--muted">
                  Verification Active
                </span>
              </header>

              <div className="archive-table-wrap">
                <table className="archive-table">
                  <thead>
                    <tr>
                      <th>Certificate ID</th>
                      <th>Student Name</th>
                      <th>KPM No.</th>
                      <th>Competition</th>
                      <th>Position</th>
                      <th>Department</th>
                      <th>Issued On</th>
                      <th>Verify</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeArray(sections.certificates).length === 0 ? (
                      <tr>
                        <td colSpan="8">No certificates are available for {selectedYear}.</td>
                      </tr>
                    ) : (
                      safeArray(sections.certificates).map((certificate) => (
                        <tr key={certificate.id}>
                          <td>{certificate.certificateId || '-'}</td>
                          <td>
                            <div className="archive-table-primary">{certificate.name}</div>
                            <div className="archive-table-secondary">{certificate.semester ? `Semester ${certificate.semester}` : certificate.achievement || 'Official KPT Sports certificate'}</div>
                          </td>
                          <td>{certificate.kpmNo || '-'}</td>
                          <td>{certificate.competition || '-'}</td>
                          <td>{certificate.position || '-'}</td>
                          <td>{certificate.department || '-'}</td>
                          <td>{formatDate(certificate.issuedAt)}</td>
                          <td>
                            {certificate.verifyPath ? (
                              <Link to={certificate.verifyPath} className="archive-table-link">
                                Open
                              </Link>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="archive-section archive-section--wide">
              <header className="archive-section__head">
                <div>
                  <p className="archive-section__eyebrow">Approval Workflow</p>
                  <h2 className="archive-section__title">Latest player roster request</h2>
                </div>
                {latestApprovalRequest ? (
                  <span className={`archive-status-pill ${activeApprovalStatus.className}`}>
                    {activeApprovalStatus.label}
                  </span>
                ) : null}
              </header>

              <div className="archive-workflow-stats">
                {[
                  ['Pending', approvalWorkflow.summary?.pending || 0],
                  ['Approved', approvalWorkflow.summary?.approved || 0],
                  ['Rejected', approvalWorkflow.summary?.rejected || 0],
                  ['Superseded', approvalWorkflow.summary?.superseded || 0],
                ].map(([label, value]) => (
                  <article key={label} className="archive-workflow-stat">
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </article>
                ))}
              </div>

              {!latestApprovalRequest ? (
                <div className="archive-section__empty">No player roster requests have been submitted yet.</div>
              ) : (
                <div className="archive-workflow-layout">
                  <div className="archive-workflow-card">
                    <div className="archive-workflow-card__grid">
                      <div>
                        <span className="archive-workflow-card__label">Requested By</span>
                        <strong>{latestApprovalRequest.requestedByName || 'Creator'}</strong>
                        <span>{latestApprovalRequest.requestedByRole || 'creator'}</span>
                      </div>
                      <div>
                        <span className="archive-workflow-card__label">Submitted</span>
                        <strong>{formatDateTime(latestApprovalRequest.createdAt)}</strong>
                        <span>{latestApprovalRequest.selectedYearMatch ? `Includes ${selectedYear}` : 'Showing latest overall request'}</span>
                      </div>
                      <div>
                        <span className="archive-workflow-card__label">Roster Size</span>
                        <strong>{latestApprovalRequest.summary?.totalPlayers || 0} players</strong>
                        <span>{latestApprovalRequest.summary?.totalYears || 0} year blocks</span>
                      </div>
                      <div>
                        <span className="archive-workflow-card__label">Review</span>
                        <strong>{formatDateTime(latestApprovalRequest.reviewedAt)}</strong>
                        <span>{latestApprovalRequest.appliedAt ? `Published ${formatDateTime(latestApprovalRequest.appliedAt)}` : 'Awaiting publish action'}</span>
                      </div>
                    </div>

                    <div className="archive-workflow-card__breakdowns">
                      <div>
                        <h3>Year breakdown</h3>
                        <div className="archive-chip-list">
                          {safeArray(latestApprovalRequest.yearBreakdown).length === 0 ? (
                            <span className="archive-chip">No years</span>
                          ) : (
                            safeArray(latestApprovalRequest.yearBreakdown).map((entry) => (
                              <span key={`${entry.year}-${entry.totalPlayers}`} className="archive-chip">
                                {entry.year}: {entry.totalPlayers}
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      <div>
                        <h3>Branch breakdown</h3>
                        <div className="archive-chip-list">
                          {safeArray(latestApprovalRequest.branchBreakdown).length === 0 ? (
                            <span className="archive-chip">No branches</span>
                          ) : (
                            safeArray(latestApprovalRequest.branchBreakdown).map((entry) => (
                              <span key={`${entry.branch}-${entry.total}`} className="archive-chip">
                                {entry.branch}: {entry.total}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="archive-table-card">
                    <div className="archive-table-card__head">
                      <strong>Roster preview</strong>
                      <span>{safeArray(latestApprovalRequest.rosterPreview).length} rows</span>
                    </div>
                    <div className="archive-table-wrap">
                      <table className="archive-table">
                        <thead>
                          <tr>
                            <th>Year</th>
                            <th>Name</th>
                            <th>Branch</th>
                            <th>Status</th>
                            <th>KPM No.</th>
                            <th>Semester</th>
                          </tr>
                        </thead>
                        <tbody>
                          {safeArray(latestApprovalRequest.rosterPreview).length === 0 ? (
                            <tr>
                              <td colSpan="6">No roster preview rows are available.</td>
                            </tr>
                          ) : (
                            safeArray(latestApprovalRequest.rosterPreview).map((player, index) => (
                              <tr key={`${player.year}-${player.name}-${index}`}>
                                <td>{player.year || '-'}</td>
                                <td>{player.name || '-'}</td>
                                <td>{player.branch || '-'}</td>
                                <td>{player.status || '-'}</td>
                                <td>{player.kpmNo || '-'}</td>
                                <td>{player.semester || '-'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </article>

            <article className="archive-section archive-section--wide">
              <header className="archive-section__head">
                <div>
                  <p className="archive-section__eyebrow">Performance Analysis</p>
                  <h2 className="archive-section__title">Last three years player analysis</h2>
                </div>
                <div className="archive-section__head-actions">
                  <span className="archive-section__count">
                    <BarChart3 size={15} />
                    <span>{performanceYears.join(' / ') || 'No years'}</span>
                  </span>
                </div>
              </header>

              <div className="archive-table-wrap">
                <table className="archive-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Branch</th>
                      <th>KPM No.</th>
                      {performanceYears.map((performanceYear) => (
                        <th key={performanceYear}>{performanceYear}</th>
                      ))}
                      <th>Total</th>
                      <th>Medals</th>
                      <th>Results</th>
                      <th>Highlights</th>
                      <th>Profile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceRows.length === 0 ? (
                      <tr>
                        <td colSpan={performanceYears.length + 8}>No performance analysis rows are available for the last three years.</td>
                      </tr>
                    ) : (
                      performanceRows.map((player) => (
                        <tr key={`${player.profileId || player.name}-${player.kpmNo || 'player'}`}>
                          <td>
                            <div className="archive-table-primary">{player.name}</div>
                            <div className="archive-table-secondary">
                              {safeArray(player.activeYears).join(', ') || 'Archive player'}
                            </div>
                          </td>
                          <td>{player.branch || '-'}</td>
                          <td>{player.kpmNo || '-'}</td>
                          {performanceYears.map((performanceYear) => (
                            <td key={`${player.profileId || player.name}-${performanceYear}`}>
                              {player.pointsByYear?.[performanceYear] ?? 0}
                            </td>
                          ))}
                          <td>
                            <strong>{player.totalPoints ?? 0}</strong>
                          </td>
                          <td>{buildMedalSummary(player)}</td>
                          <td>{(player.individualResultCount || 0) + (player.groupResultCount || 0)}</td>
                          <td>
                            <div className="archive-table-secondary">{buildHighlightSummary(player)}</div>
                          </td>
                          <td>
                            {player.profilePath ? (
                              <Link to={player.profilePath} className="archive-table-link">
                                View Profile
                              </Link>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="archive-section archive-section--wide">
              <header className="archive-section__head">
                <div>
                  <p className="archive-section__eyebrow">Player Archive</p>
                  <h2 className="archive-section__title">Students and participation records</h2>
                </div>
                <div className="archive-section__head-actions">
                  <span className="archive-section__count">
                    <FolderKanban size={15} />
                    <span>{(summary.playerCount || 0) + (summary.participationCount || 0)} tracked records</span>
                  </span>
                  <Link to={playersLink} className="archive-section__link">
                    Open Players
                  </Link>
                </div>
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
