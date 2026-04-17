import { useEffect, useMemo, useState } from 'react';
import AdminLayout from './AdminLayout';
import api from '../../services/api';
import './PlayerApprovals.css';

const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED', 'SUPERSEDED'];

const STATUS_META = {
  PENDING: {
    label: 'Pending',
    className: 'player-approvals__pill player-approvals__pill--pending',
  },
  APPROVED: {
    label: 'Approved',
    className: 'player-approvals__pill player-approvals__pill--approved',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'player-approvals__pill player-approvals__pill--rejected',
  },
  SUPERSEDED: {
    label: 'Superseded',
    className: 'player-approvals__pill player-approvals__pill--superseded',
  },
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString();
};

const flattenPayloadRows = (payload = []) =>
  (payload || []).flatMap((yearData) =>
    (yearData?.players || []).map((player) => ({
      year: Number(yearData?.year || 0),
      name: String(player?.name || '').trim(),
      branch: String(player?.branch || '').trim(),
      status: String(player?.status || 'ACTIVE').trim().toUpperCase(),
      kpmNo: String(player?.kpmNo || '').trim(),
      semester: String(player?.semester || '').trim(),
    }))
  );

const PlayerApprovals = () => {
  const [requests, setRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 12, totalPages: 1 });
  const [summary, setSummary] = useState({ pending: 0, approved: 0, rejected: 0, superseded: 0 });
  const [filters, setFilters] = useState({
    status: 'PENDING',
    search: '',
  });

  const loadRequests = async (page = 1, activeFilters = filters) => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        limit: '12',
        page: String(page),
      });

      if (activeFilters.status) {
        params.set('status', activeFilters.status);
      }

      if (activeFilters.search) {
        params.set('search', activeFilters.search);
      }

      const response = await api.get(`/players/approval-requests?${params.toString()}`);
      const nextRequests = Array.isArray(response?.data?.data) ? response.data.data : [];

      setRequests(nextRequests);
      setSummary(response?.data?.summary || { pending: 0, approved: 0, rejected: 0, superseded: 0 });
      setPagination(response?.data?.pagination || { total: 0, page, limit: 12, totalPages: 1 });

      if (!nextRequests.length) {
        setSelectedRequestId('');
        setSelectedRequest(null);
        return;
      }

      setSelectedRequestId((currentId) => {
        const stillExists = nextRequests.some((request) => request._id === currentId);
        return stillExists ? currentId : nextRequests[0]._id;
      });
    } catch (loadError) {
      console.error('Failed to load player approval requests:', loadError);
      setError(loadError?.response?.data?.message || 'Failed to load player approval requests.');
      setRequests([]);
      setSelectedRequestId('');
      setSelectedRequest(null);
    } finally {
      setLoading(false);
    }
  };

  const loadRequestDetail = async (requestId) => {
    if (!requestId) {
      setSelectedRequest(null);
      return;
    }

    setDetailLoading(true);
    setDetailError('');

    try {
      const response = await api.get(`/players/approval-requests/${requestId}`);
      setSelectedRequest(response.data || null);
    } catch (loadError) {
      console.error('Failed to load player approval request detail:', loadError);
      setDetailError(loadError?.response?.data?.message || 'Failed to load request details.');
      setSelectedRequest(null);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadRequests(1, filters);
  }, []);

  useEffect(() => {
    if (!selectedRequestId) return;
    loadRequestDetail(selectedRequestId);
  }, [selectedRequestId]);

  const selectedRows = useMemo(
    () => flattenPayloadRows(selectedRequest?.payload || []).slice(0, 24),
    [selectedRequest]
  );

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleApplyFilters = () => {
    loadRequests(1, filters);
  };

  const handleResetFilters = () => {
    const nextFilters = { status: 'PENDING', search: '' };
    setFilters(nextFilters);
    loadRequests(1, nextFilters);
  };

  const handleReviewAction = async (action) => {
    if (!selectedRequest?._id) return;

    const isApprove = action === 'approve';
    const reviewNote = window.prompt(
      isApprove
        ? 'Optional review note for approval:'
        : 'Optional review note for rejection:',
      selectedRequest?.reviewNote || ''
    );

    if (reviewNote === null) {
      return;
    }

    setActionLoading(true);
    setDetailError('');

    try {
      const response = await api.patch(
        `/players/approval-requests/${selectedRequest._id}/${isApprove ? 'approve' : 'reject'}`,
        { reviewNote }
      );

      if (response?.data?.request) {
        setSelectedRequest(response.data.request);
      }

      await loadRequests(pagination.page || 1, filters);
    } catch (actionError) {
      console.error(`Failed to ${action} player approval request:`, actionError);
      setDetailError(actionError?.response?.data?.message || `Failed to ${action} request.`);
    } finally {
      setActionLoading(false);
    }
  };

  const activeStatusMeta = STATUS_META[selectedRequest?.status] || STATUS_META.PENDING;

  return (
    <AdminLayout>
      <section className="admin-page player-approvals-page">
        <div className="admin-page__shell player-approvals-page__shell">
          <header className="admin-page__header">
            <div className="admin-page__title-wrap">
              <p className="admin-page__eyebrow">Enterprise Workflow</p>
              <h1 className="admin-page__title">Player Approvals</h1>
              <p className="admin-page__subtitle">
                Review creator roster submissions before they replace the live player directory.
              </p>
            </div>
          </header>

          <div className="player-approvals__stats">
            <article className="player-approvals__stat player-approvals__stat--pending">
              <span className="player-approvals__stat-label">Pending</span>
              <strong className="player-approvals__stat-value">{summary.pending || 0}</strong>
              <span className="player-approvals__stat-copy">Waiting for admin decision</span>
            </article>
            <article className="player-approvals__stat player-approvals__stat--approved">
              <span className="player-approvals__stat-label">Approved</span>
              <strong className="player-approvals__stat-value">{summary.approved || 0}</strong>
              <span className="player-approvals__stat-copy">Applied to the live roster</span>
            </article>
            <article className="player-approvals__stat player-approvals__stat--rejected">
              <span className="player-approvals__stat-label">Rejected</span>
              <strong className="player-approvals__stat-value">{summary.rejected || 0}</strong>
              <span className="player-approvals__stat-copy">Returned without publishing</span>
            </article>
            <article className="player-approvals__stat player-approvals__stat--superseded">
              <span className="player-approvals__stat-label">Superseded</span>
              <strong className="player-approvals__stat-value">{summary.superseded || 0}</strong>
              <span className="player-approvals__stat-copy">Replaced by a newer submission</span>
            </article>
          </div>

          <div className="player-approvals__filters">
            <input
              type="text"
              value={filters.search}
              onChange={(event) => handleFilterChange('search', event.target.value)}
              className="player-approvals__field"
              placeholder="Search creator email or review note"
            />
            <select
              value={filters.status}
              onChange={(event) => handleFilterChange('status', event.target.value)}
              className="player-approvals__field"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {STATUS_META[status].label}
                </option>
              ))}
            </select>
            <div className="player-approvals__filter-actions">
              <button type="button" className="player-approvals__button" onClick={handleApplyFilters}>
                Apply
              </button>
              <button
                type="button"
                className="player-approvals__button player-approvals__button--secondary"
                onClick={handleResetFilters}
              >
                Reset
              </button>
            </div>
          </div>

          {error ? <div className="player-approvals__state player-approvals__state--error">{error}</div> : null}

          <div className="player-approvals__layout">
            <div className="player-approvals__list">
              <div className="player-approvals__panel-head">
                <div>
                  <h2 className="player-approvals__panel-title">Submission Queue</h2>
                  <p className="player-approvals__panel-copy">
                    Showing {requests.length} request{requests.length === 1 ? '' : 's'} on this page.
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="player-approvals__state">Loading approval requests...</div>
              ) : requests.length === 0 ? (
                <div className="player-approvals__state">No player approval requests found.</div>
              ) : (
                <div className="player-approvals__cards">
                  {requests.map((request) => {
                    const statusMeta = STATUS_META[request.status] || STATUS_META.PENDING;
                    return (
                      <button
                        type="button"
                        key={request._id}
                        className={`player-approvals__card ${selectedRequestId === request._id ? 'is-active' : ''}`}
                        onClick={() => setSelectedRequestId(request._id)}
                      >
                        <div className="player-approvals__card-top">
                          <div>
                            <div className="player-approvals__card-title">
                              {request.requestedBy?.name || 'Unknown Creator'}
                            </div>
                            <div className="player-approvals__card-copy">
                              {request.requestedBy?.email || '-'}
                            </div>
                          </div>
                          <span className={statusMeta.className}>{statusMeta.label}</span>
                        </div>
                        <div className="player-approvals__card-grid">
                          <div>
                            <span className="player-approvals__mini-label">Players</span>
                            <strong>{request.summary?.totalPlayers || 0}</strong>
                          </div>
                          <div>
                            <span className="player-approvals__mini-label">Years</span>
                            <strong>{request.summary?.totalYears || 0}</strong>
                          </div>
                          <div>
                            <span className="player-approvals__mini-label">Submitted</span>
                            <strong>{formatDateTime(request.createdAt)}</strong>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="player-approvals__pagination">
                <button
                  type="button"
                  className="player-approvals__button player-approvals__button--secondary"
                  disabled={loading || pagination.page <= 1}
                  onClick={() => loadRequests(Math.max(1, pagination.page - 1), filters)}
                >
                  Previous
                </button>
                <span className="player-approvals__pagination-copy">
                  Page {pagination.page || 1} of {pagination.totalPages || 1}
                </span>
                <button
                  type="button"
                  className="player-approvals__button player-approvals__button--secondary"
                  disabled={loading || (pagination.page || 1) >= (pagination.totalPages || 1)}
                  onClick={() => loadRequests(Math.min(pagination.totalPages || 1, (pagination.page || 1) + 1), filters)}
                >
                  Next
                </button>
              </div>
            </div>

            <div className="player-approvals__detail">
              <div className="player-approvals__panel-head">
                <div>
                  <h2 className="player-approvals__panel-title">Review Detail</h2>
                  <p className="player-approvals__panel-copy">
                    Inspect the submitted roster snapshot before publishing it.
                  </p>
                </div>
                {selectedRequest ? <span className={activeStatusMeta.className}>{activeStatusMeta.label}</span> : null}
              </div>

              {detailError ? <div className="player-approvals__state player-approvals__state--error">{detailError}</div> : null}

              {detailLoading ? (
                <div className="player-approvals__state">Loading request detail...</div>
              ) : !selectedRequest ? (
                <div className="player-approvals__state">Select a request to inspect its roster snapshot.</div>
              ) : (
                <>
                  <div className="player-approvals__detail-grid">
                    <div className="player-approvals__detail-card">
                      <span className="player-approvals__mini-label">Creator</span>
                      <strong>{selectedRequest.requestedBy?.name || 'Unknown Creator'}</strong>
                      <span>{selectedRequest.requestedBy?.email || '-'}</span>
                    </div>
                    <div className="player-approvals__detail-card">
                      <span className="player-approvals__mini-label">Submitted At</span>
                      <strong>{formatDateTime(selectedRequest.createdAt)}</strong>
                      <span>Last updated {formatDateTime(selectedRequest.updatedAt)}</span>
                    </div>
                    <div className="player-approvals__detail-card">
                      <span className="player-approvals__mini-label">Roster Size</span>
                      <strong>{selectedRequest.summary?.totalPlayers || 0} players</strong>
                      <span>{selectedRequest.summary?.totalYears || 0} year blocks</span>
                    </div>
                    <div className="player-approvals__detail-card">
                      <span className="player-approvals__mini-label">Review</span>
                      <strong>{formatDateTime(selectedRequest.reviewedAt)}</strong>
                      <span>{selectedRequest.reviewedBy?.name || 'Not reviewed yet'}</span>
                    </div>
                  </div>

                  {selectedRequest.reviewNote ? (
                    <div className="player-approvals__note">
                      <strong>Review note:</strong> {selectedRequest.reviewNote}
                    </div>
                  ) : null}

                  <div className="player-approvals__summary-block">
                    <div>
                      <h3>Year Breakdown</h3>
                      <div className="player-approvals__chips">
                        {(selectedRequest.summary?.yearBreakdown || []).map((entry) => (
                          <span key={entry.year} className="player-approvals__chip">
                            {entry.year}: {entry.totalPlayers}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3>Branch Breakdown</h3>
                      <div className="player-approvals__chips">
                        {(selectedRequest.summary?.branchBreakdown || []).map((entry) => (
                          <span key={`${entry.branch}-${entry.total}`} className="player-approvals__chip">
                            {entry.branch}: {entry.total}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="player-approvals__table-wrap">
                    <table className="player-approvals__table">
                      <thead>
                        <tr>
                          <th>Year</th>
                          <th>Name</th>
                          <th>Branch</th>
                          <th>Status</th>
                          <th>KPM</th>
                          <th>Semester</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRows.length === 0 ? (
                          <tr>
                            <td colSpan="6">No player preview rows available.</td>
                          </tr>
                        ) : (
                          selectedRows.map((row, index) => (
                            <tr key={`${row.year}-${row.name}-${index}`}>
                              <td>{row.year || '-'}</td>
                              <td>{row.name || '-'}</td>
                              <td>{row.branch || '-'}</td>
                              <td>{row.status || '-'}</td>
                              <td>{row.kpmNo || '-'}</td>
                              <td>{row.semester || '-'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="player-approvals__detail-footer">
                    <span className="player-approvals__pagination-copy">
                      Previewing {selectedRows.length} row{selectedRows.length === 1 ? '' : 's'} from this submission.
                    </span>
                    <div className="player-approvals__filter-actions">
                      <button
                        type="button"
                        className="player-approvals__button player-approvals__button--secondary"
                        disabled={actionLoading || selectedRequest.status !== 'PENDING'}
                        onClick={() => handleReviewAction('reject')}
                      >
                        {actionLoading ? 'Working...' : 'Reject Request'}
                      </button>
                      <button
                        type="button"
                        className="player-approvals__button"
                        disabled={actionLoading || selectedRequest.status !== 'PENDING'}
                        onClick={() => handleReviewAction('approve')}
                      >
                        {actionLoading ? 'Working...' : 'Approve and Publish'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </AdminLayout>
  );
};

export default PlayerApprovals;
