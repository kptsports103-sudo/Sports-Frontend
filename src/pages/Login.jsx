import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, MailCheck, ShieldCheck } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import './Login.css';

const INITIAL_FORGOT_FORM = {
  email: '',
  role: '',
  otp: '',
  newPassword: '',
  confirmPassword: '',
};

export default function Login() {
  const { login, verifyOTP, requestForgotPasswordOTP, resetForgottenPassword } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState('');
  const [loginData, setLoginData] = useState(null);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState('request');
  const [forgotForm, setForgotForm] = useState(INITIAL_FORGOT_FORM);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const openForgotPassword = () => {
    setForgotForm({
      ...INITIAL_FORGOT_FORM,
      email: email || '',
    });
    setForgotStep('request');
    setForgotMessage('');
    setForgotError('');
    setShowForgotPassword(true);
  };

  const closeForgotPassword = () => {
    if (forgotLoading) {
      return;
    }

    setShowForgotPassword(false);
    setForgotStep('request');
    setForgotForm(INITIAL_FORGOT_FORM);
    setForgotMessage('');
    setForgotError('');
  };

  const updateForgotForm = (field, value) => {
    setForgotForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const submitLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErr(null);

    try {
      const result = await login(email, password);

      if (result.requiresOTP) {
        setShowOTP(true);
        setLoginData({ email: result.email, role: result.role });
        setErr('OTP sent to your email');
      } else {
        handleLoginSuccess(result.user?.role);
      }
    } catch (loginError) {
      setErr(loginError?.response?.data?.message || loginError?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const submitOTP = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErr(null);

    try {
      const result = await verifyOTP(loginData.email, otp);
      handleLoginSuccess(result.role || loginData?.role);
    } catch (otpError) {
      setErr(otpError?.response?.data?.message || otpError?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const submitForgotPasswordRequest = async (event) => {
    event.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setForgotMessage('');

    try {
      const result = await requestForgotPasswordOTP(forgotForm.email, forgotForm.role || undefined);
      setForgotStep('reset');
      setForgotMessage(result?.message || 'OTP sent to your email.');
    } catch (requestError) {
      setForgotError(requestError?.response?.data?.message || requestError?.message || 'Failed to send OTP.');
    } finally {
      setForgotLoading(false);
    }
  };

  const submitForgotPasswordReset = async (event) => {
    event.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setForgotMessage('');

    try {
      if (forgotForm.newPassword !== forgotForm.confirmPassword) {
        throw new Error('New password and confirm password must match.');
      }

      const result = await resetForgottenPassword({
        email: forgotForm.email,
        role: forgotForm.role || undefined,
        otp: forgotForm.otp,
        newPassword: forgotForm.newPassword,
      });

      setForgotMessage(result?.message || 'Password reset successful.');
      setPassword('');
      setTimeout(() => {
        closeForgotPassword();
      }, 1200);
    } catch (resetError) {
      setForgotError(resetError?.response?.data?.message || resetError?.message || 'Failed to reset password.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleLoginSuccess = (userRole) => {
    switch (userRole) {
      case 'creator':
        navigate('/admin/creator-dashboard', { replace: true });
        break;
      case 'superadmin':
        navigate('/admin/super-admin-dashboard', { replace: true });
        break;
      case 'admin':
        navigate('/admin/dashboard', { replace: true });
        break;
      default:
        navigate('/', { replace: true });
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-left">
          <img src="/KPT 1.png" alt="KPT Logo" className="login-left-logo" />
          <h2>Sign in</h2>

          <p className="back-home">
            <a href="/">← Back to Home</a>
          </p>

          {err && <p className="error-text">{err}</p>}

          {!showOTP ? (
            <form onSubmit={submitLogin}>
              <label htmlFor="login-email">Email Address *</label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="Enter your email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />

              <label htmlFor="login-password">Password *</label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />

              <div className="login-inline-actions">
                <p className="otp-hint">We&apos;ll send a 6-digit code to your email for verification</p>
                <button type="button" className="login-link-button" onClick={openForgotPassword}>
                  Forgot password?
                </button>
              </div>

              <button disabled={loading}>
                {loading ? 'Signing in...' : 'Submit'}
              </button>
            </form>
          ) : (
            <form onSubmit={submitOTP}>
              <label htmlFor="login-otp">OTP *</label>
              <input
                id="login-otp"
                name="otp"
                type="text"
                autoComplete="one-time-code"
                inputMode="numeric"
                placeholder="Enter OTP"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                required
              />

              <button disabled={loading}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>
          )}
        </div>

        <div className="login-right">
          <img src="/KPT 1.png" alt="Government Emblem" className="login-emblem" />
          <h1>Welcome to</h1>
          <h2>Karnataka (Govt.) Polytechnic, Mangalore</h2>
          <p>
            KPT is a leading Government Polytechnic college in Mangaluru, dedicated to excellence in technical
            education and sports.
          </p>
        </div>
      </div>

      {showForgotPassword ? (
        <div className="forgot-password-modal" role="dialog" aria-modal="true" aria-labelledby="forgot-password-title">
          <button type="button" className="forgot-password-modal__backdrop" onClick={closeForgotPassword} />
          <div className="forgot-password-modal__panel">
            <div className="forgot-password-modal__badge">
              {forgotStep === 'request' ? <MailCheck size={18} /> : <ShieldCheck size={18} />}
              <span>{forgotStep === 'request' ? 'Email OTP Verification' : 'Reset Password'}</span>
            </div>

            <h3 id="forgot-password-title">
              {forgotStep === 'request' ? 'Forgot password with email OTP' : 'Verify OTP and set new password'}
            </h3>
            <p className="forgot-password-modal__copy">
              {forgotStep === 'request'
                ? 'Enter your email first. We will send a verification OTP before allowing password reset.'
                : 'Enter the OTP from your email and then create a new password.'}
            </p>

            {forgotMessage ? <div className="forgot-password-modal__note">{forgotMessage}</div> : null}
            {forgotError ? <div className="forgot-password-modal__error">{forgotError}</div> : null}

            {forgotStep === 'request' ? (
              <form onSubmit={submitForgotPasswordRequest} className="forgot-password-modal__form">
                <label htmlFor="forgot-email">Email Address *</label>
                <div className="forgot-password-modal__field">
                  <MailCheck size={16} />
                  <input
                    id="forgot-email"
                    type="email"
                    value={forgotForm.email}
                    onChange={(event) => updateForgotForm('email', event.target.value)}
                    placeholder="Enter admin email"
                    required
                  />
                </div>

                <label htmlFor="forgot-role">Role</label>
                <div className="forgot-password-modal__field">
                  <KeyRound size={16} />
                  <select
                    id="forgot-role"
                    value={forgotForm.role}
                    onChange={(event) => updateForgotForm('role', event.target.value)}
                  >
                    <option value="">Auto detect</option>
                    <option value="creator">Creator</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>

                <div className="forgot-password-modal__actions">
                  <button type="submit" disabled={forgotLoading}>
                    {forgotLoading ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                  <button type="button" className="secondary-btn" onClick={closeForgotPassword} disabled={forgotLoading}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={submitForgotPasswordReset} className="forgot-password-modal__form">
                <label htmlFor="forgot-otp">OTP *</label>
                <div className="forgot-password-modal__field">
                  <ShieldCheck size={16} />
                  <input
                    id="forgot-otp"
                    type="text"
                    inputMode="numeric"
                    value={forgotForm.otp}
                    onChange={(event) => updateForgotForm('otp', event.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    required
                  />
                </div>

                <label htmlFor="forgot-password-new">New Password *</label>
                <div className="forgot-password-modal__field">
                  <KeyRound size={16} />
                  <input
                    id="forgot-password-new"
                    type="password"
                    value={forgotForm.newPassword}
                    onChange={(event) => updateForgotForm('newPassword', event.target.value)}
                    placeholder="Create new password"
                    required
                  />
                </div>

                <label htmlFor="forgot-password-confirm">Confirm Password *</label>
                <div className="forgot-password-modal__field">
                  <KeyRound size={16} />
                  <input
                    id="forgot-password-confirm"
                    type="password"
                    value={forgotForm.confirmPassword}
                    onChange={(event) => updateForgotForm('confirmPassword', event.target.value)}
                    placeholder="Confirm new password"
                    required
                  />
                </div>

                <div className="forgot-password-modal__actions">
                  <button type="submit" disabled={forgotLoading}>
                    {forgotLoading ? 'Resetting...' : 'Verify OTP and Reset'}
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    disabled={forgotLoading}
                    onClick={submitForgotPasswordRequest}
                  >
                    Resend OTP
                  </button>
                  <button type="button" className="secondary-btn" onClick={closeForgotPassword} disabled={forgotLoading}>
                    Close
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
