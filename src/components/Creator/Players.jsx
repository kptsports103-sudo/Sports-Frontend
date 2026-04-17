
import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useAutoSave } from '../../hooks/useAutoSave';
import { FaPlusCircle } from 'react-icons/fa';
import { CheckCircle2, Pencil, Plus, Save, Trash2 } from 'lucide-react';

const REQUEST_STATUS_META = {
  PENDING: {
    label: 'Pending Review',
    background: '#fff7ed',
    color: '#9a3412',
  },
  APPROVED: {
    label: 'Approved',
    background: '#ecfdf3',
    color: '#166534',
  },
  REJECTED: {
    label: 'Rejected',
    background: '#fef2f2',
    color: '#b91c1c',
  },
  SUPERSEDED: {
    label: 'Superseded',
    background: '#eff6ff',
    color: '#1d4ed8',
  },
};

const Players = ({ isStudent = false }) => {
  const FIXED_ROWS_STORAGE_KEY = "playersFixedRows";
  const loadFixedRows = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(FIXED_ROWS_STORAGE_KEY) || "[]");
      return new Set(Array.isArray(saved) ? saved : []);
    } catch {
      return new Set();
    }
  };

  const [data, setData] = useState([]);
  const [selectedYear, setSelectedYear] = useState("all");
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedData, setLastSavedData] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState("idle");
  const [dirtyRows, setDirtyRows] = useState(new Set());
  const [fixedRows, setFixedRows] = useState(() => loadFixedRows());
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [latestRequest, setLatestRequest] = useState(null);
  const [requestFeedLoading, setRequestFeedLoading] = useState(false);
  const [requestFeedError, setRequestFeedError] = useState('');
  const currentYear = new Date().getFullYear();
  const ITEMS_PER_PAGE = 5;

  const isOffline = !navigator.onLine;
  const PLAYER_STATUSES = ["ACTIVE", "COMPLETED", "DROPPED"];
  const normalize = (str) =>
    String(str || '').toLowerCase().replace(/\s+/g, ' ').trim();

  const ensureUniqueYearPlayers = (year, players = []) => {
    const usedMasterIds = new Set();

    return (players || []).map((player) => {
      const nextPlayer = {
        ...player,
        id: player?.id || player?.playerId || crypto.randomUUID(),
        semester: player?.semester || '1',
        kpmNo: player?.kpmNo || '',
        status: player?.status || 'ACTIVE',
        events: Array.isArray(player?.events) ? player.events : [],
      };

      let nextMasterId = String(nextPlayer.masterId || '').trim() || crypto.randomUUID();
      if (usedMasterIds.has(nextMasterId)) {
        nextMasterId = crypto.randomUUID();
      }

      usedMasterIds.add(nextMasterId);
      nextPlayer.masterId = nextMasterId;
      return nextPlayer;
    });
  };

  const getFilteredPlayerRows = (players, query = search) => {
    const normalizedQuery = normalize(query);

    return players
      .map((player, idx) => ({ player, idx }))
      .filter(({ player }) => {
        if (!normalizedQuery) return true;

        return (
          normalize(player?.name).includes(normalizedQuery) ||
          normalize(player?.branch).includes(normalizedQuery)
        );
      });
  };

  const getTotalPagesForPlayers = (players, query = search) =>
    Math.max(1, Math.ceil(getFilteredPlayerRows(players, query).length / ITEMS_PER_PAGE));

  const getUniqueYears = (yearBlocks) =>
    [...new Set(
      (yearBlocks || [])
        .map((item) => Number(item?.year))
        .filter((year) => !Number.isNaN(year))
    )].sort((a, b) => b - a);

  const queueOfflineSave = (payload) => {
    const queue = JSON.parse(localStorage.getItem("offlineQueue") || "[]");
    queue.push(payload);
    localStorage.setItem("offlineQueue", JSON.stringify(queue));
  };

  const formatRequestDateTime = (value) => {
    if (!value) return '-';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString();
  };

  const loadApprovalRequests = async () => {
    if (isStudent) return;

    setRequestFeedLoading(true);
    setRequestFeedError('');

    try {
      const response = await api.get('/players/approval-requests?limit=1');
      const requests = Array.isArray(response?.data?.data) ? response.data.data : [];
      setLatestRequest(requests[0] || null);
    } catch (error) {
      console.error('Error fetching player approval requests:', error);
      setRequestFeedError(error?.response?.data?.message || 'Failed to load approval status.');
      setLatestRequest(null);
    } finally {
      setRequestFeedLoading(false);
    }
  };

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await api.get('/home/players');
        const grouped = res.data;
        const dataArray = Object.keys(grouped).map(year => ({
          year: parseInt(year),
          players: grouped[year].map(p => ({
            ...p,
            id: p.id || p.playerId || crypto.randomUUID(),
            masterId: p.masterId || crypto.randomUUID(),
            semester: p.semester || '1',
            kpmNo: p.kpmNo || '',
            status: p.status || 'ACTIVE',
            events: Array.isArray(p.events) ? p.events : [],
          })),
        }));
        const cleaned = normalizeLoadedPlayers(mergeDuplicatePlayers(dataArray));
        setData(cleaned);
        setDirtyRows(new Set());

        // Auto-select current year or latest
        const years = cleaned.map(d => d.year);
        if (years.includes(currentYear)) {
          setSelectedYear(String(currentYear));
        } else if (years.length > 0) {
          setSelectedYear(String(Math.max(...years)));
        }
      } catch (error) {
        console.error('Error fetching players:', error);
        // Fallback to localStorage if API fails
        const saved = localStorage.getItem("playersData");
        if (saved) {
          const parsed = JSON.parse(saved);
          const withIds = parsed.map(yearData => ({
            ...yearData,
            players: yearData.players.map(p => ({
              ...p,
              id: p.id || p.playerId || crypto.randomUUID(),
              masterId: p.masterId || crypto.randomUUID(),
              semester: p.semester || '1',
              kpmNo: p.kpmNo || '',
              status: p.status || 'ACTIVE',
              events: Array.isArray(p.events) ? p.events : [],
            })),
          }));
          const cleaned = normalizeLoadedPlayers(mergeDuplicatePlayers(withIds));
          setData(cleaned);
          setDirtyRows(new Set());

          const years = cleaned.map(d => d.year);
          if (years.includes(currentYear)) {
            setSelectedYear(String(currentYear));
          } else if (years.length > 0) {
            setSelectedYear(String(Math.max(...years)));
          }
        }
      }
    };
    fetchPlayers();
  }, [currentYear]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadApprovalRequests();
  }, [isStudent]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedYear]);

  useEffect(() => {
    localStorage.setItem(FIXED_ROWS_STORAGE_KEY, JSON.stringify([...fixedRows]));
  }, [FIXED_ROWS_STORAGE_KEY, fixedRows]);

  useEffect(() => {
    const displayedData =
      selectedYear === "all"
        ? [...data].sort((a, b) => b.year - a.year)
        : data.filter((d) => d.year === Number(selectedYear));

    const maxAvailablePage = displayedData.reduce(
      (maxPage, yearData) => Math.max(maxPage, getTotalPagesForPlayers(yearData.players)),
      1
    );

    setCurrentPage((prevPage) => {
      const nextPage = Math.min(Math.max(prevPage, 1), maxAvailablePage);
      return prevPage === nextPage ? prevPage : nextPage;
    });
  }, [data, search, selectedYear]);

  useEffect(() => {
    const syncOfflineQueue = async () => {
      const queue = JSON.parse(localStorage.getItem("offlineQueue") || "[]");
      if (queue.length === 0) return;

      try {
        for (const payload of queue) {
          await api.post('/home/players', { data: payload }, { __requireSecretKey: true });
        }

        localStorage.removeItem("offlineQueue");
        console.log("Offline data synced");
        loadApprovalRequests();
      } catch (error) {
        console.error("Failed to sync offline player queue:", error);
      }
    };

    window.addEventListener("online", syncOfflineQueue);
    return () => window.removeEventListener("online", syncOfflineQueue);
  }, []);

  const addYear = () => {
    const yearInput = prompt("Enter the year to add:");
    if (!yearInput) return;

    const year = parseInt(yearInput);
    if (isNaN(year) || year < 1900 || year > 2100) {
      alert("Please enter a valid year between 1900 and 2100");
      return;
    }

    if (data.some(d => d.year === year)) {
      alert("Year already exists");
      return;
    }

    setData([...data, { year, players: [] }]);
    setDirtyRows(prev => {
      const next = new Set(prev);
      next.add('structure');
      return next;
    });
  };


  const addPlayerRow = (year) => {
    const newData = data.map(d =>
      d.year === year
        ? {
            ...d,
            players: [
              ...d.players,
              {
                id: crypto.randomUUID(),
                masterId: crypto.randomUUID(),
                name: '',
                branch: '',
                diplomaYear: '1',
                semester: '1',
                kpmNo: '',
                status: 'ACTIVE',
                events: [],
              },
            ],
          }
        : d
    );

    const updatedYear = newData.find((d) => d.year === year);
    setCurrentPage(getTotalPagesForPlayers(updatedYear?.players || [], ""));
    setData(newData);
    setDirtyRows(prev => {
      const next = new Set(prev);
      next.add('structure');
      return next;
    });
  };

  // One-click cleanup for existing duplicate identities across years.
  const mergeDuplicatePlayers = (inputData) => {
    const masterMap = {};

    // First pass: build stable identity -> masterId map globally.
    inputData.forEach((yearBlock) => {
      yearBlock.players.forEach((player) => {
        const name = normalize(player.name);
        const branch = normalize(player.branch);
        if (!name || !branch) return;

        const key = `${name}|${branch}`;
        if (!masterMap[key]) {
          masterMap[key] = player.masterId || crypto.randomUUID();
        }
      });
    });

    // Second pass: apply the resolved masterId to each matching row.
    return inputData.map((yearBlock) => ({
      ...yearBlock,
      players: yearBlock.players.map((player) => {
        const name = normalize(player.name);
        const branch = normalize(player.branch);
        if (!name || !branch) return player;

        const key = `${name}|${branch}`;
        return {
          ...player,
          masterId: masterMap[key],
        };
      }),
    }));
  };

  const getSemOptions = (diplomaYear) => {
    const year = String(diplomaYear);

    if (year === "1") return ["1", "2"];
    if (year === "2") return ["3", "4"];
    if (year === "3") return ["5", "6"];

    return ["1"];
  };

  const shouldAutoComplete = (player) =>
    String(player?.diplomaYear || "") === "3" && String(player?.semester || "") === "6";

  const normalizeLoadedPlayers = (inputData) => {
    const mergedByYear = new Map();

    (inputData || []).forEach((yearBlock) => {
      const numericYear = Number(yearBlock?.year);
      if (Number.isNaN(numericYear)) return;

      const existing = mergedByYear.get(numericYear);
      if (!existing) {
        mergedByYear.set(numericYear, {
          year: numericYear,
          players: ensureUniqueYearPlayers(numericYear, Array.isArray(yearBlock?.players) ? yearBlock.players : []),
        });
        return;
      }

      existing.players = ensureUniqueYearPlayers(numericYear, [
        ...existing.players,
        ...(Array.isArray(yearBlock?.players) ? yearBlock.players : []),
      ]);
    });

    return [...mergedByYear.values()].sort((a, b) => b.year - a.year);
  };

  const updatePlayer = (year, playerIndex, field, value) => {
    setData(prev =>
      prev.map(d =>
        d.year === year
          ? (() => {
              const updatedPlayers = d.players.map((p, i) => {
                if (i !== playerIndex) return p;

                let updated = { ...p, [field]: value };
                if (!updated.masterId) {
                  updated.masterId = crypto.randomUUID();
                }

                // Keep one permanent identity across years by matching name+branch.
                if (updated.name?.trim() && updated.branch?.trim()) {
                  const normalizedName = normalize(updated.name);
                  const normalizedBranch = normalize(updated.branch);
                  let existingMasterId = null;

                  prev.forEach((yearBlock) => {
                    if (Number(yearBlock?.year) === Number(year)) return;
                    yearBlock.players.forEach((existing) => {
                      if (
                        existing.id !== updated.id &&
                        normalize(existing.name) === normalizedName &&
                        normalize(existing.branch) === normalizedBranch &&
                        existing.masterId
                      ) {
                        existingMasterId = existing.masterId;
                      }
                    });
                  });

                  if (existingMasterId) {
                    updated.masterId = existingMasterId;
                  }
                }

                // Keep semester aligned with diploma year rules.
                if (field === "diplomaYear") {
                  const allowed = getSemOptions(value);
                  updated.semester = allowed[0];
                }

                if (!PLAYER_STATUSES.includes(String(updated.status || ""))) {
                  updated.status = "ACTIVE";
                }

                // Auto lifecycle close at Diploma 3 + Sem 6
                if (shouldAutoComplete(updated) && updated.status === "ACTIVE") {
                  updated.status = "COMPLETED";
                }

                return updated;
              });

              return { ...d, players: updatedPlayers };
            })()
          : d
      )
    );

    setDirtyRows(prev => {
      const next = new Set(prev);
      next.add(`${year}-${playerIndex}`);
      return next;
    });
  };

  const deleteRow = (year, playerIndex) => {
    const yearData = data.find((d) => d.year === year);
    const targetPlayer = yearData?.players?.[playerIndex];
    const targetKey = targetPlayer
      ? `${year}-${targetPlayer.masterId || targetPlayer.id || playerIndex}`
      : null;
    const newData = data.map(d =>
      d.year === year
        ? { ...d, players: d.players.filter((_, i) => i !== playerIndex) }
        : d
    );

    const updatedYear = newData.find((d) => d.year === year);
    setCurrentPage((prevPage) => Math.min(prevPage, getTotalPagesForPlayers(updatedYear?.players || [])));
    setData(newData);
    if (targetKey) {
      setFixedRows((prev) => {
        const next = new Set(prev);
        next.delete(targetKey);
        return next;
      });
    }
    setDirtyRows(prev => {
      const next = new Set(prev);
      next.add('structure');
      return next;
    });
  };

  // Removed confirmation modal - direct delete with feedback

  const autoSave = async () => {
    if (isSaving) return;

    // Check if there are any valid players to save
    const hasValidPlayers = data.some(yearData =>
      yearData.players.some(player =>
        player.name && player.name.trim() &&
        player.branch && player.branch.trim()
      )
    );

    if (!hasValidPlayers) {
      // No valid players, skip autosave
      setDirtyRows(new Set());
      return;
    }

    setAutoSaveStatus("saving");

    try {
      const saved = await saveAll(false); // Don't show alert for autosave
      setAutoSaveStatus(saved ? "saved" : "error");

      if (saved) {
        setTimeout(() => {
          setAutoSaveStatus("idle");
        }, 1500);
      }
    } catch {
      setAutoSaveStatus("error");
    }
  };

  // Disabled autosave for admin/coach dashboard - saves should be explicit
  // useAutoSave({
  //   enabled: isEditMode,
  //   dirty: dirtyRows,
  //   isSaving,
  //   onSave: autoSave,
  // });

  const deleteYear = (year) => {
    const newData = data.filter(d => d.year !== year);
    setData(newData);
    setFixedRows((prev) => {
      const next = new Set(
        [...prev].filter((rowKey) => !String(rowKey).startsWith(`${year}-`))
      );
      return next;
    });
    setDirtyRows(prev => {
      const next = new Set(prev);
      next.add('structure');
      return next;
    });
  };

  const savePlayerRow = async (year, index, rowKey) => {
    const yearData = data.find(d => d.year === year);
    const player = yearData?.players[index];

    if (!player?.name) {
      alert("Player name is required before saving");
      return;
    }

    try {
      // Backend API currently persists full players payload.
      // So row-save triggers a real backend save for latest dataset.
      const saved = await saveAll(false);
      if (!saved) {
        return;
      }

      alert(`Row ${index + 1} submitted for approval`);
      if (rowKey) {
        setFixedRows((prev) => {
          const next = new Set(prev);
          next.add(rowKey);
          return next;
        });
      }
    } catch (error) {
      console.error("Save row failed:", error);
      alert("Failed to save row");
    }
  };

  const saveAll = async (showFeedback = true) => {
    if (isSaving) return false;

    const normalizeIdentity = (name, branch) =>
      `${normalize(name)}|${normalize(branch)}`;
    const masterIdByIdentity = {};
    data.forEach((yearData) => {
      (yearData.players || []).forEach((player) => {
        const key = normalizeIdentity(player?.name, player?.branch);
        if (!key || key === '|') return;
        if (player?.masterId && !masterIdByIdentity[key]) {
          masterIdByIdentity[key] = player.masterId;
        }
      });
    });

    // Filter out invalid players (missing name or branch)
    const validData = normalizeLoadedPlayers(data.map(yearData => ({
      ...yearData,
      players: yearData.players
        .map(p => ({ ...p }))
        .map((player) => {
          const identityKey = normalizeIdentity(player?.name, player?.branch);
          let masterId = player.masterId || masterIdByIdentity[identityKey] || crypto.randomUUID();
          if (identityKey && identityKey !== '|') {
            masterIdByIdentity[identityKey] = masterId;
          }

          let safeStatus = PLAYER_STATUSES.includes(String(player.status || ""))
            ? String(player.status)
            : "ACTIVE";
          if (String(player.diplomaYear || "") === "3" && String(player.semester || "") === "6" && safeStatus === "ACTIVE") {
            safeStatus = "COMPLETED";
          }

          return {
            ...player,
            masterId,
            semester: player.semester || '1',
            status: safeStatus,
            kpmNo: String(player.kpmNo || '').trim(),
            id: player.id || player.playerId || crypto.randomUUID(),
          };
        })
        .filter(player =>
          player.name && player.name.trim() &&
          player.branch && player.branch.trim()
        )
    })).filter(yearData => yearData.players.length > 0));

    console.log("Original data:", data);
    console.log("Valid data to save:", validData);

    if (validData.length === 0) {
      alert("No valid players to save. Please fill in names and branches for at least one player.");
      return false;
    }

    // Backup last known good state for reliable rollback on this save attempt.
    const previousSnapshot = JSON.parse(JSON.stringify(data));
    setLastSavedData(previousSnapshot);
    setData(validData);
    setIsSaving(true);

    try {
      // Optimistically assume success
      localStorage.setItem("playersData", JSON.stringify(validData));

      // Background API save (backend is source of truth for KPM assignment)
      const saveResponse = await api.post(
        '/home/players',
        { data: validData },
        { __requireSecretKey: true }
      );
      if (saveResponse?.data?.request) {
        setLatestRequest(saveResponse.data.request);
      }

      // Success feedback
      console.log("Player changes submitted successfully");
      if (showFeedback) {
        alert(saveResponse?.data?.message || "Player changes submitted for approval!");
      }
      setLastSavedAt(new Date());
      setDirtyRows(new Set());
      return true;
    } catch (error) {
      console.error("Save failed:", error);
      const backendMessage = error?.response?.data?.message;

      if (isOffline) {
        queueOfflineSave(validData);
        console.warn("Offline: changes queued");
        return true;
      } else {
        // Rollback UI
        setData(previousSnapshot);

        alert(backendMessage || "Submission failed. Changes were reverted.");
        return false;
      }
    } finally {
      setIsSaving(false);
    }
  };

  const srOnlyStyle = {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0
  };

  const getParticipationMap = () => {
    const map = {};

    data.forEach((yearBlock) => {
      yearBlock.players.forEach((player) => {
        if (!player.masterId) return;

        if (!map[player.masterId]) {
          map[player.masterId] = new Set();
        }

        map[player.masterId].add(yearBlock.year);
      });
    });

    return map;
  };

  const participationMap = useMemo(() => getParticipationMap(), [data]);

  const getPlayerStatusBadge = (masterId) => {
    const years = participationMap[masterId]?.size || 0;

    if (years >= 3) {
      return { text: "Senior Player", color: "#28a745" };
    }

    if (years === 2) {
      return { text: "Returning", color: "#102f73" };
    }

    return { text: "New", color: "#6c757d" };
  };

  const latestRequestMeta = REQUEST_STATUS_META[latestRequest?.status] || REQUEST_STATUS_META.PENDING;

  return (
    <div style={styles.page}>
      {/* Header */}
      

      {/* Section Title */}
      <div style={styles.sectionTitle}>KPT Sports Players List</div>

      {/* Year Selector */}
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        <label htmlFor="players-year-selector" style={{ marginRight: '10px', fontWeight: 500 }}>Select Year:</label>
        <select
          id="players-year-selector"
          name="players-year-selector"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          style={{
            padding: '8px 14px',
            borderRadius: '10px',
            border: '1px solid #c7d3e2',
            fontSize: '14px',
            backgroundColor: '#ffffff',
            color: '#111827',
            outline: 'none',
            cursor: 'pointer',
            boxShadow: '0 10px 20px rgba(15, 23, 42, 0.05)',
          }}
        >
          <option value="all" style={{ backgroundColor: '#ffffff', color: '#111827' }}>
            All Years
          </option>
          {getUniqueYears(data).map(year => (
              <option
                key={year}
                value={year}
                style={{ backgroundColor: '#ffffff', color: '#111827' }}
              >
                {year}
              </option>
            ))}
        </select>
      </div>

      {/* Top Buttons */}
      {!isStudent && (
        <div style={styles.topButtons}>
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            style={{ ...styles.editBtn, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            {isEditMode ? <CheckCircle2 size={16} /> : <Pencil size={16} />}
            {isEditMode ? "Done Editing" : "Edit"}
          </button>

          {isEditMode && (
            <button
              onClick={saveAll}
              disabled={isSaving}
              style={{
                ...styles.saveAllBtn,
                opacity: isSaving ? 0.6 : 1,
                cursor: isSaving ? "not-allowed" : "pointer",
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Save size={18} />
              {isSaving ? "Submitting..." : "Save Changes"}
            </button>
          )}

          {isEditMode && (
            <button
              onClick={() => {
                const merged = normalizeLoadedPlayers(mergeDuplicatePlayers(data));
                setData(merged);
                setDirtyRows(prev => {
                  const next = new Set(prev);
                  next.add('structure');
                  return next;
                });
                alert("Duplicate students merged successfully!");
              }}
              style={styles.addBtn}
            >
              Merge Duplicate Students
            </button>
          )}

          {isEditMode && (
            <button
              onClick={addYear}
              style={{
                ...styles.addBtn,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Plus size={16} />
              Add New Year
            </button>
          )}
        </div>
      )}

      {isEditMode && (
        <div style={styles.autoSaveStatus}>
          {autoSaveStatus === "saving" && "Submitting changes..."}
          {autoSaveStatus === "saved" && "Latest submission sent"}
          {autoSaveStatus === "error" && "Auto submission failed"}
        </div>
      )}

      {!isStudent && (
        <div style={styles.requestCard}>
          <div style={styles.requestCardHeader}>
            <div>
              <div style={styles.requestCardEyebrow}>Approval Workflow</div>
              <div style={styles.requestCardTitle}>Latest player roster request</div>
            </div>
            {requestFeedLoading ? (
              <span style={styles.requestMetaText}>Loading...</span>
            ) : latestRequest ? (
              <span
                style={{
                  ...styles.requestBadge,
                  backgroundColor: latestRequestMeta.background,
                  color: latestRequestMeta.color,
                }}
              >
                {latestRequestMeta.label}
              </span>
            ) : null}
          </div>

          {requestFeedError ? (
            <div style={styles.requestError}>{requestFeedError}</div>
          ) : latestRequest ? (
            <>
              <div style={styles.requestMetrics}>
                <div style={styles.requestMetric}>
                  <span style={styles.requestMetricLabel}>Submitted</span>
                  <strong style={styles.requestMetricValue}>{formatRequestDateTime(latestRequest.createdAt)}</strong>
                </div>
                <div style={styles.requestMetric}>
                  <span style={styles.requestMetricLabel}>Players</span>
                  <strong style={styles.requestMetricValue}>{latestRequest.summary?.totalPlayers || 0}</strong>
                </div>
                <div style={styles.requestMetric}>
                  <span style={styles.requestMetricLabel}>Years</span>
                  <strong style={styles.requestMetricValue}>{latestRequest.summary?.totalYears || 0}</strong>
                </div>
                <div style={styles.requestMetric}>
                  <span style={styles.requestMetricLabel}>Reviewed</span>
                  <strong style={styles.requestMetricValue}>{formatRequestDateTime(latestRequest.reviewedAt)}</strong>
                </div>
              </div>
              {latestRequest.reviewNote ? (
                <div style={styles.requestNote}>Review note: {latestRequest.reviewNote}</div>
              ) : latestRequest.status === 'PENDING' ? (
                <div style={styles.requestMetaText}>
                  Your latest roster submission is waiting for admin approval.
                </div>
              ) : null}
            </>
          ) : (
            <div style={styles.requestMetaText}>
              No player roster requests submitted yet. Save changes to create the first approval request.
            </div>
          )}
        </div>
      )}

      {lastSavedAt && (
        <div style={styles.saveTimestamp}>
          Last submitted at{" "}
          {lastSavedAt.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}

      {isSaving && (
        <div style={styles.savingIndicator}>
          Submitting changes for approval...
        </div>
      )}

      {/* Content */}
      {(() => {
        const displayedData =
          selectedYear === "all"
            ? [...data].sort((a, b) => b.year - a.year)
            : data.filter(d => d.year === Number(selectedYear));
        return displayedData.map((yearData) => (
          <div key={yearData.year} style={styles.yearCard}>
            <div
              style={{
                height: "4px",
                width: "100%",
                background: "linear-gradient(to right, #102f73, #f1b90c)",
                borderRadius: "10px",
                marginBottom: "12px",
              }}
            />
            <h3 style={styles.yearTitle}>
              Year: {yearData.year}
              <span style={styles.countBadge}>
                {yearData.players.length} Players
              </span>
            </h3>

            <div style={styles.tableToolbar}>
              <label htmlFor={`player-search-${yearData.year}`} style={srOnlyStyle}>
                Search players by name or branch for {yearData.year}
              </label>
              <input
                id={`player-search-${yearData.year}`}
                name={`player-search-${yearData.year}`}
                type="text"
                placeholder="Search by name or branch..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={styles.searchInput}
                aria-label="Search players by name or branch"
              />

              <div style={styles.resultCount}>
                Showing {(() => {
                  const filteredPlayers = getFilteredPlayerRows(yearData.players);
                  const paginatedPlayers = filteredPlayers.slice(
                    (currentPage - 1) * ITEMS_PER_PAGE,
                    currentPage * ITEMS_PER_PAGE
                  );
                  return `${paginatedPlayers.length} of ${filteredPlayers.length}`;
                })()} players
              </div>
            </div>

            {(() => {
              const filteredPlayers = getFilteredPlayerRows(yearData.players);
              const totalPages = getTotalPagesForPlayers(yearData.players);
              const paginatedPlayers = filteredPlayers.slice(
                (currentPage - 1) * ITEMS_PER_PAGE,
                currentPage * ITEMS_PER_PAGE
              );

              return (
                <>
                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                    <thead style={styles.stickyHeader}>
                      <tr style={styles.headerRow}>
                        <th style={{ width: "60px", padding: "12px 16px", textAlign: "left" }}>SL.NO</th>
                        <th style={{ width: "90px", padding: "12px 16px", textAlign: "left" }}>YEAR</th>
                        <th style={{ padding: "12px 16px", textAlign: "left" }}>PLAYER NAME</th>
                        <th style={{ width: "160px", padding: "12px 16px", textAlign: "left" }}>BRANCH</th>
                        <th style={{ width: "140px", padding: "12px 16px", textAlign: "left" }}>DIPLOMA YEAR</th>
                        <th style={{ width: "120px", padding: "12px 16px", textAlign: "left" }}>SEM</th>
                        <th style={{ width: "140px", padding: "12px 16px", textAlign: "left" }}>KPM NO</th>
                        {!isStudent && <th style={{ width: "100px", padding: "12px 16px", textAlign: "left" }}>ACTIONS</th>}
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedPlayers.length === 0 ? (
                        <tr>
                          <td colSpan={isStudent ? 7 : 8} style={styles.emptyState}>
                            No players found
                          </td>
                        </tr>
                      ) : (
                        paginatedPlayers.map((row, playerIndex) => {
                          const player = row.player;
                          const originalIndex = row.idx;
                          const playerAtIndex = yearData.players[originalIndex];
                          const isEditable = !isStudent && isEditMode;
                          const actionRowKey = `${yearData.year}-${playerAtIndex?.masterId || playerAtIndex?.id || originalIndex}`;
                          const isRowFixed = fixedRows.has(actionRowKey);
                          return (
                            <tr
                              key={`${yearData.year}-${originalIndex}`}
                              style={{
                                ...styles.bodyRow,
                                backgroundColor: playerIndex % 2 === 0 ? "#ffffff" : "#f7faff",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#edf4ff")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = playerIndex % 2 === 0 ? "#ffffff" : "#f7faff")}
                            >
                              <td style={{ padding: "10px 16px" }}>{(currentPage - 1) * ITEMS_PER_PAGE + playerIndex + 1}</td>
                              <td style={{ padding: "10px 16px" }}>{yearData.year}</td>
                              <td style={{ padding: "10px 16px" }}>
                                <label htmlFor={`player-name-${yearData.year}-${originalIndex}`} style={srOnlyStyle}>
                                  Player Name for {yearData.year} Row {playerIndex + 1}
                                </label>
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                  <input
                                    id={`player-name-${yearData.year}-${originalIndex}`}
                                    name={`player-name-${yearData.year}-${originalIndex}`}
                                    type="text"
                                    value={playerAtIndex?.name || ''}
                                    onChange={(e) => updatePlayer(yearData.year, originalIndex, 'name', e.target.value)}
                                    readOnly={!isEditable}
                                    style={{ ...styles.input, backgroundColor: !isEditable ? '#f8fafc' : '#fff' }}
                                    onFocus={(e) => e.target.style.boxShadow = "0 0 0 3px rgba(16,47,115,0.12)"}
                                    onBlur={(e) => e.target.style.boxShadow = "none"}
                                  />
                                  {playerAtIndex?.masterId && (
                                    <span
                                      style={{
                                        fontSize: "11px",
                                        fontWeight: "600",
                                        color: getPlayerStatusBadge(playerAtIndex.masterId).color,
                                      }}
                                    >
                                      {getPlayerStatusBadge(playerAtIndex.masterId).text}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: "10px 16px" }}>
                                <label htmlFor={`player-branch-${yearData.year}-${originalIndex}`} style={srOnlyStyle}>
                                  Player Branch for {yearData.year} Row {playerIndex + 1}
                                </label>
                                <input
                                  id={`player-branch-${yearData.year}-${originalIndex}`}
                                  name={`player-branch-${yearData.year}-${originalIndex}`}
                                  type="text"
                                  value={playerAtIndex?.branch || ''}
                                  onChange={(e) => updatePlayer(yearData.year, originalIndex, 'branch', e.target.value)}
                                  readOnly={!isEditable}
                                  style={{ ...styles.input, backgroundColor: !isEditable ? '#f8fafc' : '#fff' }}
                                  onFocus={(e) => e.target.style.boxShadow = "0 0 0 3px rgba(16,47,115,0.12)"}
                                  onBlur={(e) => e.target.style.boxShadow = "none"}
                                />
                              </td>
                              <td style={{ padding: "10px 16px" }}>
                                <label htmlFor={`player-diploma-${yearData.year}-${originalIndex}`} style={srOnlyStyle}>
                                  Diploma Year for {yearData.year} Row {playerIndex + 1}
                                </label>
                                <select
                                  id={`player-diploma-${yearData.year}-${originalIndex}`}
                                  name={`player-diploma-${yearData.year}-${originalIndex}`}
                                  value={playerAtIndex?.diplomaYear || '1'}
                                  onChange={(e) => updatePlayer(yearData.year, originalIndex, 'diplomaYear', e.target.value)}
                                  disabled={!isEditable}
                                  style={{ ...styles.select, backgroundColor: !isEditable ? '#f8fafc' : '#fff' }}
                                  onFocus={(e) => e.target.style.boxShadow = "0 0 0 3px rgba(16,47,115,0.12)"}
                                  onBlur={(e) => e.target.style.boxShadow = "none"}
                                >
                                  <option>1</option>
                                  <option>2</option>
                                  <option>3</option>
                                </select>
                              </td>
                              <td style={{ padding: "10px 16px" }}>
                                <label htmlFor={`player-semester-${yearData.year}-${originalIndex}`} style={srOnlyStyle}>
                                  Semester for {yearData.year} Row {playerIndex + 1}
                                </label>
                                <select
                                  id={`player-semester-${yearData.year}-${originalIndex}`}
                                  name={`player-semester-${yearData.year}-${originalIndex}`}
                                  value={playerAtIndex?.semester || getSemOptions(playerAtIndex?.diplomaYear)[0]}
                                  onChange={(e) => updatePlayer(yearData.year, originalIndex, 'semester', e.target.value)}
                                  disabled={!isEditable}
                                  style={{ ...styles.select, backgroundColor: !isEditable ? '#f8fafc' : '#fff' }}
                                  onFocus={(e) => e.target.style.boxShadow = "0 0 0 3px rgba(16,47,115,0.12)"}
                                  onBlur={(e) => e.target.style.boxShadow = "none"}
                                >
                                  {getSemOptions(playerAtIndex?.diplomaYear).map((sem) => (
                                    <option key={sem} value={sem}>{sem}</option>
                                  ))}
                                </select>
                              </td>
                              <td style={{ padding: "10px 16px", fontWeight: "bold", color: "#102f73" }}>
                                {playerAtIndex?.kpmNo || "Auto"}
                              </td>
                              {!isStudent && (
                                <td style={styles.actionCell}>
                                  {isEditable && (
                                    isRowFixed ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setFixedRows((prev) => {
                                            const next = new Set(prev);
                                            next.delete(actionRowKey);
                                            return next;
                                          });
                                        }}
                                        style={styles.fixedBtn}
                                        title="Click to edit row"
                                      >
                                        Fixed
                                      </button>
                                    ) : (
                                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                        <button
                                          type="button"
                                          onClick={() => savePlayerRow(yearData.year, originalIndex, actionRowKey)}
                                          style={styles.actionBtn}
                                          title="Save Row"
                                        >
                                          <Save size={18} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            deleteRow(yearData.year, originalIndex);
                                            alert(`Deleted Row ${playerIndex + 1}`);
                                          }}
                                          style={styles.actionBtn}
                                          title="Delete Row"
                                        >
                                          <Trash2 size={18} color="#dc2626" />
                                        </button>
                                      </div>
                                    )
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div style={styles.pagination}>
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                        style={styles.pageBtn}
                      >
                        Prev
                      </button>

                      {[...Array(totalPages)].map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i + 1)}
                          style={{
                            ...styles.pageBtn,
                            backgroundColor: currentPage === i + 1 ? "#102f73" : "#fff",
                            color: currentPage === i + 1 ? "#fff" : "#000",
                          }}
                        >
                          {i + 1}
                        </button>
                      ))}

                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                        style={styles.pageBtn}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              );
            })()}

            {!isStudent && isEditMode && (
              <div style={{ marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  onClick={() => addPlayerRow(yearData.year)}
                  style={{
                    ...styles.addBtn,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <FaPlusCircle size={16} color="#16a34a" aria-hidden="true" />
                  Add Player
                </button>
                <button
                  onClick={() => deleteYear(yearData.year)}
                  style={styles.deleteYearBtn}
                >
                  Delete Year
                </button>
              </div>
            )}
          </div>
        ));
      })()}


      
    </div>
  );
};

const styles = {
  page: {
    minHeight: "100%",
    backgroundColor: "transparent",
    padding: "0",
    boxSizing: "border-box",
    color: "#111827", // Dark professional text
    width: "100%",
    minWidth: 0,
  },

  pageTitle: {
    fontSize: "34px",
    fontWeight: "700",
    marginBottom: "10px",
  },

  sectionTitle: {
    textAlign: "center",
    fontSize: "20px",
    fontWeight: "700",
    marginBottom: "18px",
    color: "#102f73",
    background: "linear-gradient(135deg, #f8fbff, #e9f1ff)",
    border: "1px solid #dbe2ea",
    borderRadius: "18px",
    padding: "14px 18px",
    boxShadow: "0 16px 28px rgba(15, 23, 42, 0.06)",
  },

  yearCard: {
    background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
    borderRadius: "22px",
    border: "1px solid #dbe2ea",
    padding: "22px",
    marginBottom: "28px",
    boxShadow: "0 18px 34px rgba(15, 23, 42, 0.08)",
  },

  yearTitle: {
    marginTop: "20px",
    fontSize: "20px",
    fontWeight: "600",
    color: "#102f73",
  },

  countBadge: {
    marginLeft: "10px",
    backgroundColor: "#fff4c2",
    color: "#805400",
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "700",
  },

  topButtons: {
    display: "flex",
    gap: "10px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },

  stickyHeader: {
    position: "sticky",
    top: 0,
    zIndex: 2,
    background: "linear-gradient(90deg, #102f73, #244b9a)",
  },

  addBtn: {
    background: "linear-gradient(180deg, #ffffff 0%, #f7fbff 100%)",
    color: "#102f73",
    border: "1px solid #dbe2ea",
    padding: "10px 16px",
    fontSize: "15px",
    borderRadius: "12px",
    marginRight: "10px",
    cursor: "pointer",
    fontWeight: "700",
    boxShadow: "0 10px 20px rgba(15, 23, 42, 0.05)",
  },

  saveAllBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "linear-gradient(180deg, #244b9a 0%, #102f73 100%)",
    color: "#ffffff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "700",
    boxShadow: "0 12px 24px rgba(16, 47, 115, 0.18)",
  },

  table: {
    width: "100%",
    backgroundColor: "#ffffff",
    color: "#000",
    borderCollapse: "separate",
    borderSpacing: "0",
    borderRadius: "18px",
    border: "1px solid #dbe2ea",
    overflow: "hidden",
    marginBottom: "30px",
    boxShadow: "0 14px 28px rgba(15, 23, 42, 0.06)",
  },

  tableWrap: {
    width: "100%",
    minWidth: 0,
    overflowX: "auto",
  },

  headerRow: {
    background: "linear-gradient(90deg, #102f73, #244b9a)",
    color: "#ffffff",
    height: "52px",
    fontSize: "13px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },

  bodyRow: {
    height: "56px",
    fontSize: "15px",
    borderBottom: "1px solid #e2e8f0",
    transition: "background-color 0.2s ease",
    display: "table-row",
  },

  input: {
    width: "100%",
    height: "38px",
    padding: "0 12px",
    fontSize: "14px",
    borderRadius: "10px",
    border: "1px solid #c7d3e2",
    outline: "none",
    transition: "border 0.2s, box-shadow 0.2s",
  },

  select: {
    width: "100%",
    height: "38px",
    padding: "0 12px",
    fontSize: "14px",
    borderRadius: "10px",
    border: "1px solid #c7d3e2",
    outline: "none",
    cursor: "pointer",
    transition: "border 0.2s, box-shadow 0.2s",
  },

  actionCell: {
    padding: "10px 16px",
    verticalAlign: "middle",
    textAlign: "center",
  },

  actionBtn: {
    background: "transparent",
    border: "none",
    padding: "4px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.15s ease",
  },

  fixedBtn: {
    border: "1px solid #198754",
    background: "#e8f7ee",
    color: "#198754",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },

  editBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "linear-gradient(180deg, #ffffff 0%, #f7fbff 100%)",
    color: "#102f73",
    border: "1px solid #dbe2ea",
    padding: "10px 16px",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "700",
    boxShadow: "0 10px 20px rgba(15, 23, 42, 0.05)",
  },

  saveBtn: {
    backgroundColor: "#102f73",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    fontSize: "14px",
    borderRadius: "6px",
    marginRight: "8px",
    cursor: "pointer",
  },

  deleteBtn: {
    backgroundColor: "#c23434",
    color: "#fff",
    border: "none",
    padding: "6px 14px",
    fontSize: "13px",
    borderRadius: "20px",
    cursor: "pointer",
  },

  deleteYearBtn: {
    backgroundColor: "transparent",
    color: "#c23434",
    border: "1px solid #c23434",
    padding: "6px 14px",
    fontSize: "13px",
    borderRadius: "20px",
    cursor: "pointer",
  },

  tableToolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    gap: "10px",
    flexWrap: "wrap",
  },

  searchInput: {
    width: "260px",
    height: "36px",
    padding: "0 12px",
    borderRadius: "12px",
    border: "1px solid #c7d3e2",
    fontSize: "14px",
    color: "#000",
    background: "#ffffff",
    boxShadow: "0 8px 18px rgba(15, 23, 42, 0.04)",
  },

  resultCount: {
    fontSize: "13px",
    color: "#526173",
  },

  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "6px",
    marginTop: "14px",
  },

  pageBtn: {
    border: "1px solid #c7d3e2",
    padding: "8px 14px",
    borderRadius: "10px",
    cursor: "pointer",
    background: "#fff",
  },

  emptyState: {
    textAlign: "center",
    padding: "20px",
    fontSize: "14px",
    color: "#526173",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },

  modalBox: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    width: "320px",
    textAlign: "center",
  },

  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "20px",
  },

  dangerBtn: {
    background: "#c23434",
    color: "#fff",
    border: "none",
    padding: "6px 14px",
    borderRadius: "6px",
  },

  autoSaveStatus: {
    fontSize: "13px",
    marginTop: "6px",
    color: "#526173",
  },

  requestCard: {
    marginTop: "18px",
    marginBottom: "10px",
    padding: "18px 20px",
    borderRadius: "18px",
    border: "1px solid #dbe2ea",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
    boxShadow: "0 12px 24px rgba(15, 23, 42, 0.06)",
  },

  requestCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    flexWrap: "wrap",
  },

  requestCardEyebrow: {
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#102f73",
    marginBottom: "6px",
  },

  requestCardTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#102f73",
  },

  requestBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "999px",
    padding: "8px 12px",
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.04em",
  },

  requestMetrics: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "12px",
    marginTop: "16px",
  },

  requestMetric: {
    padding: "14px",
    borderRadius: "14px",
    background: "#ffffff",
    border: "1px solid #dbe2ea",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },

  requestMetricLabel: {
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#6b7280",
  },

  requestMetricValue: {
    fontSize: "16px",
    color: "#102f73",
  },

  requestMetaText: {
    marginTop: "14px",
    fontSize: "13px",
    color: "#526173",
  },

  requestNote: {
    marginTop: "14px",
    padding: "12px 14px",
    borderRadius: "12px",
    background: "#eff6ff",
    color: "#102f73",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  requestError: {
    marginTop: "14px",
    color: "#b91c1c",
    fontSize: "13px",
    fontWeight: "600",
  },

  savingIndicator: {
    fontSize: "13px",
    color: "#102f73",
    marginTop: "8px",
  },

  saveTimestamp: {
    fontSize: "12px",
    color: "#526173",
    marginTop: "4px",
  },

  footer: {
    marginTop: "40px",
    textAlign: "center",
    fontSize: "14px",
    color: "#526173",
  },
};

export default Players;
