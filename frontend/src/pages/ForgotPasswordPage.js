import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import LanguageSwitch from '../components/LanguageSwitch';
import { useLanguage } from '../i18n/LanguageContext';
import './ForgotPasswordPage.css';

function ForgotPasswordPage() {
  const { t, translateServerMessage } = useLanguage();
  const [step, setStep] = useState(1); // 1: email, 2: reset password
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/forgot-password', { email });
      setMessage(response.data.message);
      setStep(2);
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

    try {
      const response = await axios.post('/api/auth/reset-password', {
        email,
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
      <LanguageSwitch className="auth-language-switch" />
      <div className="forgot-password-box">
        <h1>{t('auth.resetTitle')}</h1>

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

            <button type="submit" className="btn-primary" disabled={loading}>
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

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? t('auth.resetting') : t('auth.resetPassword')}
            </button>
          </form>
        )}

        <div className="back-to-login">
          <Link to="/">{t('auth.backToLogin')}</Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
