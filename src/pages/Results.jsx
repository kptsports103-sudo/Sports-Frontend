import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import OptimizedImage from '../components/OptimizedImage';
import api from '../services/api';
import './Results.css';

const medalPriority = {
  Gold: 1,
  Silver: 2,
  Bronze: 3,
  Participation: 4
};

const INDIVIDUAL_POINTS = {
  Gold: 5,
  Silver: 3,
  Bronze: 1,
  Participation: 0
};

const GROUP_POINTS = {
  Gold: 10,
  Silver: 7,
  Bronze: 4,
  Participation: 0
};

const medalIcon = (medal) => {
  if (medal === 'Gold') return '🥇';
  if (medal === 'Silver') return '🥈';
  if (medal === 'Bronze') return '🥉';
  return '🎖️';
};

const medalColor = (medal) => {
  if (medal === 'Gold') return '#ffd700';
  if (medal === 'Silver') return '#c0c0c0';
  if (medal === 'Bronze') return '#cd7f32';
  return '#2563eb';
};

const palette = {
  bg: 'var(--app-bg)',
  surface: 'var(--app-surface)',
  surfaceAlt: 'var(--app-surface-alt)',
  surfaceMuted: 'var(--app-surface-muted)',
  text: 'var(--app-text)',
  muted: 'var(--app-text-muted)',
  border: 'var(--app-border)',
  shadow: 'var(--app-shadow)',
  accent: 'var(--page-accent)'
};

const cardHoverShadow = '0 18px 36px rgba(15, 23, 42, 0.22)';

const Results = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedYear = String(searchParams.get('year') || '').trim();
  const currentYear = String(new Date().getFullYear());
  const [results, setResults] = useState([]);
  const [groupResults, setGroupResults] = useState([]);
  const [activeImage, setActiveImage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(requestedYear || currentYear);

  useEffect(() => {
    const fetchResultsData = async () => {
      const [resultResponse, groupResponse] = await Promise.allSettled([
        api.get('/results'),
        api.get('/group-results'),
      ]);

      if (resultResponse.status === 'fulfilled') {
        setResults(resultResponse.value?.data || []);
      } else {
        console.error('Failed to fetch individual results:', resultResponse.reason);
        setResults([]);
      }

      if (groupResponse.status === 'fulfilled') {
        setGroupResults(groupResponse.value?.data || []);
      } else {
        console.error('Failed to fetch group results:', groupResponse.reason);
        setGroupResults([]);
      }
    };

    fetchResultsData();
  }, []);

  // Combine and group results by selected year
  const allResults = [...results, ...groupResults];
  const availableYears = Array.from(
    new Set([
      ...allResults.map((r) => Number(r.year)).filter(Boolean)
    ])
  ).sort((a, b) => b - a);

  const resolvedSelectedYear = availableYears.length === 0
    ? String(selectedYear || requestedYear || currentYear)
    : availableYears.includes(Number(selectedYear))
      ? String(selectedYear)
      : requestedYear && availableYears.includes(Number(requestedYear))
        ? requestedYear
        : availableYears.includes(Number(currentYear))
          ? currentYear
          : String(availableYears[0]);

  useEffect(() => {
    if (!requestedYear) {
      return;
    }

    setSelectedYear((currentSelectedYear) => (
      String(currentSelectedYear || '') === requestedYear ? currentSelectedYear : requestedYear
    ));
  }, [requestedYear]);

  useEffect(() => {
    if (availableYears.length === 0) {
      return;
    }

    setSelectedYear((currentSelectedYear) => {
      const normalizedCurrent = String(currentSelectedYear || '').trim();

      if (availableYears.includes(Number(normalizedCurrent))) {
        return normalizedCurrent;
      }

      if (requestedYear && availableYears.includes(Number(requestedYear))) {
        return requestedYear;
      }

      if (availableYears.includes(Number(currentYear))) {
        return currentYear;
      }

      return String(availableYears[0]);
    });
  }, [availableYears, currentYear, requestedYear]);

  useEffect(() => {
    if (availableYears.length === 0) {
      return;
    }

    if (requestedYear === String(resolvedSelectedYear || '')) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    if (resolvedSelectedYear) {
      next.set('year', resolvedSelectedYear);
    } else {
      next.delete('year');
    }
    setSearchParams(next, { replace: true });
  }, [availableYears.length, requestedYear, resolvedSelectedYear, searchParams, setSearchParams]);

  const filteredResults = allResults.filter((result) => String(result.year) === String(resolvedSelectedYear));

  const groupedResults = filteredResults.reduce((acc, result) => {
    const year = result.year || 'Unknown';
    if (!acc[year]) {
      acc[year] = {
        individual: [],
        groups: []
      };
    }

    // Check if it's a group result (has teamName and members array)
    if (result.teamName && result.members) {
      acc[year].groups.push(result);
    } else {
      acc[year].individual.push(result);
    }
    return acc;
  }, {});

  return (

    <div style={{
      padding: '2rem',
      maxWidth: '1200px',
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif',
      minHeight: '100vh',
      color: palette.text,
      background: palette.bg
    }}>

      <section className="results-page__hero">
        <h1>KPT Sports Results</h1>
      </section>

      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <label htmlFor="results-year-filter" style={{ marginRight: '10px', fontWeight: 600, color: palette.text }}>
          Select Year:
        </label>
        <select
          id="results-year-filter"
          name="results-year-filter"
          value={resolvedSelectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            border: `1px solid ${palette.border}`,
            background: palette.surface,
            color: palette.text,
            minWidth: '140px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          {availableYears.length === 0 ? (
            <option value="">No years available</option>
          ) : null}
          {availableYears.map((year) => (
            <option key={year} value={String(year)}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {Object.keys(groupedResults).length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          backgroundColor: palette.surfaceAlt,
          border: `1px solid ${palette.border}`,
          borderRadius: '10px',
          color: palette.muted
        }}>
          <h3>No Results Available</h3>
          <p>Results will be displayed here once they are added by the administrator.</p>
        </div>
      ) : (
        Object.entries(groupedResults)
          .sort(([a], [b]) => b - a) // Sort years in descending order
          .map(([year, yearResults]) => (
            <div key={year} style={{ marginBottom: '3rem' }}>
              <h2 style={{
                fontSize: '1.8rem',
                marginBottom: '1rem',
                color: palette.accent,
                borderBottom: `3px solid ${palette.accent}`,
                paddingBottom: '0.5rem'
              }}>
                Year: {year}
              </h2>

              {/* Individual Results */}
              {yearResults.individual.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{
                    fontSize: '1.3rem',
                    marginBottom: '1rem',
                    color: palette.text,
                    fontWeight: '600'
                  }}>
                    Individual Results
                  </h3>
                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <input
                      id="results-search"
                      name="results-search"
                      type="text"
                      placeholder="Search by Name or Event"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{
                        padding: '10px 14px',
                        width: '280px',
                        borderRadius: 8,
                        border: `1px solid ${palette.border}`,
                        fontSize: 14,
                        color: palette.text,
                        backgroundColor: palette.surface,
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '1.5rem'
                  }}>
                    {[...yearResults.individual]
                      .filter(result =>
                        (result.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (result.event || '').toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .sort((a, b) => (medalPriority[a.medal] || 999) - (medalPriority[b.medal] || 999))
                      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'en', { sensitivity: 'base' }))
                      .map(result => (
                      <div
                        key={result._id}
                        style={{
                          backgroundColor: palette.surface,
                          border: `1px solid ${palette.border}`,
                          borderRadius: '12px',
                          padding: '1.5rem',
                          boxShadow: palette.shadow,
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-5px)';
                          e.currentTarget.style.boxShadow = cardHoverShadow;
                          e.currentTarget.style.borderColor = palette.accent;
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = palette.shadow;
                          e.currentTarget.style.borderColor = palette.border;
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          marginBottom: '1rem'
                        }}>
                          <span style={{
                            fontSize: '2rem',
                            marginRight: '1rem'
                          }}>
                            {medalIcon(result.medal)}
                          </span>
                          <div>
                            <h3 style={{
                              margin: 0,
                              fontSize: '1.2rem',
                              fontWeight: 'bold',
                              color: palette.text
                            }}>
                              {result.name}
                            </h3>
                            <p style={{
                              margin: '0.25rem 0',
                              color: palette.muted,
                              fontSize: '0.9rem'
                            }}>
                              {result.event}
                            </p>
                          </div>
                        </div>

                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: '1rem',
                          borderTop: `1px solid ${palette.border}`
                        }}>
                          <span style={{
                            background: medalColor(result.medal),
                            color: '#fff',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                          }}>
                            {result.medal} Medal
                          </span>

                          {result.imageUrl && (
                            <button
                              onClick={() => setActiveImage(result)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: palette.accent,
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: '500'
                              }}
                            >
                              View Photo
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Group Results */}
              {yearResults.groups.length > 0 && (
                <div>
                  <h3 style={{
                    fontSize: '1.3rem',
                    marginBottom: '1rem',
                    color: palette.text,
                    fontWeight: '600'
                  }}>
                    Team Results
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                    gap: '1.5rem'
                  }}>
                    {yearResults.groups.map(result => (
                      <div
                        key={result._id}
                        style={{
                          backgroundColor: palette.surface,
                          border: `1px solid ${palette.border}`,
                          borderRadius: '12px',
                          padding: '1.5rem',
                          boxShadow: palette.shadow,
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-5px)';
                          e.currentTarget.style.boxShadow = cardHoverShadow;
                          e.currentTarget.style.borderColor = palette.accent;
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = palette.shadow;
                          e.currentTarget.style.borderColor = palette.border;
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          marginBottom: '1rem'
                        }}>
                          <span style={{
                            fontSize: '2rem',
                            marginRight: '1rem'
                          }}>
                            {medalIcon(result.medal)}
                          </span>
                          <div>
                            <h3 style={{
                              margin: 0,
                              fontSize: '1.2rem',
                              fontWeight: 'bold',
                              color: palette.text
                            }}>
                              {result.teamName}
                            </h3>
                            <p style={{
                              margin: '0.25rem 0',
                              color: palette.muted,
                              fontSize: '0.9rem'
                            }}>
                              {result.event}
                            </p>
                          </div>
                        </div>

                        <div style={{
                          marginBottom: '1rem',
                          padding: '0.75rem',
                          backgroundColor: palette.surfaceAlt,
                          border: `1px solid ${palette.border}`,
                          borderRadius: '8px'
                        }}>
                          <p style={{
                            margin: '0 0 0.5rem 0',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            color: palette.text
                          }}>
                            Team Members:
                          </p>
                          <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '0.5rem'
                          }}>
                            {result.members && result.members.map((member, i) => {
                              // Handle both legacy (string) and new (object) formats
                              const memberName = typeof member === 'string' ? member : (member.name || '');
                              return (
                              <span key={i} style={{
                                background: palette.accent,
                                color: '#fff',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '12px',
                                fontSize: '0.8rem',
                                fontWeight: '500'
                              }}>
                                {memberName}
                              </span>
                              );
                            })}
                          </div>
                        </div>

                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: '1rem',
                          borderTop: `1px solid ${palette.border}`
                        }}>
                          <span style={{
                            background: medalColor(result.medal),
                            color: '#fff',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                          }}>
                            {result.medal} Medal
                          </span>

                          {result.imageUrl && (
                            <button
                              onClick={() => setActiveImage(result)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: palette.accent,
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: '500'
                              }}
                            >
                              View Photo
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
      )}

      {activeImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999
          }}
          onClick={() => setActiveImage(null)}
        >
          <div
            style={{
              position: 'relative',
              width: 'min(760px, 90vw)',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: palette.surface,
              border: `1px solid ${palette.border}`,
              padding: '1rem 1rem 1.25rem',
              borderRadius: '12px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <OptimizedImage
              src={activeImage.imageUrl}
              alt={
                activeImage.event ||
                activeImage.eventName ||
                activeImage.teamName ||
                activeImage.name ||
                activeImage.playerName ||
                'Result image'
              }
              width={1280}
              height={960}
              crop="limit"
              loading="eager"
              fetchPriority="high"
              sizes="90vw"
              style={{
                width: '100%',
                maxHeight: '52vh',
                objectFit: 'contain'
              }}
            />
            <div
              style={{
                marginTop: '14px',
                background: palette.surfaceAlt,
                border: `1px solid ${palette.border}`,
                borderRadius: '10px',
                overflow: 'hidden'
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: palette.surfaceMuted }}>
                    <th style={{ padding: '10px', textAlign: 'left', color: palette.text, borderBottom: `1px solid ${palette.border}` }}>Medal</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: palette.text, borderBottom: `1px solid ${palette.border}` }}>Points</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: palette.text, borderBottom: `1px solid ${palette.border}` }}>Year</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '10px', borderBottom: `1px solid ${palette.border}`, color: palette.text }}>{activeImage.medal || '-'}</td>
                    <td style={{ padding: '10px', borderBottom: `1px solid ${palette.border}`, color: palette.text }}>
                      {activeImage.teamName
                        ? (GROUP_POINTS[activeImage.medal] || 0)
                        : (INDIVIDUAL_POINTS[activeImage.medal] || 0)}
                    </td>
                    <td style={{ padding: '10px', borderBottom: `1px solid ${palette.border}`, color: palette.text }}>{activeImage.year || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <button
              onClick={() => setActiveImage(null)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: '#fee2e2',
                color: '#b91c1c',
                border: '1px solid #ef4444',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: 'bold'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

    </div>

  );

};

export default Results;
