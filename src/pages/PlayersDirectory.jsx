import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Search, Users, CalendarDays, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import './PlayersDirectory.css';

const DEFAULT_LIMIT = 12;
const safeArray = (value) => (Array.isArray(value) ? value : []);

const PlayersDirectory = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [directoryData, setDirectoryData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const search = searchParams.get('search') || '';
  const year = searchParams.get('year') || '';
  const branch = searchParams.get('branch') || '';
  const status = searchParams.get('status') || '';
  const page = Number.parseInt(searchParams.get('page') || '1', 10) || 1;

  useEffect(() => {
    let isActive = true;

    const loadDirectory = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const response = await api.get('/players', {
          params: {
            search: search || undefined,
            year: year || undefined,
            branch: branch || undefined,
            status: status || undefined,
            page,
            limit: DEFAULT_LIMIT,
          },
        });

        if (!isActive) {
          return;
        }

        setDirectoryData(response?.data || null);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setDirectoryData(null);
        setErrorMessage(error?.response?.data?.message || error?.message || 'Failed to load players.');
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadDirectory();

    return () => {
      isActive = false;
    };
  }, [branch, page, search, status, year]);

  const items = safeArray(directoryData?.items);
  const filters = directoryData?.filters || {};
  const pagination = directoryData?.pagination || {};
  const totalLabel = useMemo(() => {
    const totalItems = Number(pagination.totalItems || 0);
    return `${totalItems} player${totalItems === 1 ? '' : 's'}`;
  }, [pagination.totalItems]);

  const updateFilters = (updates = {}) => {
    const next = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      const safeValue = String(value ?? '').trim();
      if (!safeValue || (key === 'page' && safeValue === '1')) {
        next.delete(key);
      } else {
        next.set(key, safeValue);
      }
    });

    if (!Object.prototype.hasOwnProperty.call(updates, 'page')) {
      next.delete('page');
    }

    setSearchParams(next);
  };

  return (
    <main className="players-directory-page">
      <section className="players-directory-page__hero">
        <div className="players-directory-page__hero-copy">
          <p className="players-directory-page__eyebrow">KPT Sports Directory</p>
          <h1 className="players-directory-page__title">Player Directory</h1>
          <p className="players-directory-page__intro">
            Browse KPT Sports players with searchable filters, active-year coverage, branch tracking, and direct links
            into each public profile.
          </p>

          <div className="players-directory-page__hero-actions">
            <Link to="/archive" className="players-directory-page__hero-link">
              Open Archive
            </Link>
            <Link to="/results" className="players-directory-page__hero-link players-directory-page__hero-link--secondary">
              Open Results
            </Link>
          </div>
        </div>

        <aside className="players-directory-page__hero-panel">
          <strong>{totalLabel}</strong>
          <span>Public player profiles ready for archive navigation and profile history.</span>
        </aside>
      </section>

      <section className="players-directory-page__filters">
        <label className="players-directory-page__search">
          <Search size={16} />
          <input
            type="search"
            value={search}
            placeholder="Search by name, branch, or KPM"
            onChange={(event) => updateFilters({ search: event.target.value })}
          />
        </label>

        <select value={year} onChange={(event) => updateFilters({ year: event.target.value })} aria-label="Filter by year">
          <option value="">All years</option>
          {safeArray(filters.availableYears).map((entry) => (
            <option key={entry} value={entry}>{entry}</option>
          ))}
        </select>

        <select value={branch} onChange={(event) => updateFilters({ branch: event.target.value })} aria-label="Filter by branch">
          <option value="">All branches</option>
          {safeArray(filters.availableBranches).map((entry) => (
            <option key={entry} value={entry}>{entry}</option>
          ))}
        </select>

        <select value={status} onChange={(event) => updateFilters({ status: event.target.value })} aria-label="Filter by status">
          <option value="">All status</option>
          {safeArray(filters.availableStatuses).map((entry) => (
            <option key={entry} value={entry}>{entry}</option>
          ))}
        </select>
      </section>

      {isLoading ? (
        <section className="players-directory-page__state">
          <p>Loading player directory...</p>
        </section>
      ) : errorMessage ? (
        <section className="players-directory-page__state players-directory-page__state--error">
          <p>{errorMessage}</p>
        </section>
      ) : items.length === 0 ? (
        <section className="players-directory-page__state">
          <p>No player profiles match the selected filters.</p>
        </section>
      ) : (
        <>
          <section className="players-directory-page__grid">
            {items.map((player) => (
              <Link key={player.id} to={player.profilePath} className="players-directory-card">
                <div className="players-directory-card__top">
                  <strong>{player.name}</strong>
                  <ArrowRight size={16} />
                </div>
                <p>{player.branch || 'KPT Branch'}</p>
                <div className="players-directory-card__meta">
                  <span><Users size={14} /> {player.seasonCount || 0} season{player.seasonCount === 1 ? '' : 's'}</span>
                  <span><CalendarDays size={14} /> {safeArray(player.activeYears).join(', ') || 'Year data pending'}</span>
                  <span><ShieldCheck size={14} /> {player.status || 'ACTIVE'}</span>
                </div>
                <div className="players-directory-card__footer">
                  <span>{[player.kpmNo, player.currentDiplomaYear ? `Year ${player.currentDiplomaYear}` : '', player.semester ? `Sem ${player.semester}` : '']
                    .filter(Boolean)
                    .join(' • ') || 'Profile details available'}</span>
                </div>
              </Link>
            ))}
          </section>

          <section className="players-directory-page__pagination">
            <button
              type="button"
              onClick={() => updateFilters({ page: Math.max(1, page - 1) })}
              disabled={!pagination.hasPreviousPage}
            >
              Previous
            </button>
            <span>
              Page {pagination.page || 1} of {pagination.totalPages || 1}
            </span>
            <button
              type="button"
              onClick={() => updateFilters({ page: (pagination.page || 1) + 1 })}
              disabled={!pagination.hasNextPage}
            >
              Next
            </button>
          </section>
        </>
      )}
    </main>
  );
};

export default PlayersDirectory;
