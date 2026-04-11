export const HISTORY_TABS = [
  {
    key: 'state',
    label: 'State',
    title: 'Karnataka State Inter-Polytechnic Timeline',
    description: 'Academic-year records of state-level hosts and venues across Karnataka.',
    hostLabel: 'Host Polytechnic',
  },
  {
    key: 'national',
    label: 'National',
    title: 'South Zone National Polytechnic Timeline',
    description: 'National and south-zone hosting milestones recorded by KPT Sports.',
    hostLabel: 'Host State',
  },
];

export const createEmptyTimelineRow = () => ({
  year: '',
  host: '',
  venue: '',
  fixed: false,
});

export const normalizeTimelineRow = (row = {}) => ({
  year: String(row?.year || '').trim(),
  host: String(row?.host || '').trim(),
  venue: String(row?.venue || '').trim(),
  fixed: Boolean(row?.fixed),
});

const normalizeTimelineRows = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => normalizeTimelineRow(row))
    .filter((row) => row.year || row.host || row.venue);

export const createEmptyHistoryTimeline = () => ({
  state: [],
  national: [],
});

export const normalizeHistoryTimeline = (timeline) => {
  if (Array.isArray(timeline)) {
    return {
      state: normalizeTimelineRows(timeline),
      national: [],
    };
  }

  if (timeline && typeof timeline === 'object') {
    return {
      state: normalizeTimelineRows(timeline.state),
      national: normalizeTimelineRows(timeline.national),
    };
  }

  return createEmptyHistoryTimeline();
};

export const getHistoryTimelineTotal = (timeline) => {
  const normalizedTimeline = normalizeHistoryTimeline(timeline);
  return normalizedTimeline.state.length + normalizedTimeline.national.length;
};
