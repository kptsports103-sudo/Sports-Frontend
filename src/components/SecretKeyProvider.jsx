import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, KeyRound, MailCheck, ShieldAlert, ShieldCheck } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { clearSecretKeyToken, setSecretKeyToken } from '../context/tokenStorage';
import api from '../services/api';
import { setSecretKeyChallengeHandler } from '../services/secretKeyBridge';
import './SecretKeyProvider.css';

const INITIAL_FORM = {
  otp: '',
  secretKey: '',
  confirmSecretKey: '',
};

const INITIAL_MODAL = {
  open: false,
  mode: 'verify',
  reason: '',
  otpRequested: false,
};

const SecretKeyProvider = ({ children }) => {
  const { user, refreshUser } = useAuth();
  const [modal, setModal] = useState(INITIAL_MODAL);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showConfirmSecretKey, setShowConfirmSecretKey] = useState(false);
  const challengeRef = useRef(null);

  const resetVisualState = () => {
    setForm(INITIAL_FORM);
    setError('');
    setNotice('');
    setLoading(false);
    setShowSecretKey(false);
    setShowConfirmSecretKey(false);
    setModal(INITIAL_MODAL);
  };

  const rejectChallenge = (message = 'Secret key verification was cancelled.') => {
    if (challengeRef.current?.reject) {
      challengeRef.current.reject(new Error(message));
    }

    challengeRef.current = null;
    resetVisualState();
  };

  const resolveChallenge = (token) => {
    if (challengeRef.current?.resolve) {
      challengeRef.current.resolve(token);
    }

    challengeRef.current = null;
    resetVisualState();
  };

  useEffect(() => {
    const openChallenge = (options = {}) => {
      const safeReason = String(options.reason || '').trim();
      const shouldForceSetup = Boolean(options.forceSetup) || !user?.hasSecretKey;

      if (challengeRef.current?.promise) {
        setModal((current) => ({
          ...current,
          open: true,
          mode: shouldForceSetup ? 'setup' : current.mode,
          reason: safeReason || current.reason,
        }));

        return challengeRef.current.promise;
      }

      let resolvePromise;
      let rejectPromise;
      const promise = new Promise((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
      });

      challengeRef.current = {
        promise,
        resolve: resolvePromise,
        reject: rejectPromise,
      };

      setForm(INITIAL_FORM);
      setError('');
      setNotice('');
      setShowSecretKey(false);
      setShowConfirmSecretKey(false);
      setModal({
        open: true,
        mode: shouldForceSetup ? 'setup' : 'verify',
        reason: safeReason,
        otpRequested: false,
      });

      return promise;
    };

    setSecretKeyChallengeHandler(openChallenge);

    return () => {
      setSecretKeyChallengeHandler(null);
    };
  }, [user?.hasSecretKey]);

  useEffect(() => {
    if (!user) {
      clearSecretKeyToken();
    }
  }, [user]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleRequestOtp = async () => {
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const response = await api.post(
        '/me/secret-key/request-otp',
        {},
        { __skipSecretKeyInterceptor: true }
      );

      setModal((current) => ({
        ...current,
        otpRequested: true,
      }));
      setNotice(response?.data?.message || 'OTP sent to your email.');
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySecretKey = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const response = await api.post(
        '/me/secret-key/verify',
        { secretKey: form.secretKey },
        { __skipSecretKeyInterceptor: true }
      );

      const token = response?.data?.secretKeyToken;
      setSecretKeyToken(token);
      await refreshUser();
      resolveChallenge(token);
    } catch (verifyError) {
      setError(verifyError?.response?.data?.message || verifyError?.message || 'Secret key is incorrect.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSecretKey = async (event) => {
    event.preventDefault();

    if (!modal.otpRequested) {
      await handleRequestOtp();
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');

    try {
      const response = await api.post(
        '/me/secret-key/verify-otp',
        {
          otp: form.otp,
          secretKey: form.secretKey,
          confirmSecretKey: form.confirmSecretKey,
        },
        { __skipSecretKeyInterceptor: true }
      );

      const token = response?.data?.secretKeyToken;
      setSecretKeyToken(token);
      await refreshUser();
      resolveChallenge(token);
    } catch (setupError) {
      setError(setupError?.response?.data?.message || setupError?.message || 'Failed to create secret key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {children}
      {modal.open ? (
        <div className="secret-key-modal" role="dialog" aria-modal="true" aria-labelledby="secret-key-modal-title">
          <button
            type="button"
            className="secret-key-modal__backdrop"
            aria-label="Close secret key modal"
            onClick={() => {
              if (!loading) {
                rejectChallenge();
              }
            }}
          />

          <div className="secret-key-modal__panel">
            <div className="secret-key-modal__badge">
              {modal.mode === 'setup' ? <MailCheck size={18} /> : <ShieldCheck size={18} />}
              <span>{modal.mode === 'setup' ? 'Create Secret Key' : 'Verify Secret Key'}</span>
            </div>

            <h2 id="secret-key-modal-title" className="secret-key-modal__title">
              {modal.mode === 'setup' ? 'Create your admin secret key' : 'Secret key required before edit'}
            </h2>

            <p className="secret-key-modal__copy">
              {modal.reason ||
                (modal.mode === 'setup'
                  ? 'First create a secret key with email OTP verification. After that, every edit asks for the secret key first.'
                  : 'This dashboard action is locked. Verify your secret key to continue.' )}
            </p>

            {notice ? <div className="secret-key-modal__note secret-key-modal__note--info">{notice}</div> : null}
            {error ? (
              <div className="secret-key-modal__note secret-key-modal__note--error">
                <ShieldAlert size={16} />
                <span>{error}</span>
              </div>
            ) : null}

            {modal.mode === 'verify' ? (
              <form className="secret-key-modal__form" onSubmit={handleVerifySecretKey}>
                <label className="secret-key-modal__label" htmlFor="secret-key-verify-input">
                  Secret Key
                </label>
                <div className="secret-key-modal__field-wrap">
                  <KeyRound size={16} />
                  <input
                    id="secret-key-verify-input"
                    type={showSecretKey ? 'text' : 'password'}
                    value={form.secretKey}
                    onChange={(event) => updateField('secretKey', event.target.value)}
                    placeholder="Enter your secret key"
                    autoComplete="off"
                    required
                  />
                  <button
                    type="button"
                    className="secret-key-modal__toggle"
                    onClick={() => setShowSecretKey((current) => !current)}
                    aria-label={showSecretKey ? 'Hide secret key' : 'Show secret key'}
                  >
                    {showSecretKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="secret-key-modal__actions">
                  <button type="submit" className="secret-key-modal__button" disabled={loading}>
                    {loading ? 'Verifying...' : 'Verify and Continue'}
                  </button>
                  <button
                    type="button"
                    className="secret-key-modal__button secret-key-modal__button--ghost"
                    disabled={loading}
                    onClick={() => rejectChallenge()}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <form className="secret-key-modal__form" onSubmit={handleCreateSecretKey}>
                <label className="secret-key-modal__label" htmlFor="secret-key-create-input">
                  Secret Key
                </label>
                <div className="secret-key-modal__field-wrap">
                  <KeyRound size={16} />
                  <input
                    id="secret-key-create-input"
                    type={showSecretKey ? 'text' : 'password'}
                    value={form.secretKey}
                    onChange={(event) => updateField('secretKey', event.target.value)}
                    placeholder="Create secret key"
                    autoComplete="off"
                    required
                  />
                  <button
                    type="button"
                    className="secret-key-modal__toggle"
                    onClick={() => setShowSecretKey((current) => !current)}
                    aria-label={showSecretKey ? 'Hide secret key' : 'Show secret key'}
                  >
                    {showSecretKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <label className="secret-key-modal__label" htmlFor="secret-key-confirm-input">
                  Confirm Secret Key
                </label>
                <div className="secret-key-modal__field-wrap">
                  <ShieldCheck size={16} />
                  <input
                    id="secret-key-confirm-input"
                    type={showConfirmSecretKey ? 'text' : 'password'}
                    value={form.confirmSecretKey}
                    onChange={(event) => updateField('confirmSecretKey', event.target.value)}
                    placeholder="Confirm secret key"
                    autoComplete="off"
                    required
                  />
                  <button
                    type="button"
                    className="secret-key-modal__toggle"
                    onClick={() => setShowConfirmSecretKey((current) => !current)}
                    aria-label={showConfirmSecretKey ? 'Hide confirm secret key' : 'Show confirm secret key'}
                  >
                    {showConfirmSecretKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {modal.otpRequested ? (
                  <>
                    <label className="secret-key-modal__label" htmlFor="secret-key-otp-input">
                      Email OTP
                    </label>
                    <div className="secret-key-modal__field-wrap">
                      <MailCheck size={16} />
                      <input
                        id="secret-key-otp-input"
                        type="text"
                        inputMode="numeric"
                        value={form.otp}
                        onChange={(event) => updateField('otp', event.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Enter 6-digit OTP"
                        autoComplete="one-time-code"
                        maxLength={6}
                        required
                      />
                    </div>
                  </>
                ) : null}

                <div className="secret-key-modal__actions">
                  <button type="submit" className="secret-key-modal__button" disabled={loading}>
                    {loading
                      ? modal.otpRequested
                        ? 'Creating...'
                        : 'Sending OTP...'
                      : modal.otpRequested
                        ? 'Create Secret Key'
                        : 'Send OTP to Email'}
                  </button>
                  {modal.otpRequested ? (
                    <button
                      type="button"
                      className="secret-key-modal__button secret-key-modal__button--ghost"
                      disabled={loading}
                      onClick={handleRequestOtp}
                    >
                      Resend OTP
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="secret-key-modal__button secret-key-modal__button--ghost"
                    disabled={loading}
                    onClick={() => rejectChallenge()}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
};

export default SecretKeyProvider;
