import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import LanguageSwitch from '../components/LanguageSwitch';
import ThemeToggle from '../components/ThemeToggle';
import { useLanguage } from '../i18n/LanguageContext';
import './ForgotPasswordPage.css';

function ForgotPasswordPage() {
  const { t, translateServerMessage } = useLanguage();
  const [searchParams] = useSearchParams();
  const resetToken = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [step, setStep] = useState(resetToken ? 2 : 1); // 1: email, 2: reset password
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!resetToken) return;

    let ignore = false;

    const verifyToken = async () => {
      setError('');
      setMessage('');
      setLoading(true);

      try {
        const response = await axios.get('/api/auth/verify-reset-token', {
          params: { token: resetToken },
        });

        if (!ignore) {
          setEmail(response.data.email || '');
          setStep(2);
        }
      } catch (err) {
        if (!ignore) {
          setStep(1);
          setError(translateServerMessage(err.response?.data?.message, 'errors.resetInstructions'));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    verifyToken();

    return () => {
      ignore = true;
    };
  }, [resetToken, translateServerMessage]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/forgot-password', { email });
      setMessage(response.data.message);
    } catch (err) {
      setError(translateServerMessage(err.response?.data?.message, 'errors.resetInstructions'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (newPassword !== confirmPassword) {
      setError(t('errors.passwordsMatch'));
      setLoading(false);
      return;
    }

    if (!resetToken) {
      setError(t('errors.resetInstructions'));
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('/api/auth/reset-password', {
        token: resetToken,
        newPassword,
        confirmPassword,
      });
      setMessage(response.data.message);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(translateServerMessage(err.response?.data?.message, 'errors.resetPassword'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="auth-top-controls">
        <LanguageSwitch className="auth-language-switch" />
        <ThemeToggle className="auth-theme-toggle" />
      </div>

      <div className="forgot-shell">
        <section className="forgot-hero">
          <span className="forgot-hero-eyebrow">CramTask.AI</span>
          <h1 className="forgot-hero-title">Need to reset your password?</h1>
          <p className="forgot-hero-copy">Enter your email and we'll send secure reset instructions. Fast, safe, and simple.</p>

          <div className="forgot-hero-kicker">Keep your account secure — we'll walk you through the steps.</div>
        </section>

        <section className="forgot-card">
          <div className="forgot-card-header">
            <div>
              <p className="forgot-card-eyebrow">Password reset</p>
              <h2>{t('auth.resetTitle')}</h2>
            </div>
          </div>

          {step === 1 ? (
            <form onSubmit={handleEmailSubmit} className="forgot-password-form">
              {error && <div className="alert alert-error">{error}</div>}
              {message && <div className="alert alert-success">{message}</div>}

              <div className="form-group">
                <label htmlFor="email">{t('auth.emailAddress')}</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary auth-submit" disabled={loading}>
                {loading ? t('auth.sending') : t('auth.sendReset')}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasswordReset} className="forgot-password-form">
              {error && <div className="alert alert-error">{error}</div>}
              {message && <div className="alert alert-success">{message}</div>}

              <p className="info-text">{t('auth.enterNewPassword')}</p>

              <div className="form-group">
                <label htmlFor="newPassword">{t('auth.newPassword')}</label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">{t('auth.confirmPassword')}</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary auth-submit" disabled={loading}>
                {loading ? t('auth.resetting') : t('auth.resetPassword')}
              </button>
            </form>
          )}

          <div className="back-to-login">
            <Link to="/">{t('auth.backToLogin')}</Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
