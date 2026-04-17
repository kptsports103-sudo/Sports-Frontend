import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock3, FilePenLine, FileText, KeyRound, Save, User } from 'lucide-react';
import CreatorLayout from './CreatorLayout';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  isSecretKeyChallengeCancelled,
  requestSecretKeyChallenge,
} from '../../services/secretKeyBridge';

const CREATOR_NOTEPAD_HEADING = 'Darya Creator Notepad';
const EMPTY_METADATA = {
  heading: CREATOR_NOTEPAD_HEADING,
  totalPages: 20,
  minLines: 10,
  maxLines: 20,
  pages: [],
};

const createEmptyPage = (pageNumber = 1, lineCount = 10) => ({
  pageNumber,
  heading: CREATOR_NOTEPAD_HEADING,
  title: '',
  content: '',
  lineCount,
  createdAt: null,
  updatedAt: null,
  preview: '',
  hasContent: false,
});

const formatDateTime = (value) => {
  if (!value) return 'Not saved yet';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Not saved yet';
  }

  return date.toLocaleString();
};

const normalizeMetadata = (payload = {}) => ({
  ...EMPTY_METADATA,
  ...payload,
  heading: CREATOR_NOTEPAD_HEADING,
});

const normalizePage = (payload = {}, pageNumber = 1, fallbackLineCount = EMPTY_METADATA.minLines) => ({
  ...createEmptyPage(pageNumber, fallbackLineCount),
  ...payload,
  heading: CREATOR_NOTEPAD_HEADING,
});

const buildPageSummaries = (metadata) => {
  const totalPages = Number(metadata?.totalPages || EMPTY_METADATA.totalPages);
  const fallbackLineCount = Number(metadata?.minLines || EMPTY_METADATA.minLines);
  const storedPages = Array.isArray(metadata?.pages) ? metadata.pages : [];
  const pageMap = new Map(storedPages.map((entry) => [Number(entry.pageNumber), entry]));

  return Array.from({ length: totalPages }, (_, index) => {
    const pageNumber = index + 1;
    return pageMap.get(pageNumber) || {
      pageNumber,
      title: '',
      lineCount: fallbackLineCount,
      updatedAt: null,
      preview: '',
      hasContent: false,
    };
  });
};

const CreatorNotepad = () => {
  const { user } = useAuth();
  const [metadata, setMetadata] = useState(EMPTY_METADATA);
  const [selectedPageNumber, setSelectedPageNumber] = useState(1);
  const [currentPage, setCurrentPage] = useState(() => createEmptyPage(1, EMPTY_METADATA.minLines));
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [lineCount, setLineCount] = useState(EMPTY_METADATA.minLines);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSavingPage, setIsSavingPage] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadInitialData = async () => {
      setIsLoadingPage(true);
      setErrorMessage('');

      try {
        const [overviewResponse, pageResponse] = await Promise.all([
          api.get('/me/darya-notepad', { __requireSecretKey: true }),
          api.get('/me/darya-notepad/1', { __requireSecretKey: true }),
        ]);

        if (!isActive) return;

        const nextMetadata = normalizeMetadata(overviewResponse?.data || {});
        const nextPage = normalizePage(
          pageResponse?.data?.page || {},
          1,
          nextMetadata.minLines
        );

        setMetadata(nextMetadata);
        setSelectedPageNumber(Number(nextPage.pageNumber || 1));
        setCurrentPage(nextPage);
        setTitle(String(nextPage.title || ''));
        setContent(String(nextPage.content || ''));
        setLineCount(Number(nextPage.lineCount || nextMetadata.minLines || EMPTY_METADATA.minLines));
      } catch (error) {
        if (!isActive) return;

        setErrorMessage(
          error?.response?.data?.message || error?.message || 'Failed to load your Darya pages.'
        );
      } finally {
        if (isActive) {
          setIsLoadingPage(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (selectedPageNumber === Number(currentPage?.pageNumber || 1)) {
      return undefined;
    }

    let isActive = true;

    const loadPage = async () => {
      setIsLoadingPage(true);
      setErrorMessage('');
      setFeedbackMessage('');

      try {
        const response = await api.get(`/me/darya-notepad/${selectedPageNumber}`, {
          __requireSecretKey: true,
        });
        if (!isActive) return;

        const nextPage = normalizePage(
          response?.data?.page || {},
          selectedPageNumber,
          metadata.minLines
        );
        setCurrentPage(nextPage);
        setTitle(String(nextPage.title || ''));
        setContent(String(nextPage.content || ''));
        setLineCount(Number(nextPage.lineCount || metadata.minLines || EMPTY_METADATA.minLines));
      } catch (error) {
        if (!isActive) return;

        setErrorMessage(
          error?.response?.data?.message || error?.message || `Failed to load page ${selectedPageNumber}.`
        );
      } finally {
        if (isActive) {
          setIsLoadingPage(false);
        }
      }
    };

    loadPage();

    return () => {
      isActive = false;
    };
  }, [currentPage?.pageNumber, metadata.minLines, selectedPageNumber]);

  const pageSummaries = buildPageSummaries(metadata);
  const activeSummary =
    pageSummaries.find((entry) => Number(entry.pageNumber) === Number(selectedPageNumber)) ||
    pageSummaries[0] ||
    {
      pageNumber: selectedPageNumber,
      title: '',
      lineCount,
      updatedAt: null,
      preview: '',
      hasContent: false,
    };

  const lineOptions = Array.from(
    {
      length:
        Number(metadata.maxLines || EMPTY_METADATA.maxLines) -
        Number(metadata.minLines || EMPTY_METADATA.minLines) +
        1,
    },
    (_, index) => Number(metadata.minLines || EMPTY_METADATA.minLines) + index
  );

  const handleSecretKeyOption = async () => {
    setFeedbackMessage('');
    setErrorMessage('');

    try {
      await requestSecretKeyChallenge({
        reason: user?.hasSecretKey
          ? 'Verify your secret key for creator Darya page updates.'
          : 'Create your secret key first with email OTP for creator Darya page updates.',
        forceSetup: !user?.hasSecretKey,
      });

      setFeedbackMessage(
        user?.hasSecretKey
          ? 'Secret key verified successfully.'
          : 'Secret key created and verified successfully.'
      );
    } catch (error) {
      if (isSecretKeyChallengeCancelled(error)) {
        return;
      }
      setErrorMessage(error?.message || 'Secret key process was cancelled.');
    }
  };

  const refreshOverview = async () => {
    const response = await api.get('/me/darya-notepad', { __requireSecretKey: true });
    setMetadata(normalizeMetadata(response?.data || {}));
  };

  const handleSave = async () => {
    setIsSavingPage(true);
    setFeedbackMessage('');
    setErrorMessage('');

    try {
      const response = await api.put(`/me/darya-notepad/${selectedPageNumber}`, {
        title,
        content,
        lineCount,
      });

      const nextPage = normalizePage(
        response?.data?.page || {},
        selectedPageNumber,
        lineCount
      );
      setCurrentPage(nextPage);
      setTitle(String(nextPage.title || ''));
      setContent(String(nextPage.content || ''));
      setLineCount(Number(nextPage.lineCount || lineCount));
      setFeedbackMessage(response?.data?.message || `Page ${selectedPageNumber} saved successfully.`);

      await refreshOverview();
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message || error?.message || `Failed to save page ${selectedPageNumber}.`
      );
    } finally {
      setIsSavingPage(false);
    }
  };

  return (
    <CreatorLayout>
      <div className="admin-page">
        <div className="admin-page__shell admin-notepad">
          <header className="admin-page__header admin-notepad__header">
            <div className="admin-page__title-wrap">
              <span className="admin-page__eyebrow">Hidden Creator Label</span>
              <h1 className="admin-page__title">{CREATOR_NOTEPAD_HEADING}</h1>
              <p className="admin-page__subtitle">
                Private notepad pages for <strong>{user?.email || 'this creator account'}</strong>. Each creator gets 20
                separate pages, and the same previous text appears again after login.
              </p>
            </div>

            <div className="admin-page__toolbar">
              <Link to="/admin/creator-dashboard?tab=overview" className="admin-btn admin-btn--muted admin-notepad__back-link">
                <ArrowLeft size={16} />
                <span>Back to Creator Dashboard</span>
              </Link>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={handleSecretKeyOption}
              >
                <KeyRound size={16} />
                <span>{user?.hasSecretKey ? 'Verify Secret Key' : 'Create Secret Key'}</span>
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={handleSave}
                disabled={isSavingPage || isLoadingPage}
              >
                <Save size={16} />
                <span>{isSavingPage ? 'Saving...' : 'Save Page'}</span>
              </button>
            </div>
          </header>

          <section className="admin-page__section admin-notepad__section">
            <div className="admin-notepad__meta-grid">
              <article className="admin-notepad__meta-card">
                <span className="admin-notepad__meta-label">
                  <BookOpen size={16} />
                  <span>Page</span>
                </span>
                <select
                  className="admin-notepad__select"
                  value={selectedPageNumber}
                  onChange={(event) => setSelectedPageNumber(Number(event.target.value))}
                  disabled={isLoadingPage || isSavingPage}
                >
                  {pageSummaries.map((entry) => (
                    <option key={entry.pageNumber} value={entry.pageNumber}>
                      Page {entry.pageNumber}
                    </option>
                  ))}
                </select>
                <p className="admin-notepad__meta-copy">
                  Total {metadata.totalPages || EMPTY_METADATA.totalPages} pages for this creator account.
                </p>
              </article>

              <article className="admin-notepad__meta-card">
                <span className="admin-notepad__meta-label">
                  <FilePenLine size={16} />
                  <span>Visible Lines</span>
                </span>
                <select
                  className="admin-notepad__select"
                  value={lineCount}
                  onChange={(event) => setLineCount(Number(event.target.value))}
                  disabled={isLoadingPage || isSavingPage}
                >
                  {lineOptions.map((value) => (
                    <option key={value} value={value}>
                      {value} lines
                    </option>
                  ))}
                </select>
                <p className="admin-notepad__meta-copy">
                  Select between {metadata.minLines || EMPTY_METADATA.minLines} and{' '}
                  {metadata.maxLines || EMPTY_METADATA.maxLines} lines.
                </p>
              </article>

              <article className="admin-notepad__meta-card">
                <span className="admin-notepad__meta-label">
                  <Clock3 size={16} />
                  <span>Current Date &amp; Time</span>
                </span>
                <strong className="admin-notepad__meta-value">{currentTime.toLocaleString()}</strong>
                <p className="admin-notepad__meta-copy">
                  Last update: {formatDateTime(currentPage?.updatedAt || activeSummary?.updatedAt)}
                </p>
              </article>

              <article className="admin-notepad__meta-card">
                <span className="admin-notepad__meta-label">
                  <User size={16} />
                  <span>Creator Store</span>
                </span>
                <strong className="admin-notepad__meta-value">{user?.email || 'No creator email'}</strong>
                <p className="admin-notepad__meta-copy">
                  This data is private to the current creator login email only.
                </p>
              </article>
            </div>

            <div className="admin-notepad__workspace">
              <article className="admin-notepad__editor-card">
                <label className="admin-notepad__field">
                  <span className="admin-notepad__field-label">Title</span>
                  <input
                    type="text"
                    className="admin-notepad__title-input"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={`Add a title for page ${selectedPageNumber}`}
                    maxLength={120}
                    disabled={isLoadingPage || isSavingPage}
                  />
                </label>

                <label className="admin-notepad__field">
                  <span className="admin-notepad__field-label">Text Area</span>
                  <textarea
                    className="admin-notepad__textarea"
                    rows={lineCount}
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder="Write your creator notes here. Previous text will appear here again after login."
                    disabled={isLoadingPage || isSavingPage}
                  />
                </label>
              </article>

              <aside className="admin-notepad__side-card">
                <div className="admin-notepad__side-head">
                  <span className="admin-notepad__meta-label">
                    <FileText size={16} />
                    <span>Last Saved Page Data</span>
                  </span>
                  <strong className="admin-notepad__side-page-pill">Page {selectedPageNumber}</strong>
                </div>

                <dl className="admin-notepad__detail-list">
                  <div className="admin-notepad__detail-row">
                    <dt>Saved Title</dt>
                    <dd>{activeSummary?.title || 'No saved title yet'}</dd>
                  </div>
                  <div className="admin-notepad__detail-row">
                    <dt>Last Updated</dt>
                    <dd>{formatDateTime(currentPage?.updatedAt || activeSummary?.updatedAt)}</dd>
                  </div>
                  <div className="admin-notepad__detail-row">
                    <dt>Selected Lines</dt>
                    <dd>{lineCount} lines</dd>
                  </div>
                </dl>

                <div className="admin-notepad__saved-preview">
                  <span className="admin-notepad__field-label">Last Saved Text</span>
                  <p>
                    {String(currentPage?.preview || activeSummary?.preview || '').trim() ||
                      'No saved text yet for this page.'}
                  </p>
                </div>

                <div className="admin-notepad__helper-copy">
                  One heading for all pages. Click page select to switch between page 1 and page{' '}
                  {metadata.totalPages || EMPTY_METADATA.totalPages}.
                </div>
              </aside>
            </div>

            {isLoadingPage ? (
              <div className="admin-notepad__notice">Loading Darya page data...</div>
            ) : null}
            {feedbackMessage ? (
              <div className="admin-notepad__notice admin-notepad__notice--success">{feedbackMessage}</div>
            ) : null}
            {errorMessage ? (
              <div className="admin-notepad__notice admin-notepad__notice--error">{errorMessage}</div>
            ) : null}
          </section>
        </div>
      </div>
    </CreatorLayout>
  );
};

export default CreatorNotepad;
