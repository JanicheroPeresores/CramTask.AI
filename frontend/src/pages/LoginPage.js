import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import LanguageSwitch from '../components/LanguageSwitch';
import ThemeToggle from '../components/ThemeToggle';
import { useLanguage } from '../i18n/LanguageContext';
import './LoginPage.css';

function LoginPage({ onLogin }) {
  const { t, translateServerMessage } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/login', {
        username,
        password,
      });

      onLogin(response.data.token, response.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(translateServerMessage(err.response?.data?.message, 'errors.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="auth-top-controls">
        <LanguageSwitch className="auth-language-switch" />
        <ThemeToggle className="auth-theme-toggle" />
      </div>
      <div className="login-shell">
        <section className="login-hero">
          <span className="login-hero-eyebrow">CramTask.AI</span>
          <h1 className="login-hero-title">A smarter way to own your school day.</h1>
          <p className="login-hero-copy">
            Keep every assignment, deadline, and AI study suggestion in one polished workspace.
          </p>

          <div className="login-hero-features">
            <div className="feature-pill">Task clarity with a modern workflow</div>
            <div className="feature-pill">Sync classroom assignments instantly</div>
            <div className="feature-pill">AI study coach built for every student</div>
          </div>

          <div className="login-hero-kicker">
            Designed for desktop and mobile, with the same CramTask.AI power you trust.
          </div>
        </section>

        <section className="login-card">
          <div className="login-card-header">
            <div>
              <p className="login-card-eyebrow">Welcome back</p>
              <h2>{t('auth.loginTitle')}</h2>
            </div>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label htmlFor="username">{t('auth.usernameEmail')}</label>
              <input
                type="text"
                id="username"
                placeholder={t('auth.usernameEmailPlaceholder')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">{t('auth.password')}</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="forgot-password">
              <Link to="/forgot-password">{t('auth.forgotPassword')}</Link>
            </div>

            <button type="submit" className="btn-primary auth-submit" disabled={loading}>
              {loading ? t('auth.loggingIn') : t('auth.login')}
            </button>
          </form>

          <div className="signup-link">
            {t('auth.noAccount')} <Link to="/signup">{t('auth.createOne')}</Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default LoginPage;
