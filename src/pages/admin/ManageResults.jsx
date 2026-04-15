import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import activityLogService from '../../services/activityLog.service';
import AdminLayout from './AdminLayout';
import { confirmAction, notify } from '../../utils/notify';
import PageLatestChangeCard from '../../components/PageLatestChangeCard';
import { clearAuthStorage, getAccessToken, getParsedUser } from '../../context/tokenStorage';

const MEDALS = ['Gold', 'Silver', 'Bronze', 'Participation'];
const RESULT_LEVELS = [
  { key: 'state', label: 'State' },
  { key: 'national', label: 'National' },
];

const medalPriority = {
  Gold: 1,
  Silver: 2,
  Bronze: 3,
  Participation: 4
};

const getMedalStyle = (medal, styles) => {
  if (medal === 'Gold') return styles.goldMedal;
  if (medal === 'Silver') return styles.silverMedal;
  if (medal === 'Bronze') return styles.bronzeMedal;
  return styles.participationMedal;
};

const normalizeName = (name) => {
  return (name || '').toLowerCase().trim().replace(/\s+/g, ' ');
};

const normalizeResultLevel = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return RESULT_LEVELS.some((level) => level.key === normalized) ? normalized : 'state';
};

const getResultLevelLabel = (value) => {
  const normalized = normalizeResultLevel(value);
  return RESULT_LEVELS.find((level) => level.key === normalized)?.label || 'State';
};

const normalizeEventLabel = (item) => {
  const label = String(item?.eventName || item?.event_title || item?.event || '').trim();
  return label;
};

const getSemesterOptions = (diplomaYear) => {
  if (String(diplomaYear) === '1') return ['1', '2'];
  if (String(diplomaYear) === '2') return ['3', '4'];
  if (String(diplomaYear) === '3') return ['5', '6'];
  return [];
};

const createEmptyBulkEntry = () => ({
  event: '',
  medal: ''
});

const ensureBulkEntries = (entries) => {
  const safeEntries = Array.isArray(entries)
    ? entries.map((entry) => ({
        event: String(entry?.event || ''),
        medal: String(entry?.medal || '')
      }))
    : [];

  return safeEntries.length ? safeEntries : [createEmptyBulkEntry()];
};

const ManageResults = () => {
  const currentUser = getParsedUser() || {};
  const canDelete = ['admin', 'superadmin'].includes(String(currentUser?.role || '').toLowerCase());

  const currentYear = new Date().getFullYear();
  const [data, setData] = useState([]); // [{ year, results: [] }]
  const [groupData, setGroupData] = useState([]); // [{ year, results: [] }]
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedLevel, setSelectedLevel] = useState('state');
  const [players, setPlayers] = useState([]);
  const [playersById, setPlayersById] = useState({});
  const [playersByYear, setPlayersByYear] = useState({});
  const [bulkRows, setBulkRows] = useState([]);
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [selectedRegistrationId, setSelectedRegistrationId] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [isGroupEditing, setIsGroupEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingGroupId, setEditingGroupId] = useState(null);

  const [form, setForm] = useState({
    name: '',
    playerMasterId: '',
    branch: '',
    kpmNo: '',
    event: '',
    year: '',
    level: 'state',
    medal: '',
    diplomaYear: '',
    imageUrl: ''
  });

  const [groupForm, setGroupForm] = useState({
    teamName: '',
    event: '',
    year: '',
    level: 'state',
    memberIds: [],
    members: [],
    manualMembers: [{ name: '', branch: '', diplomaYear: '', semester: '' }],
    medal: '',
    imageUrl: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [groupMemberSelection, setGroupMemberSelection] = useState({});
  const [playerIntelligence, setPlayerIntelligence] = useState(null);
  const [groupIntelligence, setGroupIntelligence] = useState(null);

  // Check authentication on component mount
  useEffect(() => {
    const token = getAccessToken();
    const user = getParsedUser();

    if (!token || !user) {
      console.error('No authentication found');
      alert('Please log in to access this page');
      window.location.href = '/login';
      return;
    }

    console.log('Authentication found:', { token: token.substring(0, 20) + '...', user });
  }, []);

  /* ================= FETCH ================= */
  useEffect(() => {
    fetchResults();
    fetchGroupResults();
    fetchPlayers();
    fetchEvents();
    fetchRegistrations();
  }, []);

  const fetchResults = async () => {
    try {
      console.log('Fetching results...');
      const res = await api.get('/results');
      console.log('Fetch response:', res.data);

      // group results by year (Players-style)
      const grouped = res.data.reduce((acc, item) => {
        acc[item.year] = acc[item.year] || [];
        acc[item.year].push({
          ...item,
          level: normalizeResultLevel(item.level),
          imageUrl: item.imageUrl || null
        });
        return acc;
      }, {});

      const formatted = Object.keys(grouped).map(year => ({
        year: Number(year),
        results: grouped[year]
      }));

      setData(formatted);
      console.log('Formatted data:', formatted);
    } catch (error) {
      console.error('Failed to fetch results:', error);

      if (error.response?.status === 401) {
        alert('Authentication expired. Please log in again.');
        clearAuthStorage();
        window.location.href = '/login';
      } else {
        alert('Failed to load results. Please try again.');
      }
    }
  };

  const fetchGroupResults = async () => {
    try {
      console.log('Fetching group results...');
      const res = await api.get('/group-results');
      console.log('Group fetch response:', res.data);

      // group results by year
      const grouped = res.data.reduce((acc, item) => {
        acc[item.year] = acc[item.year] || [];
        acc[item.year].push({
          ...item,
          level: normalizeResultLevel(item.level),
          imageUrl: item.imageUrl || null
        });
        return acc;
      }, {});

      const formatted = Object.keys(grouped).map(year => ({
        year: Number(year),
        results: grouped[year]
      }));

      setGroupData(formatted);
      console.log('Formatted group data:', formatted);
    } catch (error) {
      console.error('Failed to fetch group results:', error);
    }
  };

  const fetchPlayers = async () => {
    try {
      const res = await api.get('/home/players?raw=1');
      const grouped = res.data || {};
      const masterMap = {};
      const yearMap = {};

      Object.keys(grouped).forEach(year => {
        const yearKey = String(year);
        yearMap[yearKey] = yearMap[yearKey] || [];

        grouped[year].forEach(p => {
          const masterId = String(p.masterId || p.id || p.playerId || '').trim();
          if (!masterId) return;
          const rowId = String(p.id || p.playerId || masterId).trim();
          const yearNumber = Number(year);
          const rowDiplomaYear = p.diplomaYear || p.currentDiplomaYear || p.baseDiplomaYear || '';
          const rowSemester = p.semester ? String(p.semester) : '';
          const yearPlayer = {
            masterId,
            id: rowId,
            name: p.name || '',
            branch: p.branch || '',
            kpmNo: p.kpmNo || '',
            diplomaYear: rowDiplomaYear,
            semester: rowSemester,
            year: yearNumber
          };
          yearMap[yearKey].push(yearPlayer);

          if (!masterMap[masterId]) {
            masterMap[masterId] = {
              masterId,
              id: masterId,
              name: p.name,
              branch: p.branch,
              kpmNo: p.kpmNo || '',
              diplomaYear: rowDiplomaYear,
              semester: rowSemester,
              _latestYear: Number.isFinite(yearNumber) ? yearNumber : -1,
              aliasIds: new Set()
            };
          }

          if (Number.isFinite(yearNumber) && yearNumber >= masterMap[masterId]._latestYear) {
            masterMap[masterId].name = p.name || masterMap[masterId].name;
            masterMap[masterId].branch = p.branch || masterMap[masterId].branch;
            masterMap[masterId].kpmNo = p.kpmNo || masterMap[masterId].kpmNo;
            masterMap[masterId].diplomaYear = rowDiplomaYear || masterMap[masterId].diplomaYear;
            masterMap[masterId].semester = rowSemester || masterMap[masterId].semester;
            masterMap[masterId]._latestYear = yearNumber;
          }

          if (rowId) {
            masterMap[masterId].aliasIds.add(rowId);
          }
        });
      });

      const uniquePlayers = Object.values(masterMap).map(({ aliasIds, _latestYear, ...p }) => ({
        ...p,
        aliasIds: Array.from(aliasIds)
      }));
      const cleanedYearMap = Object.keys(yearMap).reduce((acc, yearKey) => {
        acc[yearKey] = [...yearMap[yearKey]].sort((a, b) =>
          (a.name || '').localeCompare(b.name || '', 'en', { sensitivity: 'base' })
        );
        return acc;
      }, {});

      const byId = uniquePlayers.reduce((acc, p) => {
        acc[p.masterId] = p;
        (p.aliasIds || []).forEach(aliasId => {
          acc[aliasId] = p;
        });
        return acc;
      }, {});

      setPlayers(uniquePlayers);
      setPlayersById(byId);
      setPlayersByYear(cleanedYearMap);
    } catch (error) {
      console.error('Failed to fetch players:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await api.get('/events');
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const fetchRegistrations = async () => {
    try {
      const res = await api.get('/registrations');
      setRegistrations(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to fetch registrations:', error);
    }
  };

  /* ================= SAVE ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Submitting form:', form);

      const selectedMasterId = String(form.playerMasterId || '').trim();
      if (!selectedMasterId) {
        alert('Please select a player.');
        return;
      }

      if (!playersById[selectedMasterId]) {
        alert('Selected player could not be resolved. Please reselect.');
        return;
      }

      const payload = {
        playerMasterId: selectedMasterId,
        event: form.event,
        year: form.year,
        level: normalizeResultLevel(form.level || selectedLevel),
        medal: form.medal,
        imageUrl: form.imageUrl
      };

      if (editingId) {
        const response = await api.put(`/results/${editingId}`, payload);
        console.log('Update response:', response.data);
      } else {
        const response = await api.post('/results', payload);
        console.log('Create response:', response.data);
      }

      fetchResults();
      notify('Data saved successfully', { type: 'success', position: 'top-center' });
      setIsEditing(false);
      resetForm();
      
      // Log the activity
      await activityLogService.logActivity(
        'Updated Match Results',
        'Results Page',
        editingId ? `Updated result for ${form.event}` : `Created new result for ${form.event}`,
        [
          { field: 'Operation', after: editingId ? 'Update Individual Result' : 'Create Individual Result' },
          { field: 'Player', after: form.name || '-' },
          { field: 'Event', after: form.event || '-' },
          { field: 'Year', after: String(form.year || '-') },
          { field: 'Level', after: getResultLevelLabel(form.level || selectedLevel) },
          { field: 'Medal', after: form.medal || '-' }
        ]
      );
    } catch (error) {
      console.error('Save error:', error);

      let errorMessage = 'Save failed';

      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const data = error.response.data;

        if (status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (status === 403) {
          errorMessage = 'Permission denied. You may not have admin rights.';
        } else if (status === 400) {
          errorMessage = data?.message || 'Invalid data. Please check all fields.';
        } else if (status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = data?.message || `Error ${status}: Failed to save`;
        }
      } else if (error.request) {
        // Network error
        errorMessage = 'Network error. Please check your connection.';
      }

      alert(errorMessage);
    }
  };

  /* ================= HELPERS ================= */
  const startIndividualBulkEntry = () => {
    const yearKey = String(selectedYear || '');
    const yearPlayers = (playersByYear[yearKey] || []).slice();

    if (!yearPlayers.length) {
      alert(`No players found for year ${yearKey || 'selected year'}.`);
      return;
    }

    const rows = yearPlayers.map(player => ({
      playerMasterId: player.masterId,
      name: player.name || '',
      branch: player.branch || '',
      kpmNo: player.kpmNo || '',
      diplomaYear: String(player.diplomaYear || ''),
      year: Number(yearKey),
      level: normalizeResultLevel(selectedLevel),
      entries: [createEmptyBulkEntry()],
      imageUrl: '',
      selected: false,
      status: 'pending'
    }));

    resetForm();
    setEditingId(null);
    setIsGroupEditing(false);
    setIsEditing(true);
    setBulkRows(rows);
  };

  const handleBulkRowChange = (index, key, value) => {
    setBulkRows(prev => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  };

  const handleBulkEntryChange = (rowIndex, entryIndex, key, value) => {
    setBulkRows((prev) =>
      prev.map((row, i) => {
        if (i !== rowIndex) return row;

        const nextEntries = ensureBulkEntries(row.entries).map((entry, j) =>
          j === entryIndex ? { ...entry, [key]: value } : entry
        );

        return {
          ...row,
          entries: nextEntries
        };
      })
    );
  };

  const handleBulkEntryAdd = (rowIndex) => {
    setBulkRows((prev) =>
      prev.map((row, i) => {
        if (i !== rowIndex) return row;
        return {
          ...row,
          entries: [...ensureBulkEntries(row.entries), createEmptyBulkEntry()]
        };
      })
    );
  };

  const handleBulkEntryRemove = (rowIndex, entryIndex) => {
    setBulkRows((prev) =>
      prev.map((row, i) => {
        if (i !== rowIndex) return row;

        const nextEntries = ensureBulkEntries(row.entries).filter((_, j) => j !== entryIndex);
        return {
          ...row,
          entries: nextEntries.length ? nextEntries : [createEmptyBulkEntry()]
        };
      })
    );
  };

  const handleSelectAllBulkRows = (checked) => {
    setBulkRows((prev) => prev.map((row) => ({ ...row, selected: checked })));
  };

  const handleBulkRowDeleteFields = (index) => {
    setBulkRows(prev =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              entries: [createEmptyBulkEntry()],
              imageUrl: '',
              selected: false,
              status: 'pending'
            }
          : row
      )
    );
  };

  const handleBulkRowUnlock = (index) => {
    setBulkRows(prev =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              status: 'pending'
            }
          : row
      )
    );
  };

  const getRowEntries = (row) => {
    const seen = new Set();
    const entries = [];

    ensureBulkEntries(row?.entries).forEach((entry) => {
      const value = String(entry?.event || '').trim();
      const medal = String(entry?.medal || '').trim();
      if (!value || !medal) return;
      const key = value.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      entries.push({ event: value, medal });
    });

    return entries;
  };

  const handleBulkRowSave = async (row, index) => {
    try {
      const entries = getRowEntries(row);
      if (!entries.length) {
        alert('Fill event(s) and medal(s).');
        return;
      }

      await Promise.all(
        entries.map((entry) =>
          api.post('/results', {
            playerMasterId: row.playerMasterId,
            event: entry.event,
            year: row.year,
            level: normalizeResultLevel(row.level || selectedLevel),
            medal: entry.medal,
            imageUrl: row.imageUrl
          })
        )
      );

      notify(`Saved ${entries.length} event(s) for ${row.name}`, { type: 'success', position: 'top-center' });
      fetchResults();
      setBulkRows((prev) =>
        prev.map((r, i) =>
          i === index
            ? {
                ...r,
                status: 'saved',
                selected: false
              }
            : r
        )
      );
    } catch (error) {
      console.error('Row save error:', error);
      alert(error?.response?.data?.message || 'Row save failed');
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    try {
      const pendingRows = (bulkRows || []).filter((row) => row.status !== 'saved');
      const hasSelectedRows = pendingRows.some((row) => !!row.selected);
      const readyRows = pendingRows.filter((row) => {
        if (hasSelectedRows && !row.selected) {
          return false;
        }
        return getRowEntries(row).length > 0;
      });

      if (!readyRows.length) {
        alert(
          hasSelectedRows
            ? 'No selected rows are ready to save. Fill Event and Medal for at least one selected player.'
            : 'No rows are ready to save. Fill Event and Medal for at least one player.'
        );
        return;
      }

      let savedEventCount = 0;
      const failedPlayers = [];
      for (const row of readyRows) {
        const entries = getRowEntries(row);
        try {
          await Promise.all(
            entries.map((entry) =>
              api.post('/results', {
                playerMasterId: row.playerMasterId,
                event: entry.event,
                year: row.year,
                level: normalizeResultLevel(row.level || selectedLevel),
                medal: entry.medal,
                imageUrl: row.imageUrl
              })
            )
          );
          savedEventCount += entries.length;
          setBulkRows((prev) =>
            prev.map((r) =>
              r.playerMasterId === row.playerMasterId
                ? { ...r, status: 'saved', selected: false }
                : r
            )
          );
        } catch (error) {
          failedPlayers.push(row.name || row.playerMasterId);
          console.error('Bulk row failed:', error);
        }
      }

      fetchResults();
      if (savedEventCount > 0) {
        notify(`Saved ${savedEventCount} result event(s)`, { type: 'success', position: 'top-center' });
      }
      if (failedPlayers.length) {
        alert(`Some players failed to save: ${failedPlayers.join(', ')}`);
      }

      await activityLogService.logActivity(
        'Updated Match Results',
        'Results Page',
        `Created ${savedEventCount} result event(s) for year ${selectedYear}`,
        [
          { field: 'Operation', after: 'Bulk Create Individual Results' },
          { field: 'Academic Year', after: String(selectedYear || '-') },
          { field: 'Level', after: getResultLevelLabel(selectedLevel) },
          { field: 'Saved Events', after: String(savedEventCount) },
          { field: 'Failed Players', after: failedPlayers.length ? failedPlayers.slice(0, 5).join(', ') : '0' }
        ]
      );
    } catch (error) {
      console.error('Bulk save error:', error);
      alert(error?.response?.data?.message || 'Bulk save failed');
    }
  };

  const handleEdit = (item) => {
    const matchedPlayer = item.playerMasterId
      ? playersById[item.playerMasterId]
      : item.playerId
      ? playersById[item.playerId]
      : players.find(p => normalizeName(p.name) === normalizeName(item.name));

    setForm({
      name: matchedPlayer?.name || item.name || '',
      playerMasterId: matchedPlayer?.masterId || item.playerMasterId || item.playerId || '',
      branch: matchedPlayer?.branch || item.branch || '',
      kpmNo: matchedPlayer?.kpmNo || '',
      event: item.event || '',
      year: item.year || '',
      level: normalizeResultLevel(item.level),
      medal: item.medal || '',
      diplomaYear: String(matchedPlayer?.diplomaYear || item.diplomaYear || ''),
      imageUrl: item.imageUrl || ''
    });
    setEditingId(item._id);
    setIsEditing(true);
    setBulkRows([]);
  };

  const handleGroupEdit = (item) => {
    const manualNames = (item.members || [])
      .map((member) => {
        if (typeof member === 'string') return member;
        if (member && typeof member === 'object' && !member.playerId) return member.name;
        return null;
      })
      .filter(Boolean);

    setGroupForm({
      ...item,
      level: normalizeResultLevel(item.level),
      memberIds: [],
      members: item.members && Array.isArray(item.members) ? item.members : [],
      manualMembers: (item.members && Array.isArray(item.members) && item.members.length)
        ? item.members.map((member) => {
            if (typeof member === 'string') {
              return { name: member, branch: '', diplomaYear: '', semester: '' };
            }
            return {
              name: member?.name || '',
              branch: member?.branch || '',
              diplomaYear: member?.diplomaYear ? String(member.diplomaYear) : '',
              semester: member?.semester ? String(member.semester) : ''
            };
          })
        : manualNames.length
        ? manualNames.map(name => ({ name, branch: '', diplomaYear: '', semester: '' }))
        : [{ name: '', branch: '', diplomaYear: '', semester: '' }]
    });
    setEditingGroupId(item._id);
    setIsGroupEditing(true);
    setGroupMemberSelection({});
    setSelectedRegistrationId('');
  };

  const getGroupYearPlayers = () => {
    const yearKey = String(groupForm.year || selectedYear || '');
    return (playersByYear[yearKey] || []).slice();
  };

  const handleSelectAllGroupPlayers = (checked) => {
    const yearPlayers = getGroupYearPlayers();
    const next = {};
    yearPlayers.forEach((p) => {
      next[p.masterId] = checked;
    });
    setGroupMemberSelection(next);
  };

  const applySelectedPlayersToTeam = () => {
    const yearPlayers = getGroupYearPlayers();
    const selectedPlayers = yearPlayers.filter((p) => !!groupMemberSelection[p.masterId]);

    if (!selectedPlayers.length) {
      alert('Please select at least one player.');
      return;
    }

    setGroupForm((prev) => ({
      ...prev,
      manualMembers: selectedPlayers.map((p) => ({
        name: p.name || '',
        branch: p.branch || '',
        diplomaYear: String(p.diplomaYear || ''),
        semester: String(p.semester || '')
      }))
    }));
  };

  const applyRegistrationRoster = (registrationId) => {
    const registration = registrations.find((item) => String(item?._id || item?.id || '') === String(registrationId || ''));
    if (!registration) return;

    const roster = Array.isArray(registration.members) ? registration.members : [];
    if (!roster.length) {
      alert('Selected registration does not have roster members.');
      return;
    }

    setSelectedRegistrationId(String(registration?._id || registration?.id || ''));
    setGroupForm((prev) => ({
      ...prev,
      teamName: String(registration.teamName || prev.teamName || registration.teamHeadName || '').trim(),
      event: String(registration.eventName || prev.event || '').trim(),
      year: String(registration.year || roster[0]?.year || prev.year || '').trim(),
      manualMembers: roster.map((member) => ({
        name: String(member?.name || '').trim(),
        branch: String(member?.branch || '').trim(),
        diplomaYear: String(member?.year || '').trim(),
        semester: String(member?.sem || '').trim(),
      })),
    }));
    setGroupMemberSelection({});
  };

  const handleGroupSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Submitting group form:', groupForm);

      const manualRows = Array.isArray(groupForm.manualMembers) ? groupForm.manualMembers : [];
      const manualMembers = manualRows
        .map(row => ({
          name: (row.name || '').trim(),
          branch: (row.branch || '').trim(),
          diplomaYear: (row.diplomaYear || '').toString().trim(),
          semester: (row.semester || '').toString().trim()
        }))
        .filter(row => row.name);

      const manualMembersResolved = manualMembers.map(row => {
        const matched = players.find(p => normalizeName(p.name) === normalizeName(row.name));
        const diplomaYearNum = Number(row.diplomaYear);
        const diplomaYear = [1, 2, 3].includes(diplomaYearNum) ? diplomaYearNum : null;
        const allowedSemesters = getSemesterOptions(diplomaYear);
        let semester = allowedSemesters.includes(String(row.semester || '')) ? String(row.semester) : null;
        if (!semester && matched?.semester && allowedSemesters.includes(String(matched.semester))) {
          semester = String(matched.semester);
        }
        if (matched) {
          return {
            playerMasterId: matched.masterId,
            playerId: matched.id || '',
            name: matched.name,
            branch: matched.branch || row.branch || '',
            diplomaYear: diplomaYear || matched.diplomaYear || null,
            semester
          };
        }
        return {
          playerMasterId: null,
          playerId: null,
          name: row.name,
          branch: row.branch || '',
          diplomaYear: diplomaYear || null,
          semester
        };
      });

      const combinedMembers = [...manualMembersResolved];
      const dedupedMembers = [];
      const seen = new Set();
      combinedMembers.forEach(m => {
        const key = m.playerMasterId
          ? `mid:${m.playerMasterId}`
          : m.playerId
          ? `id:${m.playerId}`
          : `name:${normalizeName(m.name)}`;
        if (seen.has(key)) return;
        seen.add(key);
        dedupedMembers.push(m);
      });

      if (!dedupedMembers.length) {
        alert('Please add at least one member name.');
        return;
      }

      const combinedMemberIds = Array.from(new Set(dedupedMembers.map(m => m.playerId).filter(Boolean)));
      const combinedMemberMasterIds = Array.from(new Set(dedupedMembers.map(m => m.playerMasterId).filter(Boolean)));

      const payload = {
        teamName: groupForm.teamName,
        event: groupForm.event,
        year: groupForm.year,
        level: normalizeResultLevel(groupForm.level || selectedLevel),
        medal: groupForm.medal,
        imageUrl: groupForm.imageUrl,
        members: dedupedMembers,
        memberIds: combinedMemberIds,
        memberMasterIds: combinedMemberMasterIds
      };

      if (editingGroupId) {
        const response = await api.put(`/group-results/${editingGroupId}`, payload);
        console.log('Group update response:', response.data);
      } else {
        const response = await api.post('/group-results', payload);
        console.log('Group create response:', response.data);
      }

      fetchGroupResults();
      notify('Data saved successfully', { type: 'success', position: 'top-center' });
      setIsGroupEditing(false);
      setEditingGroupId(null);
      setGroupForm({ teamName: '', event: '', year: '', level: normalizeResultLevel(selectedLevel), memberIds: [], members: [], manualMembers: [{ name: '', branch: '', diplomaYear: '', semester: '' }], medal: '', imageUrl: '' });
      setSelectedRegistrationId('');
      
      // Log the activity
      await activityLogService.logActivity(
        'Updated Match Results',
        'Results Page',
        editingGroupId ? `Updated group result for ${groupForm.event}` : `Created new group result for ${groupForm.event}`,
        [
          { field: 'Operation', after: editingGroupId ? 'Update Group Result' : 'Create Group Result' },
          { field: 'Team', after: groupForm.teamName || '-' },
          { field: 'Event', after: groupForm.event || '-' },
          { field: 'Year', after: String(groupForm.year || '-') },
          { field: 'Level', after: getResultLevelLabel(groupForm.level || selectedLevel) },
          { field: 'Medal', after: groupForm.medal || '-' },
          { field: 'Members', after: String((groupForm.manualMembers || []).filter((m) => (m?.name || '').trim()).length) }
        ]
      );
    } catch (error) {
      console.error('Group save error:', error);

      let errorMessage = 'Group save failed';

      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        if (status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (status === 403) {
          errorMessage = 'Permission denied. You may not have admin rights.';
        } else if (status === 400) {
          errorMessage = data?.message || 'Invalid data. Please check all fields.';
        } else if (status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = data?.message || `Error ${status}: Failed to save group`;
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.';
      }

      alert(errorMessage);
    }
  };

  const handleGroupDelete = async (id, teamName) => {
    const shouldDelete = await confirmAction('Delete team result?');
    if (!shouldDelete) return;
    try {
      console.log('Deleting group result:', id);
      const response = await api.delete(`/group-results/${id}`);
      console.log('Group delete response:', response.data);
      fetchGroupResults();
      notify(`deleted ${teamName || 'record'}`, { type: 'success', position: 'top-center' });
    } catch (error) {
      console.error('Group delete error:', error);

      let errorMessage = 'Group delete failed';

      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        if (status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (status === 403) {
          errorMessage = 'Permission denied. You may not have admin rights.';
        } else if (status === 404) {
          errorMessage = 'Group record not found.';
        } else {
          errorMessage = data?.message || `Error ${status}: Failed to delete group`;
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.';
      }

      alert(errorMessage);
    }
  };

  const handleDelete = async (id, name) => {
    const shouldDelete = await confirmAction('Delete this record?');
    if (!shouldDelete) return;
    try {
      console.log('Deleting result:', id);
      const response = await api.delete(`/results/${id}`);
      console.log('Delete response:', response.data);
      fetchResults();
      notify(`deleted ${name || 'record'}`, { type: 'success', position: 'top-center' });
    } catch (error) {
      console.error('Delete error:', error);

      let errorMessage = 'Delete failed';

      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        if (status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (status === 403) {
          errorMessage = 'Permission denied. You may not have admin rights.';
        } else if (status === 404) {
          errorMessage = 'Record not found.';
        } else {
          errorMessage = data?.message || `Error ${status}: Failed to delete`;
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.';
      }

      alert(errorMessage);
    }
  };

  const resetForm = () => {
    setForm({ name: '', playerMasterId: '', branch: '', kpmNo: '', event: '', year: '', level: normalizeResultLevel(selectedLevel), medal: '', diplomaYear: '', imageUrl: '' });
    setEditingId(null);
    setBulkRows([]);
  };

  const resolvePlayerIdentity = (item) => {
    if (!item) return null;
    const idCandidates = [item.playerMasterId, item.playerId].filter(Boolean).map(String);

    for (const id of idCandidates) {
      if (playersById[id]) {
        return {
          masterId: playersById[id].masterId || id,
          name: playersById[id].name || item.name || '',
          branch: playersById[id].branch || item.branch || '',
          kpmNo: playersById[id].kpmNo || item.kpmNo || '',
          diplomaYear: playersById[id].diplomaYear || item.diplomaYear || '',
          semester: playersById[id].semester || item.semester || ''
        };
      }
    }

    const byName = players.find((p) => normalizeName(p.name) === normalizeName(item.name));
    if (byName) {
      return {
        masterId: byName.masterId || byName.id || '',
        name: byName.name || item.name || '',
        branch: byName.branch || item.branch || '',
        kpmNo: byName.kpmNo || item.kpmNo || '',
        diplomaYear: byName.diplomaYear || item.diplomaYear || '',
        semester: byName.semester || item.semester || ''
      };
    }

    return {
      masterId: String(item.playerMasterId || item.playerId || ''),
      name: item.name || '',
      branch: item.branch || '',
      kpmNo: item.kpmNo || '',
      diplomaYear: item.diplomaYear || '',
      semester: item.semester || ''
    };
  };

  const handleOpenPlayerIntelligence = (item) => {
    const player = resolvePlayerIdentity(item);
    if (!player || !player.name) return;

    const allResults = data.flatMap((yearBlock) => yearBlock.results || []);
    const matchedResults = allResults
      .filter((row) => {
        const rowMasterId = String(row.playerMasterId || row.playerId || '').trim();
        if (player.masterId && rowMasterId && player.masterId === rowMasterId) return true;
        return normalizeName(row.name) === normalizeName(player.name);
      })
      .sort((a, b) => Number(a.year || 0) - Number(b.year || 0));

    const eventsParticipated = matchedResults.map((row) => ({
      year: Number(row.year || 0),
      event: row.event || '-',
      medal: row.medal || '',
      imageUrl: row.imageUrl || ''
    }));

    const medalSummary = {
      Gold: 0,
      Silver: 0,
      Bronze: 0,
      Participation: 0
    };

    eventsParticipated.forEach((entry) => {
      const medal = String(entry.medal || '').trim();
      if (medalSummary[medal] !== undefined) medalSummary[medal] += 1;
    });

    const performanceScore =
      (medalSummary.Gold * 5) +
      (medalSummary.Silver * 3) +
      (medalSummary.Bronze * 1) +
      (medalSummary.Participation * 0);

    const timeline = Object.keys(playersByYear)
      .map((yearKey) => {
        const profile = (playersByYear[yearKey] || []).find((p) => {
          if (player.masterId && p.masterId && String(p.masterId) === String(player.masterId)) return true;
          return normalizeName(p.name) === normalizeName(player.name);
        });
        if (!profile) return null;
        return {
          year: Number(yearKey),
          diplomaYear: profile.diplomaYear || '',
          semester: profile.semester || '',
          kpmNo: profile.kpmNo || player.kpmNo || ''
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.year - b.year);

    const imageUrl =
      item.imageUrl ||
      matchedResults.find((row) => row.imageUrl)?.imageUrl ||
      '';

    setPlayerIntelligence({
      player,
      imageUrl,
      eventsParticipated,
      medalSummary,
      performanceScore,
      timeline
    });
  };

  const handleOpenGroupIntelligence = (item) => {
    if (!item) return;

    const normalizedTeamName = normalizeName(item.teamName || '');
    const allGroupResults = groupData.flatMap((yearBlock) => yearBlock.results || []);
    const matchedResults = allGroupResults
      .filter((row) => {
        const teamNameMatch = normalizedTeamName && normalizeName(row.teamName) === normalizedTeamName;
        const idMatch = item._id && row._id && String(item._id) === String(row._id);
        return teamNameMatch || idMatch;
      })
      .sort((a, b) => Number(a.year || 0) - Number(b.year || 0));

    const eventsParticipated = matchedResults.map((row) => ({
      year: Number(row.year || 0),
      event: row.event || '-',
      medal: row.medal || ''
    }));

    const medalSummary = {
      Gold: 0,
      Silver: 0,
      Bronze: 0,
      Participation: 0
    };

    eventsParticipated.forEach((entry) => {
      const medal = String(entry.medal || '').trim();
      if (medalSummary[medal] !== undefined) medalSummary[medal] += 1;
    });

    const performanceScore =
      (medalSummary.Gold * 5) +
      (medalSummary.Silver * 3) +
      (medalSummary.Bronze * 1) +
      (medalSummary.Participation * 0);

    const timeline = matchedResults.map((row) => ({
      year: Number(row.year || 0),
      event: row.event || '-',
      medal: row.medal || '-'
    }));

    const imageUrl =
      item.imageUrl ||
      matchedResults.find((row) => row.imageUrl)?.imageUrl ||
      '';

    setGroupIntelligence({
      teamName: item.teamName || 'Team',
      imageUrl,
      eventsParticipated,
      medalSummary,
      performanceScore,
      timeline
    });
  };

  /* ================= FILTERED DATA ================= */
  const availableYears = Array.from(
    new Set([
      ...data.map(d => Number(d.year)).filter(Boolean),
      ...groupData.map(g => Number(g.year)).filter(Boolean),
      ...Object.keys(playersByYear).map((y) => Number(y)).filter(Boolean),
    ])
  ).sort((a, b) => b - a);

  const resolvedAvailableYears = availableYears.length > 0 ? availableYears : [currentYear];

  useEffect(() => {
    if (!resolvedAvailableYears.length) return;

    const normalizedSelectedYear = Number(selectedYear);
    if (!resolvedAvailableYears.includes(normalizedSelectedYear)) {
      setSelectedYear(String(resolvedAvailableYears[0]));
    }
  }, [resolvedAvailableYears, selectedYear]);

  const eventOptions = React.useMemo(() => {
    return Array.from(
      new Set(
        [
          ...events.map((item) => normalizeEventLabel(item)),
          ...data.flatMap((yearBlock) => (yearBlock.results || []).map((item) => String(item?.event || '').trim())),
          ...groupData.flatMap((yearBlock) => (yearBlock.results || []).map((item) => String(item?.event || '').trim())),
        ].filter(Boolean)
      )
    ).sort((left, right) => left.localeCompare(right, 'en', { sensitivity: 'base' }));
  }, [data, events, groupData]);

  const registrationOptions = React.useMemo(() => {
    const eventKey = normalizeName(groupForm.event);
    const yearKey = String(groupForm.year || '').trim();

    return registrations
      .filter((registration) => {
        const registrationEvent = normalizeName(registration?.eventName || '');
        const registrationYear = String(
          registration?.year ||
          registration?.members?.[0]?.year ||
          ''
        ).trim();

        const matchesEvent = !eventKey || registrationEvent === eventKey;
        const matchesYear = !yearKey || registrationYear === yearKey;
        return matchesEvent && matchesYear;
      })
      .sort((left, right) => {
        const leftLabel = `${left?.eventName || ''} ${left?.teamName || left?.teamHeadName || ''}`;
        const rightLabel = `${right?.eventName || ''} ${right?.teamName || right?.teamHeadName || ''}`;
        return leftLabel.localeCompare(rightLabel, 'en', { sensitivity: 'base' });
      });
  }, [groupForm.event, groupForm.year, registrations]);

  const displayedData = data
    .map((yearBlock) => ({
      ...yearBlock,
      results: (yearBlock.results || []).filter((item) => normalizeResultLevel(item.level) === normalizeResultLevel(selectedLevel))
    }))
    .filter(d => d.year === Number(selectedYear) && d.results.length > 0);
  const displayedGroupData = groupData
    .map((yearBlock) => ({
      ...yearBlock,
      results: (yearBlock.results || []).filter((item) => normalizeResultLevel(item.level) === normalizeResultLevel(selectedLevel))
    }))
    .filter(g => g.year === Number(selectedYear) && g.results.length > 0);
  const selectedYearPlayerCount = (playersByYear[String(selectedYear)] || []).length;
  const displayYearBlocks = Array.from(new Set([
    ...displayedData.map((block) => block.year),
    ...displayedGroupData.map((block) => block.year),
  ])).sort((a, b) => b - a);

  /* ================= UI ================= */
  return (
    <AdminLayout>
      <div style={styles.page}>
        <h2 style={styles.title}>🏆 Update Results</h2>
        <p style={styles.activitySubtitle}>Manage results page content</p>
        <PageLatestChangeCard pageName="Results Page" />
        <div style={styles.syncNote}>
          Event names come from Annual Sports Celebration Data Entry. Team results can also load locked rosters from
          Sports Meet Registration so Results and linked winner cards stay aligned.
        </div>
        <datalist id="manage-results-event-options">
          {eventOptions.map((eventName) => (
            <option key={eventName} value={eventName} />
          ))}
        </datalist>

        {/* YEAR SELECT (TOP CENTER like Players) */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <label htmlFor="manage-results-year" style={{ marginRight: '10px', fontWeight: 500 }}>Select Year:</label>
          <select
            id="manage-results-year"
            name="manage-results-year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            style={styles.yearSelect}
          >
            {resolvedAvailableYears
              .map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
          </select>
        </div>
        <div style={styles.yearSummary}>
          Selected year {selectedYear || '-'}: {selectedYearPlayerCount} players available for result entry.
        </div>

        <div style={styles.levelTabs} role="tablist" aria-label="Result level">
          {RESULT_LEVELS.map((level) => {
            const isActive = normalizeResultLevel(selectedLevel) === level.key;
            return (
              <button
                key={level.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedLevel(level.key)}
                style={{
                  ...styles.levelTab,
                  ...(isActive ? styles.levelTabActive : {})
                }}
              >
                {level.label}
              </button>
            );
          })}
        </div>

        {/* ADD / CANCEL */}
        <div style={styles.topActionBar}>
          {!isEditing && !isGroupEditing ? (
            <>
              <button onClick={startIndividualBulkEntry} style={styles.topBtnPrimary}>
                ➕ Individual Result
              </button>
              <button
                onClick={() => {
                  setGroupForm((prev) => ({
                    ...prev,
                    year: selectedYear,
                    level: normalizeResultLevel(selectedLevel)
                  }));
                  setIsGroupEditing(true);
                }}
                style={styles.topBtnPrimary}
              >
                ➕ Team Result
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                resetForm();
                setIsEditing(false);
                setIsGroupEditing(false);
                setEditingGroupId(null);
                setGroupForm({ teamName: '', event: '', year: '', level: normalizeResultLevel(selectedLevel), memberIds: [], members: [], manualMembers: [{ name: '', branch: '', diplomaYear: '', semester: '' }], medal: '', imageUrl: '' });
                setSelectedRegistrationId('');
              }}
              style={styles.topBtnSecondary}
            >
              ❌ Cancel
            </button>
          )}
        </div>

        {!isEditing && !isGroupEditing && displayedData.length === 0 && displayedGroupData.length === 0 ? (
          <div style={styles.activityEmpty}>
            No {getResultLevelLabel(selectedLevel)} results found for year {selectedYear || '-'}. {selectedYearPlayerCount > 0 ? `There are ${selectedYearPlayerCount} players saved for this year. Click Individual Result to load all player rows.` : 'No players are saved for this year yet.'}
          </div>
        ) : null}

        {/* VIEW MODE */}
        {!isEditing && !isGroupEditing &&
          displayYearBlocks.map((year) => {
            const yearBlock = displayedData.find((block) => block.year === year) || { year, results: [] };
            const yearGroupResults = displayedGroupData.find((block) => block.year === year)?.results || [];

            return (
            <div key={yearBlock.year}>
              {/* YEAR BAR */}
              <div style={styles.yearBar} />
              <h3 style={styles.yearTitle}>Year: {yearBlock.year}</h3>

              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <label htmlFor={`manage-results-search-${yearBlock.year}`} style={{ display: 'none' }}>Search by Name or Event</label>
                <input
                  id={`manage-results-search-${yearBlock.year}`}
                  name={`manage-results-search-${yearBlock.year}`}
                  type="text"
                  placeholder="Search by Name or Event"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={styles.searchInput}
                />
              </div>

              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.headerRow}>
                      <th style={styles.headerCell}>Name</th>
                      <th style={styles.headerCell}>Branch</th>
                      <th style={styles.headerCell}>Event</th>
                      <th style={styles.headerCell}>Level</th>
                      <th style={styles.headerCell}>Medal</th>
                      <th style={styles.headerCell}>Image</th>
                      <th style={styles.headerCell}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...yearBlock.results]
                      .filter(item =>
                        (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (item.event || '').toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .sort((a, b) => {
                        const byName = (a.name || '').localeCompare(b.name || '', 'en', { sensitivity: 'base' });
                        if (byName !== 0) return byName;
                        return (medalPriority[a.medal] || 999) - (medalPriority[b.medal] || 999);
                      })
                      .map(item => (
                      <tr
                        key={item._id}
                        style={styles.bodyRow}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8f9ff';
                          e.currentTarget.style.transform = 'scale(1.001)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <td style={{...styles.cell, ...styles.nameCell}}>{item.name}</td>
                        <td style={styles.cell}>{item.branch || '-'}</td>
                        <td style={styles.cell}>
                          <span style={styles.eventBadge}>{item.event}</span>
                        </td>
                        <td style={styles.cell}>{getResultLevelLabel(item.level)}</td>
                        <td style={styles.cell}>
                          <span style={{
                            ...styles.medalBadge,
                            ...getMedalStyle(item.medal, styles)
                          }}>
                            {item.medal}
                          </span>
                        </td>
                        <td style={styles.cell}>
                          {item.imageUrl ? (
                            <a href={item.imageUrl} target="_blank" rel="noreferrer" style={styles.imageLink}>
                              🖼️ View Image
                            </a>
                          ) : (
                            <span style={styles.noImage}>No Image</span>
                          )}
                        </td>
                        <td style={styles.cell}>
                          <div style={styles.leftIconGroup}>
                            <button
                              type="button"
                              style={styles.intelligenceBtn}
                              onClick={() => handleOpenPlayerIntelligence(item)}
                            >
                              Player Intelligence
                            </button>
                            <img
                              src="/Edit button.png"
                              alt="Edit"
                              style={styles.iconButton}
                              onClick={() => handleEdit(item)}
                            />
                            {canDelete ? (
                              <img
                                src="/Delete button.png"
                                alt="Delete"
                                style={styles.iconButton}
                                onClick={() => handleDelete(item._id, item.name)}
                              />
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ================= GROUP RESULTS ================= */}
              <h4 style={{ marginTop: 20, fontSize: 16, fontWeight: 600, color: '#111827' }}>🧑‍🤝‍🧑 Group / Team Results</h4>

              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.headerRow}>
                      <th style={styles.headerCell}>Team</th>
                      <th style={styles.headerCell}>Event</th>
                      <th style={styles.headerCell}>Members</th>
                      <th style={styles.headerCell}>Level</th>
                      <th style={styles.headerCell}>Medal</th>
                      <th style={styles.headerCell}>URL</th>
                      <th style={styles.headerCell}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearGroupResults
                      .map(item => (
                        <tr key={item._id} style={styles.bodyRow}>
                          <td style={styles.cell}>{item.teamName || ''}</td>
                          <td style={styles.cell}>
                            <span style={styles.eventBadge}>{item.event || ''}</span>
                          </td>
                          <td style={styles.cell}>
                            {(() => {
                              // Handle both legacy (string array) and new (object array) formats
                              let memberNames = [];
                              
                              if (item.members && Array.isArray(item.members)) {
                                // New format: array of objects
                                if (typeof item.members[0] === 'object') {
                                  memberNames = item.members.map(m => m.name).filter(Boolean);
                                } else {
                                  // Legacy format: array of strings
                                  memberNames = item.members;
                                }
                              }
                              
                              // Fallback: try memberIds
                              if (memberNames.length === 0 && (item.memberMasterIds || item.memberIds)) {
                                const memberRefs = item.memberMasterIds || item.memberIds || [];
                                memberNames = memberRefs.map(id => playersById[id]?.name).filter(Boolean);
                              }
                              
                              return memberNames.length > 0 ? (
                                <ul style={{ margin: 0, paddingLeft: 18 }}>
                                  {memberNames.map((m, i) => <li key={i}>{m}</li>)}
                                </ul>
                              ) : (
                                <span style={{ color: '#999' }}>No members</span>
                              );
                            })()}
                          </td>
                          <td style={styles.cell}>{getResultLevelLabel(item.level)}</td>
                          <td style={styles.cell}>
                            <span style={{
                              ...styles.medalBadge,
                              ...getMedalStyle(item.medal, styles)
                            }}>
                              {item.medal || ''}
                            </span>
                          </td>
                          <td style={styles.cell}>
                            {item.imageUrl ? (
                              <a href={item.imageUrl} target="_blank" rel="noreferrer" style={styles.imageLink}>
                                View
                              </a>
                            ) : '—'}
                          </td>
                          <td style={styles.cell}>
                            <div style={styles.leftIconGroup}>
                              <button
                                type="button"
                                style={styles.intelligenceBtn}
                                onClick={() => handleOpenGroupIntelligence(item)}
                              >
                                Group Intelligence
                              </button>
                              <img
                                src="/Edit button.png"
                                alt="Edit"
                                style={styles.iconButton}
                                onClick={() => handleGroupEdit(item)}
                              />
                              {canDelete ? (
                                <img
                                  src="/Delete button.png"
                                  alt="Delete"
                                  style={styles.iconButton}
                                  onClick={() => handleGroupDelete(item._id, item.teamName)}
                                />
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
            );
          })}

        {/* INDIVIDUAL EDIT MODE */}
        {playerIntelligence ? (
          <div style={styles.intelligenceOverlay} onClick={() => setPlayerIntelligence(null)}>
            <div style={styles.intelligenceModal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.intelligenceHeader}>
                <h3 style={{ margin: 0 }}>Player Intelligence</h3>
                <button
                  type="button"
                  style={styles.intelligenceClose}
                  onClick={() => setPlayerIntelligence(null)}
                >
                  Close
                </button>
              </div>

              <div style={styles.intelligenceHero}>
                <img
                  src={playerIntelligence.imageUrl || '/default-avatar.png'}
                  alt={playerIntelligence.player.name || 'Player'}
                  style={styles.intelligenceImage}
                />
                <div>
                  <h4 style={{ margin: '0 0 6px', color: '#111827' }}>{playerIntelligence.player.name || '-'}</h4>
                  <p style={{ margin: 0, color: '#4b5563' }}>
                    {playerIntelligence.player.branch || '-'} | KPM: {playerIntelligence.player.kpmNo || '-'}
                  </p>
                </div>
              </div>

              <div style={styles.intelligenceGrid}>
                <div style={styles.intelligenceCard}>
                  <h4 style={styles.intelligenceSectionTitle}>Medal Summary</h4>
                  <p style={styles.intelligenceLine}>Gold: {playerIntelligence.medalSummary.Gold}</p>
                  <p style={styles.intelligenceLine}>Silver: {playerIntelligence.medalSummary.Silver}</p>
                  <p style={styles.intelligenceLine}>Bronze: {playerIntelligence.medalSummary.Bronze}</p>
                  <p style={styles.intelligenceLine}>Participation: {playerIntelligence.medalSummary.Participation}</p>
                </div>

                <div style={styles.intelligenceCard}>
                  <h4 style={styles.intelligenceSectionTitle}>Performance Score</h4>
                  <p style={styles.intelligenceScoreValue}>{playerIntelligence.performanceScore}</p>
                  <p style={{ margin: 0, color: '#4b5563', fontSize: 12 }}>Score = 5*Gold + 3*Silver + 1*Bronze</p>
                </div>
              </div>

              <div style={styles.intelligenceCard}>
                <h4 style={styles.intelligenceSectionTitle}>Events Participated</h4>
                {playerIntelligence.eventsParticipated.length ? (
                  <table style={styles.intelligenceTable}>
                    <thead>
                      <tr>
                        <th style={styles.intelligenceTh}>Year</th>
                        <th style={styles.intelligenceTh}>Event</th>
                        <th style={styles.intelligenceTh}>Medal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playerIntelligence.eventsParticipated.map((entry, idx) => (
                        <tr key={`${entry.year}-${entry.event}-${idx}`}>
                          <td style={styles.intelligenceTd}>{entry.year || '-'}</td>
                          <td style={styles.intelligenceTd}>{entry.event || '-'}</td>
                          <td style={styles.intelligenceTd}>{entry.medal || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ margin: 0, color: '#6b7280' }}>No event records found.</p>
                )}
              </div>

              <div style={styles.intelligenceCard}>
                <h4 style={styles.intelligenceSectionTitle}>Career Timeline</h4>
                {playerIntelligence.timeline.length ? (
                  <table style={styles.intelligenceTable}>
                    <thead>
                      <tr>
                        <th style={styles.intelligenceTh}>Year</th>
                        <th style={styles.intelligenceTh}>Diploma Year</th>
                        <th style={styles.intelligenceTh}>Semester</th>
                        <th style={styles.intelligenceTh}>KPM No</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playerIntelligence.timeline.map((entry) => (
                        <tr key={`timeline-${entry.year}`}>
                          <td style={styles.intelligenceTd}>{entry.year || '-'}</td>
                          <td style={styles.intelligenceTd}>{entry.diplomaYear || '-'}</td>
                          <td style={styles.intelligenceTd}>{entry.semester || '-'}</td>
                          <td style={styles.intelligenceTd}>{entry.kpmNo || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ margin: 0, color: '#6b7280' }}>No timeline records found.</p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {groupIntelligence ? (
          <div style={styles.intelligenceOverlay} onClick={() => setGroupIntelligence(null)}>
            <div style={styles.intelligenceModal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.intelligenceHeader}>
                <h3 style={{ margin: 0 }}>Group Intelligence</h3>
                <button
                  type="button"
                  style={styles.intelligenceClose}
                  onClick={() => setGroupIntelligence(null)}
                >
                  Close
                </button>
              </div>

              <div style={styles.intelligenceHero}>
                <img
                  src={groupIntelligence.imageUrl || '/default-avatar.png'}
                  alt={groupIntelligence.teamName || 'Group'}
                  style={styles.intelligenceImage}
                />
                <div>
                  <h4 style={{ margin: '0 0 6px', color: '#111827' }}>{groupIntelligence.teamName || '-'}</h4>
                  <p style={{ margin: 0, color: '#4b5563' }}>
                    Group / Team Results Intelligence
                  </p>
                </div>
              </div>

              <div style={styles.intelligenceGrid}>
                <div style={styles.intelligenceCard}>
                  <h4 style={styles.intelligenceSectionTitle}>Medal Summary</h4>
                  <p style={styles.intelligenceLine}>Gold: {groupIntelligence.medalSummary.Gold}</p>
                  <p style={styles.intelligenceLine}>Silver: {groupIntelligence.medalSummary.Silver}</p>
                  <p style={styles.intelligenceLine}>Bronze: {groupIntelligence.medalSummary.Bronze}</p>
                  <p style={styles.intelligenceLine}>Participation: {groupIntelligence.medalSummary.Participation}</p>
                </div>

                <div style={styles.intelligenceCard}>
                  <h4 style={styles.intelligenceSectionTitle}>Performance Score</h4>
                  <p style={styles.intelligenceScoreValue}>{groupIntelligence.performanceScore}</p>
                  <p style={{ margin: 0, color: '#4b5563', fontSize: 12 }}>Score = 5*Gold + 3*Silver + 1*Bronze</p>
                </div>
              </div>

              <div style={styles.intelligenceCard}>
                <h4 style={styles.intelligenceSectionTitle}>Events Participated</h4>
                {groupIntelligence.eventsParticipated.length ? (
                  <table style={styles.intelligenceTable}>
                    <thead>
                      <tr>
                        <th style={styles.intelligenceTh}>Year</th>
                        <th style={styles.intelligenceTh}>Event</th>
                        <th style={styles.intelligenceTh}>Medal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupIntelligence.eventsParticipated.map((entry, idx) => (
                        <tr key={`${entry.year}-${entry.event}-${idx}`}>
                          <td style={styles.intelligenceTd}>{entry.year || '-'}</td>
                          <td style={styles.intelligenceTd}>{entry.event || '-'}</td>
                          <td style={styles.intelligenceTd}>{entry.medal || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ margin: 0, color: '#6b7280' }}>No event records found.</p>
                )}
              </div>

            </div>
          </div>
        ) : null}

        {isEditing && !isGroupEditing && (
          editingId ? (
            <form onSubmit={handleSubmit}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.headerRow}>
                    <th style={styles.headerCell}>Player</th>
                    <th style={styles.headerCell}>Name</th>
                    <th style={styles.headerCell}>Branch</th>
                    <th style={styles.headerCell}>KPM No</th>
                    <th style={styles.headerCell}>Level</th>
                    <th style={styles.headerCell}>Event</th>
                    <th style={styles.headerCell}>Year</th>
                    <th style={styles.headerCell}>Level</th>
                    <th style={styles.headerCell}>Diploma Year</th>
                    <th style={styles.headerCell}>Medal</th>
                    <th style={styles.headerCell}>Image URL</th>
                  </tr>
                </thead>
                <tbody>
                    <tr style={styles.bodyRow}>
                      <td style={styles.cell}>
                        <input id="result-player-master-id" name="result-player-master-id" style={styles.input} value={form.playerMasterId || ''} readOnly />
                      </td>
                    <td style={styles.cell}>
                      <input id="result-name" name="result-name" style={styles.input} value={form.name} readOnly />
                    </td>
                    <td style={styles.cell}>
                      <input id="result-branch" name="result-branch" style={styles.input} value={form.branch} readOnly />
                    </td>
                    <td style={styles.cell}>
                      <input id="result-kpm-no" name="result-kpm-no" style={styles.input} value={form.kpmNo} readOnly />
                    </td>
                    <td style={styles.cell}>
                      <input
                        id="result-event"
                        name="result-event"
                        list="manage-results-event-options"
                        style={styles.input}
                        value={form.event}
                        onChange={e => setForm({ ...form, event: e.target.value })}
                        placeholder="Enter or select event"
                        required
                      />
                    </td>
                    <td style={styles.cell}>
                      <input id="result-year" name="result-year" type="number" style={styles.input} value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} required />
                    </td>
                    <td style={styles.cell}>
                      <select id="result-level" name="result-level" style={styles.select} value={normalizeResultLevel(form.level || selectedLevel)} onChange={e => setForm({ ...form, level: e.target.value })} required>
                        {RESULT_LEVELS.map((level) => (
                          <option key={level.key} value={level.key}>{level.label}</option>
                        ))}
                      </select>
                    </td>
                    <td style={styles.cell}>
                      <input id="result-diploma" name="result-diploma" style={styles.input} value={form.diplomaYear} readOnly />
                    </td>
                    <td style={styles.cell}>
                      <select id="result-medal" name="result-medal" style={styles.select} value={form.medal} onChange={e => setForm({ ...form, medal: e.target.value })} required>
                        <option value="">Select Medal</option>
                        {MEDALS.map(m => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </td>
                    <td style={styles.cell}>
                      <input id="result-image" name="result-image" type="text" style={styles.input} value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} />
                    </td>
                  </tr>
                </tbody>
              </table>
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button type="submit" style={{ ...styles.btnSaveWithIcon, background: 'linear-gradient(135deg, #28a745, #218838)' }}>
                  <img src="/Save button.png" alt="Save" style={styles.saveIconLeft} />
                  Save
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleBulkSubmit}>
              <div style={styles.bulkSaveHint}>
                Fill only the players you want to save. Empty rows are ignored. If you tick checkboxes, only selected
                filled rows will be saved.
              </div>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.headerRow}>
                    <th style={styles.headerCell}>
                      <input
                        id="bulk-select-all"
                        name="bulk-select-all"
                        type="checkbox"
                        checked={bulkRows.length > 0 && bulkRows.every((row) => !!row.selected)}
                        onChange={(e) => handleSelectAllBulkRows(e.target.checked)}
                      />
                    </th>
                    <th style={styles.headerCell}>Name</th>
                    <th style={styles.headerCell}>Branch</th>
                    <th style={styles.headerCell}>KPM No</th>
                    <th style={styles.headerCell}>Event</th>
                    <th style={styles.headerCell}>Medal</th>
                    <th style={styles.headerCell}>Image URL</th>
                    <th style={styles.headerCell}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkRows.map((row, idx) => {
                    const rowEntries = ensureBulkEntries(row.entries);

                    return (
                    <tr key={row.playerMasterId} style={styles.bodyRow}>
                      <td style={styles.cell}>
                        <input
                          id={`bulk-selected-${idx}`}
                          name={`bulk-selected-${idx}`}
                          type="checkbox"
                          checked={!!row.selected}
                          onChange={(e) => handleBulkRowChange(idx, 'selected', e.target.checked)}
                        />
                      </td>
                      <td style={styles.cell}><input id={`bulk-name-${idx}`} name={`bulk-name-${idx}`} style={styles.input} value={row.name} readOnly /></td>
                      <td style={styles.cell}><input id={`bulk-branch-${idx}`} name={`bulk-branch-${idx}`} style={styles.input} value={row.branch} readOnly /></td>
                      <td style={styles.cell}><input id={`bulk-kpm-${idx}`} name={`bulk-kpm-${idx}`} style={styles.input} value={row.kpmNo} readOnly /></td>
                      <td style={styles.cell}>
                        <select
                          id={`bulk-level-${idx}`}
                          name={`bulk-level-${idx}`}
                          style={styles.select}
                          value={normalizeResultLevel(row.level || selectedLevel)}
                          onChange={e => handleBulkRowChange(idx, 'level', e.target.value)}
                          disabled={row.status === 'saved'}
                        >
                          {RESULT_LEVELS.map((level) => (
                            <option key={level.key} value={level.key}>{level.label}</option>
                          ))}
                        </select>
                      </td>
                      <td style={styles.cell}>
                        <div style={styles.bulkEntryStack}>
                          {rowEntries.map((entry, eventIndex) => {
                            const isLastEntry = eventIndex === rowEntries.length - 1;

                            return (
                              <div key={`event-${eventIndex}`} style={styles.bulkEntryRow}>
                                <input
                                  id={`bulk-event-${idx}-${eventIndex}`}
                                  name={`bulk-event-${idx}-${eventIndex}`}
                                  list="manage-results-event-options"
                                  style={styles.input}
                                  placeholder={`Select Event ${eventIndex + 1}`}
                                  value={entry.event || ''}
                                  onChange={e => handleBulkEntryChange(idx, eventIndex, 'event', e.target.value)}
                                  disabled={row.status === 'saved'}
                                />
                                <div style={styles.bulkEntryActions}>
                                  {isLastEntry ? (
                                    <button
                                      type="button"
                                      onClick={() => handleBulkEntryAdd(idx)}
                                      style={{ ...styles.bulkEntryButton, ...styles.bulkEntryAddButton }}
                                      disabled={row.status === 'saved'}
                                    >
                                      Add Event
                                    </button>
                                  ) : <span style={styles.bulkEntrySpacer} />}
                                  {rowEntries.length > 1 ? (
                                    <button
                                      type="button"
                                      onClick={() => handleBulkEntryRemove(idx, eventIndex)}
                                      style={{ ...styles.bulkEntryButton, ...styles.bulkEntryRemoveButton }}
                                      disabled={row.status === 'saved'}
                                    >
                                      Remove
                                    </button>
                                  ) : <span style={styles.bulkEntrySpacer} />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td style={styles.cell}>
                        <div style={styles.bulkEntryStack}>
                          {rowEntries.map((entry, medalIndex) => (
                            <select
                              key={medalIndex}
                              id={`bulk-medal-${idx}-${medalIndex}`}
                              name={`bulk-medal-${idx}-${medalIndex}`}
                              style={styles.select}
                              value={entry.medal || ''}
                              onChange={e => handleBulkEntryChange(idx, medalIndex, 'medal', e.target.value)}
                              disabled={row.status === 'saved'}
                            >
                              <option value="">{`Select Medal ${medalIndex + 1}`}</option>
                              {MEDALS.map(m => (
                                <option key={m}>{m}</option>
                              ))}
                            </select>
                          ))}
                        </div>
                      </td>
                      <td style={styles.cell}>
                        <input
                          id={`bulk-image-url-${idx}`}
                          name={`bulk-image-url-${idx}`}
                          style={styles.input}
                          value={row.imageUrl}
                          onChange={e => handleBulkRowChange(idx, 'imageUrl', e.target.value)}
                          placeholder="Image URL"
                          disabled={row.status === 'saved'}
                        />
                      </td>
                      <td style={styles.cell}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                          {row.status === 'saved' ? (
                            <button
                              type="button"
                              onClick={() => handleBulkRowUnlock(idx)}
                              style={{
                                ...styles.btnSecondary,
                                minWidth: 96,
                                padding: '8px 10px',
                                whiteSpace: 'nowrap',
                                background: '#198754',
                                borderColor: '#198754'
                              }}
                            >
                              Saved
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleBulkRowSave(row, idx)}
                                style={{
                                  ...styles.btnSecondary,
                                  minWidth: 96,
                                  padding: '8px 10px',
                                  whiteSpace: 'nowrap',
                                  background: '#198754',
                                  borderColor: '#198754'
                                }}
                              >
                                Save Row
                              </button>
                              <button
                                type="button"
                                onClick={() => handleBulkRowDeleteFields(idx)}
                                style={{
                                  ...styles.btnSecondary,
                                  minWidth: 96,
                                  padding: '8px 10px',
                                  whiteSpace: 'nowrap',
                                  background: '#dc3545',
                                  borderColor: '#dc3545',
                                  color: '#fff'
                                }}
                              >
                                Delete Row
                              </button>
                            </>
                          )}
                        </div>
                        <span
                          style={{
                            display: 'inline-block',
                            marginTop: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            color: row.status === 'saved' ? '#198754' : '#6b7280'
                          }}
                        >
                          {row.status === 'saved' ? 'Saved' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button type="submit" style={{ ...styles.btnSaveWithIcon, background: 'linear-gradient(135deg, #28a745, #218838)' }}>
                  <img src="/Save button.png" alt="Save" style={styles.saveIconLeft} />
                  Save
                </button>
              </div>
            </form>
          )
        )}

        {/* GROUP EDIT MODE */}
        {isGroupEditing && (
          <form onSubmit={handleGroupSubmit}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.headerRow}>
                  <th style={styles.headerCell}>Team Name</th>
                  <th style={styles.headerCell}>Event</th>
                  <th style={styles.headerCell}>Year</th>
                  <th style={styles.headerCell}>Level</th>
                  <th style={styles.headerCell}>Medal</th>
                  <th style={styles.headerCell}>URL</th>
                </tr>
              </thead>
              <tbody>
                <tr style={styles.bodyRow}>
                  <td style={styles.cell}>
                    <input
                      id="group-team"
                      name="group-team"
                      style={styles.input}
                      value={groupForm.teamName}
                      onChange={e => setGroupForm({ ...groupForm, teamName: e.target.value })}
                    />
                  </td>
                  <td style={styles.cell}>
                    <input
                      id="group-event"
                      name="group-event"
                      list="manage-results-event-options"
                      style={styles.input}
                      value={groupForm.event}
                      onChange={e => {
                        setGroupForm({ ...groupForm, event: e.target.value });
                        setSelectedRegistrationId('');
                      }}
                      placeholder="Enter or select event"
                    />
                  </td>
                  <td style={styles.cell}>
                    <select
                      id="group-year"
                      name="group-year"
                      style={styles.select}
                      value={groupForm.year}
                      onChange={e => {
                        setGroupForm({ ...groupForm, year: e.target.value });
                        setGroupMemberSelection({});
                        setSelectedRegistrationId('');
                      }}
                    >
                      <option value="">Select Year</option>
                      {availableYears.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </td>
                  <td style={styles.cell}>
                    <select
                      id="group-level"
                      name="group-level"
                      style={styles.select}
                      value={normalizeResultLevel(groupForm.level || selectedLevel)}
                      onChange={e => setGroupForm({ ...groupForm, level: e.target.value })}
                    >
                      {RESULT_LEVELS.map((level) => (
                        <option key={level.key} value={level.key}>{level.label}</option>
                      ))}
                    </select>
                  </td>
                  <td style={styles.cell}>
                    <select
                      id="group-medal"
                      name="group-medal"
                      style={styles.select}
                      value={groupForm.medal}
                      onChange={e => setGroupForm({ ...groupForm, medal: e.target.value })}
                    >
                      <option value="">Select Medal</option>
                      {MEDALS.map(m => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </td>
                  <td style={styles.cell}>
                    <input
                      id="group-url"
                      name="group-url"
                      style={styles.input}
                      value={groupForm.imageUrl}
                      onChange={e => setGroupForm({ ...groupForm, imageUrl: e.target.value })}
                    />
                  </td>
                </tr>
                <tr style={styles.bodyRow}>
                  <td style={styles.cell} colSpan={6}>
                    <div>
                      <div style={styles.registrationSyncCard}>
                        <div style={styles.registrationSyncTitle}>Load Locked Team Roster</div>
                        <div style={styles.registrationSyncText}>
                          Choose a team from Sports Meet Registration to pull names, branch, year, and semester into
                          this team result.
                        </div>
                        <div style={styles.registrationSyncActions}>
                          <select
                            id="group-registration-source"
                            name="group-registration-source"
                            style={styles.select}
                            value={selectedRegistrationId}
                            onChange={(e) => setSelectedRegistrationId(e.target.value)}
                          >
                            <option value="">Select Registered Team</option>
                            {registrationOptions.map((registration) => {
                              const registrationId = String(registration?._id || registration?.id || '');
                              const rosterCount = Array.isArray(registration?.members) ? registration.members.length : 0;
                              const registrationYear = String(registration?.year || registration?.members?.[0]?.year || '').trim();
                              return (
                                <option key={registrationId} value={registrationId}>
                                  {`${registration.eventName || 'Event'} | ${registration.teamName || registration.teamHeadName || 'Individual'} | Y${registrationYear || '-'} | ${rosterCount} players`}
                                </option>
                              );
                            })}
                          </select>
                          <button
                            type="button"
                            onClick={() => applyRegistrationRoster(selectedRegistrationId)}
                            style={styles.topBtnPrimary}
                            disabled={!selectedRegistrationId}
                          >
                            Load Registration Team
                          </button>
                        </div>
                      </div>
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => handleSelectAllGroupPlayers(true)}
                            style={styles.topBtnSecondary}
                          >
                            Select All Names
                          </button>
                          <button
                            type="button"
                            onClick={applySelectedPlayersToTeam}
                            style={styles.topBtnPrimary}
                          >
                            Apply To Selected Players
                          </button>
                        </div>
                        <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
                          {getGroupYearPlayers().length === 0 ? (
                            <div style={{ color: '#6b7280', fontSize: 13 }}>No players for selected year.</div>
                          ) : (
                            getGroupYearPlayers().map((p, idx) => (
                              <label
                                key={p.masterId}
                                htmlFor={`group-select-player-${idx}`}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', fontSize: 14, color: '#1f2937' }}
                              >
                                <input
                                  id={`group-select-player-${idx}`}
                                  name={`group-select-player-${idx}`}
                                  type="checkbox"
                                  checked={!!groupMemberSelection[p.masterId]}
                                  onChange={(e) =>
                                    setGroupMemberSelection((prev) => ({
                                      ...prev,
                                      [p.masterId]: e.target.checked
                                    }))
                                  }
                                />
                                <span>{p.name || '-'} ({p.branch || '-'})</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setGroupForm({
                              ...groupForm,
                              manualMembers: [...(groupForm.manualMembers || []), { name: '', branch: '', diplomaYear: '', semester: '' }]
                            });
                          }}
                          style={styles.btnSecondary}
                        >
                          <img src="/Add button.png" alt="Add" style={styles.saveIconLeft} />
                          Add Rows
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const rows = [...(groupForm.manualMembers || [])];
                            if (rows.length <= 1) return;
                            rows.pop();
                            setGroupForm({ ...groupForm, manualMembers: rows });
                          }}
                          style={styles.btnSecondary}
                        >
                          <img src="/Delete button.png" alt="Delete" style={styles.saveIconLeft} />
                          Delete Rows
                        </button>
                      </div>
                      <table style={styles.table}>
                        <thead>
                          <tr style={styles.headerRow}>
                            <th style={styles.headerCell}>Name</th>
                            <th style={styles.headerCell}>Branch</th>
                            <th style={styles.headerCell}>Diploma Year</th>
                            <th style={styles.headerCell}>Semester</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(groupForm.manualMembers || []).map((row, idx) => (
                            <tr key={idx} style={styles.bodyRow}>
                              <td style={styles.cell}>
                                <input
                                  id={`group-member-name-${idx}`}
                                  name={`group-member-name-${idx}`}
                                  style={styles.input}
                                  value={row.name || ''}
                                  onChange={e => {
                                    const rows = [...groupForm.manualMembers];
                                    rows[idx] = { ...rows[idx], name: e.target.value };
                                    setGroupForm({ ...groupForm, manualMembers: rows });
                                  }}
                                  placeholder="Name"
                                />
                              </td>
                              <td style={styles.cell}>
                                <input
                                  id={`group-member-branch-${idx}`}
                                  name={`group-member-branch-${idx}`}
                                  style={styles.input}
                                  value={row.branch || ''}
                                  onChange={e => {
                                    const rows = [...groupForm.manualMembers];
                                    rows[idx] = { ...rows[idx], branch: e.target.value };
                                    setGroupForm({ ...groupForm, manualMembers: rows });
                                  }}
                                  placeholder="Branch"
                                />
                              </td>
                              <td style={styles.cell}>
                                <select
                                  id={`group-member-diploma-year-${idx}`}
                                  name={`group-member-diploma-year-${idx}`}
                                  style={styles.select}
                                  value={row.diplomaYear || ''}
                                  onChange={e => {
                                    const nextDiplomaYear = e.target.value;
                                    const semesterOptions = getSemesterOptions(nextDiplomaYear);
                                    const rows = [...groupForm.manualMembers];
                                    rows[idx] = {
                                      ...rows[idx],
                                      diplomaYear: nextDiplomaYear,
                                      semester: semesterOptions.includes(String(rows[idx]?.semester || ''))
                                        ? String(rows[idx]?.semester || '')
                                        : ''
                                    };
                                    setGroupForm({ ...groupForm, manualMembers: rows });
                                  }}
                                >
                                  <option value="">Select Diploma Year</option>
                                  <option value="1">1</option>
                                  <option value="2">2</option>
                                  <option value="3">3</option>
                                </select>
                              </td>
                              <td style={styles.cell}>
                                <select
                                  id={`group-member-semester-${idx}`}
                                  name={`group-member-semester-${idx}`}
                                  style={styles.select}
                                  value={row.semester || ''}
                                  onChange={e => {
                                    const rows = [...groupForm.manualMembers];
                                    rows[idx] = { ...rows[idx], semester: e.target.value };
                                    setGroupForm({ ...groupForm, manualMembers: rows });
                                  }}
                                  disabled={!row.diplomaYear}
                                >
                                  <option value="">Select Semester</option>
                                  {getSemesterOptions(row.diplomaYear).map((sem) => (
                                    <option key={sem} value={sem}>{sem}</option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button type="submit" style={{
                ...styles.btnSaveWithIcon,
                background: 'linear-gradient(135deg, #28a745, #218838)'
              }}>
                <img
                  src="/Save button.png"
                  alt="Save"
                  style={styles.saveIconLeft}
                />
                Save Group
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
};

/* ================= REUSABLE ================= */
const Field = ({ label, htmlFor, children }) => {
  // Ensure children have id and name attributes
  const childWithAttributes = React.isValidElement(children)
    ? React.cloneElement(children, {
        id: children.props.id || htmlFor,
        name: children.props.name || htmlFor
      })
    : children;

  return (
    <tr>
      <td style={styles.fieldLabel}>
        <label htmlFor={htmlFor}>{label}</label>
      </td>
      <td style={styles.fieldValue}>
        {childWithAttributes}
      </td>
    </tr>
  );
};

/* ================= STYLES ================= */
const styles = {
  page: {
    minHeight: '100vh',
    background: '#f6f8fb',
    padding: 20,
    color: '#1f2937',
    width: '100%',
    minWidth: 0
  },

  title: {
    fontSize: 32,
    fontWeight: 700,
    marginBottom: 20,
    textShadow: 'none',
    letterSpacing: '-0.5px'
  },

  activitySection: {
    marginBottom: 24
  },

  activityTitle: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 4,
    color: '#111827'
  },

  activitySubtitle: {
    marginTop: 0,
    marginBottom: 12,
    color: '#4b5563',
    fontSize: 13
  },

  syncNote: {
    marginBottom: 14,
    padding: '12px 14px',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 10,
    color: '#1e3a8a',
    fontSize: 13,
    lineHeight: 1.6
  },

  activityEmpty: {
    padding: '12px 16px',
    background: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    color: '#4b5563',
    fontSize: 14
  },

  yearSelect: {
    padding: '10px 16px',
    borderRadius: 8,
    background: '#fff',
    color: '#1f2937',
    border: '1px solid #e5e7eb',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  },

  yearSummary: {
    marginBottom: 14,
    padding: '10px 14px',
    background: '#ffffff',
    border: '1px solid #dbeafe',
    borderRadius: 10,
    color: '#1e3a8a',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: 600
  },

  levelTabs: {
    width: 'fit-content',
    maxWidth: '100%',
    margin: '0 auto 16px',
    padding: 6,
    display: 'flex',
    gap: 8,
    background: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: 10,
    boxShadow: '0 5px 14px rgba(15, 23, 42, 0.08)'
  },

  levelTab: {
    minWidth: 112,
    minHeight: 40,
    padding: '8px 16px',
    border: '1px solid transparent',
    borderRadius: 8,
    background: '#f9fafb',
    color: '#1f2937',
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer'
  },

  levelTabActive: {
    background: '#1d4ed8',
    borderColor: '#1e40af',
    color: '#ffffff'
  },

  yearBar: {
    height: 6,
    background: 'linear-gradient(90deg, #1f2937 0%, #374151 100%)',
    borderRadius: 3,
    marginBottom: 16,
    boxShadow: '0 2px 8px rgba(31, 41, 55, 0.24)'
  },

  yearTitle: {
    fontSize: 22,
    fontWeight: 600,
    marginBottom: 16,
    color: '#1f2937',
    textShadow: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },

  topActionBar: {
    marginBottom: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap'
  },

  searchInput: {
    padding: '10px 14px',
    width: '320px',
    maxWidth: '92%',
    borderRadius: 8,
    border: '2px solid #000000',
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#ffffff',
    outline: 'none',
    boxShadow: 'none'
  },

  registrationSyncCard: {
    marginBottom: 14,
    padding: 14,
    borderRadius: 10,
    border: '1px solid #dbeafe',
    background: '#f8fbff'
  },

  registrationSyncTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#1e3a8a',
    marginBottom: 6
  },

  registrationSyncText: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 10,
    lineHeight: 1.5
  },

  registrationSyncActions: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    alignItems: 'center'
  },

  /* ================= TABLE ================= */

  tableContainer: {
    background: '#fff',
    borderRadius: 16,
    overflowX: 'auto',
    boxShadow: '0 8px 24px rgba(71, 85, 105, 0.12)',
    marginBottom: 32,
    border: '1px solid #cfd6df'
  },

  table: {
    width: '100%',
    background: '#ffffff',
    color: '#1f2937',
    borderCollapse: 'collapse',
    fontSize: 14,
    lineHeight: 1.5
  },

  headerRow: {
    background: 'linear-gradient(135deg, #eef2f6 0%, #d6dde5 100%)',
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    fontWeight: 600,
    fontSize: 12,
    borderBottom: '1px solid #c0c8d2'
  },

  headerCell: {
    padding: '16px 20px',
    textAlign: 'left',
    fontWeight: 600,
    border: 'none',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },

  bodyRow: {
    borderBottom: '1px solid #e5e7eb',
    transition: 'all 0.2s ease',
    backgroundColor: '#ffffff'
  },

  bodyRowHover: {
    backgroundColor: '#f5f7fa',
    transform: 'scale(1.001)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },

  cell: {
    padding: '16px 20px',
    verticalAlign: 'middle',
    borderBottom: '1px solid #e5e7eb'
  },

  nameCell: {
    fontWeight: 600,
    color: '#111827',
    fontSize: 15
  },

  eventBadge: {
    display: 'inline-block',
    background: 'linear-gradient(135deg, #e3f2fd, #bbdefb)',
    color: '#1565c0',
    padding: '6px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    border: '1px solid #90caf9'
  },

  medalBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
    border: '2px solid transparent'
  },

  goldMedal: {
    background: 'linear-gradient(135deg, #ffd700, #ffed4e)',
    color: '#8b6914',
    borderColor: '#ffd700'
  },

  silverMedal: {
    background: 'linear-gradient(135deg, #c0c0c0, #e8e8e8)',
    color: '#595959',
    borderColor: '#c0c0c0'
  },

  bronzeMedal: {
    background: 'linear-gradient(135deg, #cd7f32, #daa520)',
    color: '#5d4037',
    borderColor: '#cd7f32'
  },

  participationMedal: {
    background: 'linear-gradient(135deg, #60a5fa, #2563eb)',
    color: '#ffffff',
    borderColor: '#2563eb'
  },

  imageLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: '#667eea',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #667eea',
    transition: 'all 0.2s ease'
  },

  noImage: {
    color: '#9e9e9e',
    fontSize: 13,
    fontStyle: 'italic'
  },

  /* ================= FORM ================= */

  fieldLabel: {
    padding: '16px 20px',
    fontWeight: 600,
    width: '30%',
    background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
    borderBottom: '1px solid #dee2e6',
    color: '#495057',
    fontSize: 14
  },

  fieldValue: {
    padding: '16px 20px',
    borderBottom: '1px solid #dee2e6',
    backgroundColor: '#ffffff'
  },

  input: {
    width: '100%',
    padding: '10px 14px',
    border: '2px solid #e9ecef',
    borderRadius: 8,
    fontSize: 14,
    transition: 'all 0.2s ease',
    backgroundColor: '#ffffff'
  },

  select: {
    width: '100%',
    padding: '10px 14px',
    border: '2px solid #e9ecef',
    borderRadius: 8,
    fontSize: 14,
    transition: 'all 0.2s ease',
    backgroundColor: '#ffffff',
    cursor: 'pointer'
  },

  bulkEntryStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },

  bulkEntryRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },

  bulkEntryActions: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap'
  },

  bulkEntryButton: {
    padding: '6px 10px',
    borderRadius: 8,
    border: 'none',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },

  bulkEntryAddButton: {
    background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
    color: '#1d4ed8',
    border: '1px solid #93c5fd'
  },

  bulkEntryRemoveButton: {
    background: 'linear-gradient(135deg, #fff1f2, #ffe4e6)',
    color: '#be123c',
    border: '1px solid #fecdd3'
  },

  bulkEntrySpacer: {
    display: 'inline-block',
    minWidth: 0,
    minHeight: 0
  },

  bulkSaveHint: {
    marginBottom: 12,
    padding: '10px 14px',
    borderRadius: 8,
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: 600
  },

  /* ================= BUTTONS ================= */

  buttonGroup: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },

  btnPrimary: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },

  btnSecondary: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #6c757d, #495057)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(108, 117, 125, 0.3)'
  },

  topBtnPrimary: {
    padding: '11px 22px',
    background: 'linear-gradient(135deg, #1d4ed8, #1e40af)',
    color: '#ffffff',
    border: '1px solid #1e40af',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 5px 14px rgba(37, 99, 235, 0.28)',
    letterSpacing: '0.2px'
  },

  topBtnSecondary: {
    padding: '11px 22px',
    background: 'linear-gradient(135deg, #f9fafb, #e5e7eb)',
    color: '#1f2937',
    border: '1px solid #d1d5db',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 5px 14px rgba(15, 23, 42, 0.12)',
    letterSpacing: '0.2px'
  },

  btnEdit: {
    padding: '8px 14px',
    background: 'linear-gradient(135deg, #ffc107, #ffb300)',
    color: '#212529',
    border: 'none',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(255, 193, 7, 0.3)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px'
  },

  btnDelete: {
    padding: '8px 14px',
    background: 'linear-gradient(135deg, #dc3545, #c82333)',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(220, 53, 69, 0.3)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px'
  },

  btnSave: {
    padding: '12px 28px',
    background: 'linear-gradient(135deg, #28a745, #218838)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 16px rgba(40, 167, 69, 0.3)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },

  btnSaveWithIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 28px',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 16px rgba(40, 167, 69, 0.3)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },

  saveIconLeft: {
    width: '22px',
    height: '22px',
    objectFit: 'contain'
  },

  leftIconGroup: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '10px'
  },

  iconButton: {
    width: '28px',
    height: '28px',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
  },

  intelligenceBtn: {
    padding: '6px 10px',
    border: '1px solid #1d4ed8',
    borderRadius: 6,
    background: '#eff6ff',
    color: '#1e40af',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },

  intelligenceOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.55)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14
  },

  intelligenceModal: {
    width: 'min(920px, 96vw)',
    maxHeight: '92vh',
    overflowY: 'auto',
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: 12,
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)'
  },

  intelligenceHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 18px',
    borderBottom: '1px solid #dbeafe',
    background: 'linear-gradient(135deg, #1d4ed8, #1e3a8a)',
    color: '#ffffff'
  },

  intelligenceClose: {
    border: '1px solid rgba(255,255,255,0.6)',
    background: 'transparent',
    color: '#ffffff',
    borderRadius: 6,
    padding: '6px 10px',
    cursor: 'pointer',
    fontWeight: 600
  },

  intelligenceHero: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderBottom: '1px solid #e2e8f0',
    background: '#ffffff'
  },

  intelligenceImage: {
    width: 74,
    height: 74,
    borderRadius: 10,
    objectFit: 'cover',
    border: '1px solid #cbd5e1'
  },

  intelligenceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 12,
    padding: '12px 16px 0'
  },

  intelligenceCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: 14,
    margin: '12px 16px'
  },

  intelligenceSectionTitle: {
    margin: '0 0 10px',
    color: '#1e293b',
    fontSize: 15
  },

  intelligenceLine: {
    margin: '0 0 6px',
    color: '#374151',
    fontSize: 14
  },

  intelligenceScoreValue: {
    margin: '0 0 8px',
    fontSize: 40,
    fontWeight: 800,
    color: '#1d4ed8',
    lineHeight: 1
  },

  intelligenceTable: {
    width: '100%',
    borderCollapse: 'collapse',
    background: '#ffffff'
  },

  intelligenceTh: {
    textAlign: 'left',
    padding: '8px 10px',
    background: '#eff6ff',
    borderBottom: '1px solid #dbeafe',
    color: '#1e3a8a',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.4px'
  },

  intelligenceTd: {
    padding: '8px 10px',
    borderBottom: '1px solid #eef2f7',
    color: '#1f2937',
    fontSize: 13
  },

};

export default ManageResults;


