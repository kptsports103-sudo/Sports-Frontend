import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './ChatWindowShowcase.css';

const INDIVIDUAL_POINTS = {
  Gold: 5,
  Silver: 3,
  Bronze: 1,
};

const TEAM_POINTS = {
  Gold: 10,
  Silver: 7,
  Bronze: 4,
};

const FALLBACK_DATA = {
  events: [
    {
      eventName: 'Shuttle Badminton Singles',
      category: 'Indoor',
      eventDate: '2026-03-22',
      eventTime: '10:00 AM',
      venue: 'Indoor Arena',
      registrationStartDate: '2026-03-12',
      registrationEndDate: '2026-03-18',
      registrationStatus: 'Open',
      eventType: 'Individual',
    },
    {
      eventName: 'Chess Championship',
      category: 'Indoor',
      eventDate: '2026-03-24',
      eventTime: '02:30 PM',
      venue: 'Seminar Hall',
      registrationStartDate: '2026-03-10',
      registrationEndDate: '2026-03-19',
      registrationStatus: 'Open',
      eventType: 'Individual',
    },
    {
      eventName: 'Volleyball Trials',
      category: 'Outdoor',
      eventDate: '2026-03-28',
      eventTime: '04:00 PM',
      venue: 'Main Ground',
      registrationStartDate: '2026-03-15',
      registrationEndDate: '2026-03-23',
      registrationStatus: 'Closed',
      eventType: 'Team',
    },
  ],
  winners: [
    {
      eventName: '1 * 100 relay',
      playerName: 'Yash',
      branch: 'CSE',
      teamName: 'CSE Champions',
      year: 2025,
      medal: 'Silver',
      linkedResultType: 'team',
      createdAt: '2026-03-27T07:59:19.726Z',
    },
    {
      eventName: 'High Jump',
      playerName: 'K. Kishan Shetty',
      branch: 'ME',
      year: 2025,
      medal: 'Silver',
      linkedResultType: 'individual',
      createdAt: '2026-03-24T07:59:19.726Z',
    },
  ],
  results: [
    {
      name: 'K. Kishan Shetty',
      branch: 'ME',
      event: 'High jump',
      year: 2025,
      medal: 'Silver',
      createdAt: '2026-03-24T06:04:43.054Z',
    },
    {
      name: 'D Yashawantha Reddy',
      branch: 'CSE',
      event: '3km',
      year: 2026,
      medal: 'Silver',
      createdAt: '2026-03-29T06:04:43.054Z',
    },
  ],
};

const FAQ_STOP_WORDS = new Set([
  'a',
  'an',
  'about',
  'any',
  'are',
  'can',
  'current',
  'does',
  'for',
  'give',
  'how',
  'i',
  'is',
  'latest',
  'me',
  'my',
  'of',
  'on',
  'please',
  'show',
  'tell',
  'the',
  'to',
  'what',
  'when',
  'which',
  'who',
]);

const REGISTRATION_TERMS = ['register', 'registration', 'deadline', 'close', 'closing', 'last date', 'last day'];
const UPCOMING_TERMS = ['upcoming', 'event', 'events', 'schedule', 'next'];
const WINNER_TERMS = ['winner', 'winners', 'won', 'medal', 'champion'];
const RESULT_TERMS = ['result', 'results', 'published', 'score', 'scores', 'performance'];
const POINTS_TERMS = ['points table', 'points', 'leader', 'leading', 'top branch', 'overall champion'];
const REGISTRATION_GENERIC_TERMS = new Set([
  ...REGISTRATION_TERMS.flatMap((term) => term.split(' ')),
  ...FAQ_STOP_WORDS,
]);

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (value) => normalizeText(value).split(' ').filter(Boolean);

const countPhraseMatches = (text, phrases) =>
  phrases.reduce((count, phrase) => count + (text.includes(phrase) ? 1 : 0), 0);

const formatTimeLabel = (date = new Date()) =>
  new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);

const formatDateLabel = (value) => {
  const rawValue = String(value || '').trim();
  if (!rawValue || rawValue.toUpperCase() === 'TBA') return 'TBA';

  const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(rawValue) ? `${rawValue}T00:00:00` : rawValue;
  const parsed = new Date(normalizedValue);
  if (Number.isNaN(parsed.getTime())) return rawValue;

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
};

const parseDateValue = (value) => {
  const rawValue = String(value || '').trim();
  if (!rawValue || rawValue.toUpperCase() === 'TBA') return Number.POSITIVE_INFINITY;

  const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(rawValue) ? `${rawValue}T00:00:00` : rawValue;
  const parsed = new Date(normalizedValue);
  return Number.isNaN(parsed.getTime()) ? Number.POSITIVE_INFINITY : parsed.getTime();
};

const getEventDisplayName = (event) => String(event?.eventName || event?.event_title || '').trim();

const getEventScore = (query, event) => {
  const queryText = normalizeText(query);
  const eventName = normalizeText(getEventDisplayName(event));
  if (!queryText || !eventName) return 0;

  let score = 0;
  if (queryText.includes(eventName)) score += 8;

  const queryTokens = new Set(tokenize(query).filter((token) => !FAQ_STOP_WORDS.has(token)));
  const eventTokens = tokenize(eventName).filter((token) => !FAQ_STOP_WORDS.has(token));

  eventTokens.forEach((token) => {
    if (queryTokens.has(token)) {
      score += 2;
    }
  });

  return score;
};

const findBestEventMatch = (query, events) => {
  let bestMatch = null;

  (events || []).forEach((event) => {
    const score = getEventScore(query, event);
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { event, score };
    }
  });

  return bestMatch && bestMatch.score > 0 ? bestMatch : null;
};

const createRow = (label) => ({
  label,
  individualPoints: 0,
  teamPoints: 0,
  totalPoints: 0,
  goldCount: 0,
  silverCount: 0,
  bronzeCount: 0,
});

const addPointsToMap = (targetMap, label, kind, medal, points) => {
  const safeLabel = String(label || '').trim();
  if (!safeLabel || !points) return;

  const row = targetMap.get(safeLabel) || createRow(safeLabel);

  if (kind === 'team') {
    row.teamPoints += points;
  } else {
    row.individualPoints += points;
  }

  row.totalPoints += points;

  if (medal === 'Gold') row.goldCount += 1;
  if (medal === 'Silver') row.silverCount += 1;
  if (medal === 'Bronze') row.bronzeCount += 1;

  targetMap.set(safeLabel, row);
};

const resolveWinnerKind = (winner) => {
  const linkedType = String(winner?.linkedResultType || '').trim().toLowerCase();
  if (linkedType === 'team') return 'team';
  if (linkedType === 'individual') return 'individual';
  if (String(winner?.teamName || '').trim()) return 'team';
  return 'individual';
};

const resolveWinnerLabel = (winner, kind) => {
  const branch = String(winner?.branch || '').trim();
  const teamName = String(winner?.teamName || '').trim();

  if (branch) return branch;
  if (teamName) return teamName;
  return kind === 'team' ? 'Unassigned Team' : 'Unknown Branch';
};

const buildEventLookup = (events) => {
  const lookup = new Map();

  (events || []).forEach((event) => {
    const payload = {
      category: String(event?.category || '').trim(),
    };

    [event?.eventName, event?.event_title]
      .map(normalizeText)
      .filter(Boolean)
      .forEach((key) => {
        if (!lookup.has(key)) {
          lookup.set(key, payload);
        }
      });
  });

  return lookup;
};

const computePointsLeader = (winners, events) => {
  const eventLookup = buildEventLookup(events);
  const overallMap = new Map();

  (winners || []).forEach((winner) => {
    const medal = String(winner?.medal || '').trim();
    const kind = resolveWinnerKind(winner);
    const points = kind === 'team' ? (TEAM_POINTS[medal] || 0) : (INDIVIDUAL_POINTS[medal] || 0);
    if (!points) return;

    const label = resolveWinnerLabel(winner, kind);
    const eventKey = normalizeText(winner?.eventName);
    const category = eventLookup.get(eventKey)?.category || 'Unassigned';

    addPointsToMap(overallMap, label, kind, medal, points);

    if (category === 'Indoor' || category === 'Outdoor') {
      return;
    }
  });

  return Array.from(overallMap.values()).sort(
    (left, right) =>
      right.totalPoints - left.totalPoints ||
      right.teamPoints - left.teamPoints ||
      right.individualPoints - left.individualPoints
  )[0] || null;
};

const pickScheduleEvents = (events) => {
  const now = Date.now();
  const sortedEvents = [...(events || [])].sort(
    (left, right) => parseDateValue(left?.eventDate || left?.date || left?.event_date) - parseDateValue(right?.eventDate || right?.date || right?.event_date)
  );

  const futureEvents = sortedEvents.filter(
    (event) => parseDateValue(event?.eventDate || event?.date || event?.event_date) >= now
  );

  return (futureEvents.length > 0 ? futureEvents : sortedEvents).slice(0, 3);
};

const createAssistantMessage = (payload) => ({
  id: createId(),
  role: 'assistant',
  timeLabel: formatTimeLabel(),
  ...payload,
});

const createUserMessage = (text) => ({
  id: createId(),
  role: 'user',
  text,
  timeLabel: formatTimeLabel(),
});

const buildRegistrationAnswer = (query, data, eventMatch) => {
  const queryTokens = tokenize(query).filter((token) => !REGISTRATION_GENERIC_TERMS.has(token));
  const matchedEvent = eventMatch?.event || null;

  if (!matchedEvent && queryTokens.length > 0) {
    return createAssistantMessage({
      text: `I could not find a current event matching "${queryTokens.join(' ')}". Try an exact event name from the Events page or use one of the quick sample questions.`,
      intent: 'faq_registration_lookup',
      confidence: 74,
      source: 'Events API',
      linkLabel: 'Open Events',
      linkTo: '/sports-celebration?tab=events',
    });
  }

  const fallbackEvent = matchedEvent || (data.events || []).find((event) => String(event?.registrationStatus || '').trim() === 'Open') || data.events?.[0];
  if (!fallbackEvent) {
    return createAssistantMessage({
      text: 'Registration details are not available right now. Please check the Annual Sports Celebration page again shortly.',
      intent: 'faq_registration_deadline',
      confidence: 72,
      source: 'Events API',
      linkLabel: 'Open Registration',
      linkTo: '/sports-celebration',
    });
  }

  const eventName = getEventDisplayName(fallbackEvent) || 'this event';
  const status = String(fallbackEvent?.registrationStatus || '').trim() || 'Closed';
  const closingDate = formatDateLabel(fallbackEvent?.registrationEndDate);
  const eventDate = formatDateLabel(fallbackEvent?.eventDate || fallbackEvent?.date || fallbackEvent?.event_date);
  const time = String(fallbackEvent?.eventTime || '').trim();
  const venue = String(fallbackEvent?.venue || '').trim();

  const timingLine =
    status === 'Open'
      ? `Registration for ${eventName} is open and closes on ${closingDate}.`
      : `Registration for ${eventName} is currently closed and the listed closing date was ${closingDate}.`;

  const eventLine = eventDate !== 'TBA'
    ? ` The event is scheduled for ${eventDate}${time ? ` at ${time}` : ''}${venue ? ` in ${venue}` : ''}.`
    : venue
      ? ` Venue: ${venue}.`
      : '';

  return createAssistantMessage({
    text: `${timingLine}${eventLine}`,
    intent: 'faq_registration_deadline',
    confidence: Math.min(98, 84 + Math.min(eventMatch?.score || 0, 12)),
    source: 'Events API',
    linkLabel: 'Go To Registration',
    linkTo: '/sports-celebration',
  });
};

const buildUpcomingEventsAnswer = (data) => {
  const scheduledEvents = pickScheduleEvents(data.events);
  if (scheduledEvents.length === 0) {
    return createAssistantMessage({
      text: 'No events are available in the schedule yet. Please check back after the event list is published.',
      intent: 'faq_upcoming_events',
      confidence: 76,
      source: 'Events API',
      linkLabel: 'Browse Events',
      linkTo: '/sports-celebration?tab=events',
    });
  }

  const summary = scheduledEvents
    .map((event, index) => {
      const name = getEventDisplayName(event);
      const date = formatDateLabel(event?.eventDate || event?.date || event?.event_date);
      const time = String(event?.eventTime || '').trim();
      return `${index + 1}. ${name}${date !== 'TBA' ? ` on ${date}` : ''}${time ? ` at ${time}` : ''}`;
    })
    .join(' ');

  return createAssistantMessage({
    text: `Current scheduled events include ${summary}`,
    intent: 'faq_upcoming_events',
    confidence: 95,
    source: 'Events API',
    linkLabel: 'View Events',
    linkTo: '/sports-celebration?tab=events',
  });
};

const buildWinnersAnswer = (data) => {
  const winners = [...(data.winners || [])]
    .sort((left, right) => new Date(right?.createdAt || 0) - new Date(left?.createdAt || 0))
    .slice(0, 3);

  if (winners.length === 0) {
    return createAssistantMessage({
      text: 'Winner cards are not available yet. Once winners are published, this assistant will show them here.',
      intent: 'faq_latest_winners',
      confidence: 76,
      source: 'Winners API',
      linkLabel: 'Open Winners',
      linkTo: '/winners',
    });
  }

  const summary = winners
    .map((winner) => {
      const playerName = String(winner?.playerName || 'Unknown player').trim();
      const eventName = String(winner?.eventName || 'Unknown event').trim();
      const medal = String(winner?.medal || '').trim();
      const branch = String(winner?.branch || winner?.teamName || '').trim();
      return `${playerName} won ${medal} in ${eventName}${branch ? ` for ${branch}` : ''}`;
    })
    .join('. ');

  return createAssistantMessage({
    text: `Latest winners: ${summary}.`,
    intent: 'faq_latest_winners',
    confidence: 94,
    source: 'Winners API',
    linkLabel: 'View Winners',
    linkTo: '/winners',
  });
};

const buildResultsAnswer = (data) => {
  const results = [...(data.results || [])]
    .sort((left, right) => {
      const yearDiff = Number(right?.year || 0) - Number(left?.year || 0);
      if (yearDiff !== 0) return yearDiff;
      return new Date(right?.createdAt || 0) - new Date(left?.createdAt || 0);
    })
    .slice(0, 3);

  if (results.length === 0) {
    return createAssistantMessage({
      text: 'No published results are available yet. Results will appear here once they are added by the team.',
      intent: 'faq_results',
      confidence: 76,
      source: 'Results API',
      linkLabel: 'Open Results',
      linkTo: '/results',
    });
  }

  const summary = results
    .map((result) => {
      const name = String(result?.name || 'Unknown player').trim();
      const event = String(result?.event || 'Unknown event').trim();
      const medal = String(result?.medal || '').trim();
      const year = String(result?.year || '').trim();
      return `${name} secured ${medal} in ${event}${year ? ` (${year})` : ''}`;
    })
    .join('. ');

  return createAssistantMessage({
    text: `Recent published results: ${summary}.`,
    intent: 'faq_results',
    confidence: 93,
    source: 'Results API',
    linkLabel: 'View Results',
    linkTo: '/results',
  });
};

const buildPointsAnswer = (data) => {
  const leader = computePointsLeader(data.winners, data.events);

  if (!leader) {
    return createAssistantMessage({
      text: 'The points table is still empty. As soon as winner cards are added, the leader will appear automatically.',
      intent: 'faq_points_table',
      confidence: 75,
      source: 'Computed from winners and events',
      linkLabel: 'Open Points Table',
      linkTo: '/points-table',
    });
  }

  return createAssistantMessage({
    text: `${leader.label} leads the points table with ${leader.totalPoints} points, including ${leader.goldCount} gold, ${leader.silverCount} silver, and ${leader.bronzeCount} bronze placements.`,
    intent: 'faq_points_table',
    confidence: 96,
    source: 'Computed from winners and events',
    linkLabel: 'Open Points Table',
    linkTo: '/points-table',
  });
};

const buildFallbackAnswer = () =>
  createAssistantMessage({
    text: 'I do not have a mapped answer for that question yet. I can help with event schedules, registration deadlines, latest winners, published results, and the points table. Try one of the quick questions below.',
    linkLabel: 'Browse Sports Pages',
    linkTo: '/sports-celebration',
  });

const buildKnownResponse = (query, data) => {
  const normalizedQuery = normalizeText(query);
  const eventMatch = findBestEventMatch(query, data.events);

  const intents = [
    {
      name: 'faq_registration_deadline',
      score:
        countPhraseMatches(normalizedQuery, REGISTRATION_TERMS) * 4 +
        Math.min(eventMatch?.score || 0, 12),
      resolve: () => buildRegistrationAnswer(query, data, eventMatch),
    },
    {
      name: 'faq_points_table',
      score: countPhraseMatches(normalizedQuery, POINTS_TERMS) * 5,
      resolve: () => buildPointsAnswer(data),
    },
    {
      name: 'faq_latest_winners',
      score: countPhraseMatches(normalizedQuery, WINNER_TERMS) * 4,
      resolve: () => buildWinnersAnswer(data),
    },
    {
      name: 'faq_results',
      score: countPhraseMatches(normalizedQuery, RESULT_TERMS) * 4,
      resolve: () => buildResultsAnswer(data),
    },
    {
      name: 'faq_upcoming_events',
      score: countPhraseMatches(normalizedQuery, UPCOMING_TERMS) * 3,
      resolve: () => buildUpcomingEventsAnswer(data),
    },
  ];

  const bestIntent = intents.sort((left, right) => right.score - left.score)[0];
  if (!bestIntent || bestIntent.score <= 0) {
    return buildFallbackAnswer();
  }

  return bestIntent.resolve();
};

const ChatWindowShowcase = () => {
  const [assistantData, setAssistantData] = useState(FALLBACK_DATA);
  const [dataStatus, setDataStatus] = useState('demo');
  const [messages, setMessages] = useState(() => [
    createAssistantMessage({
      text: 'Ask a known question about events, registration deadlines, winners, results, or the points table. If a query is unsupported, I return a safe fallback reply instead of guessing.',
    }),
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const historyRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const loadLiveData = async () => {
      const [eventsResponse, winnersResponse, resultsResponse] = await Promise.allSettled([
        api.get('/events'),
        api.get('/winners?limit=12'),
        api.get('/results'),
      ]);

      if (cancelled) return;

      const nextData = {
        events: eventsResponse.status === 'fulfilled' && Array.isArray(eventsResponse.value?.data)
          ? eventsResponse.value.data
          : FALLBACK_DATA.events,
        winners: winnersResponse.status === 'fulfilled' && Array.isArray(winnersResponse.value?.data)
          ? winnersResponse.value.data
          : FALLBACK_DATA.winners,
        results: resultsResponse.status === 'fulfilled' && Array.isArray(resultsResponse.value?.data)
          ? resultsResponse.value.data
          : FALLBACK_DATA.results,
      };

      const anyLive =
        eventsResponse.status === 'fulfilled' ||
        winnersResponse.status === 'fulfilled' ||
        resultsResponse.status === 'fulfilled';

      setAssistantData(nextData);
      setDataStatus(anyLive ? 'live' : 'demo');
    };

    loadLiveData().catch((error) => {
      console.error('Failed to load assistant data:', error);
      if (!cancelled) {
        setAssistantData(FALLBACK_DATA);
        setDataStatus('demo');
      }
    });

    return () => {
      cancelled = true;
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!historyRef.current) return;
    historyRef.current.scrollTop = historyRef.current.scrollHeight;
  }, [messages, isTyping]);

  const samplePrompts = useMemo(() => {
    const firstEvent = getEventDisplayName(assistantData.events?.[0]);
    return [
      firstEvent ? `When does ${firstEvent} registration close?` : 'When does registration close?',
      'Show me upcoming events',
      'Who are the latest winners?',
      'Who leads the points table?',
      'What results are available?',
      'Can you book my hostel room?',
    ];
  }, [assistantData]);

  const submitQuery = (query) => {
    const trimmedQuery = String(query || '').trim();
    if (!trimmedQuery) return;

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    setMessages((current) => [...current, createUserMessage(trimmedQuery)]);
    setInputValue('');
    setIsTyping(true);

    typingTimeoutRef.current = window.setTimeout(() => {
      setMessages((current) => [...current, buildKnownResponse(trimmedQuery, assistantData)]);
      setIsTyping(false);
    }, 260);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submitQuery(inputValue);
  };

  const statusLabel = dataStatus === 'live' ? 'Live site data ready' : 'Demo data active';

  return (
    <section className="section-shell chat-window-showcase" aria-labelledby="chat-window-showcase-title">
      <div className="chat-window-showcase__panel">
        <div className="chat-window-showcase__content">
          <p className="chat-window-showcase__eyebrow">Live FAQ And Fallback Assistant</p>
          <h2 id="chat-window-showcase-title">Known And Fallback Query Response</h2>
          <p className="chat-window-showcase__description">
            This is now a working website feature, not just an image. Ask a known sports-domain
            question and the assistant matches the intent, reads the public site data, and returns
            the mapped response directly inside the chat window. If the question is unclear or out
            of scope, it shows a safe fallback response instead of an incorrect answer.
          </p>

          <div className="chat-window-showcase__badges" aria-label="Known and fallback response capabilities">
            <span className="chat-window-showcase__badge">Recognized intent</span>
            <span className="chat-window-showcase__badge">Mapped response</span>
            <span className="chat-window-showcase__badge">Fallback safe reply</span>
            <span className="chat-window-showcase__badge">Fast local matching</span>
            <span className="chat-window-showcase__badge">{statusLabel}</span>
          </div>

          <div className="chat-window-showcase__prompts" aria-label="Suggested chatbot questions">
            {samplePrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="chat-window-showcase__prompt"
                onClick={() => submitQuery(prompt)}
                disabled={isTyping}
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="chat-window-showcase__actions">
            <Link to="/sports-celebration" className="chat-window-showcase__action chat-window-showcase__action--primary">
              Open Sports Celebration
            </Link>
            <Link to="/sports-celebration?tab=events" className="chat-window-showcase__action chat-window-showcase__action--secondary">
              Browse Events
            </Link>
          </div>
        </div>

        <div className="chat-window-showcase__chat-shell">
          <div className="chat-window-showcase__chat-header">
            <div>
              <h3>KPT Sports Assistant</h3>
              <p>Known queries, mapped responses, and safe fallback replies</p>
            </div>
            <span className={`chat-window-showcase__status chat-window-showcase__status--${dataStatus}`}>
              {statusLabel}
            </span>
          </div>

          <div className="chat-window-showcase__chat-history" ref={historyRef} role="log" aria-live="polite">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`chat-window-showcase__message chat-window-showcase__message--${message.role}`}
              >
                <div className="chat-window-showcase__message-bubble">
                  {message.role === 'assistant' && message.intent ? (
                    <div className="chat-window-showcase__message-tags">
                      <span>{message.intent}</span>
                      {message.confidence ? <span>{message.confidence}% match</span> : null}
                      {message.source ? <span>{message.source}</span> : null}
                    </div>
                  ) : null}
                  <p>{message.text}</p>
                  {message.linkLabel && message.linkTo ? (
                    <Link className="chat-window-showcase__message-link" to={message.linkTo}>
                      {message.linkLabel}
                    </Link>
                  ) : null}
                </div>
                <span className="chat-window-showcase__message-time">{message.timeLabel}</span>
              </article>
            ))}

            {isTyping ? (
              <article className="chat-window-showcase__message chat-window-showcase__message--assistant">
                <div className="chat-window-showcase__typing">
                  <span />
                  <span />
                  <span />
                </div>
              </article>
            ) : null}
          </div>

          <form className="chat-window-showcase__composer" onSubmit={handleSubmit}>
            <input
              id="kpt-sports-assistant-query"
              name="kptSportsAssistantQuery"
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Ask about events, registration, winners, results, points table, or try an unsupported question..."
              aria-label="Ask the KPT Sports assistant"
              autoComplete="off"
              className="chat-window-showcase__input"
            />
            <button type="submit" className="chat-window-showcase__send" disabled={isTyping}>
              Send
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ChatWindowShowcase;
