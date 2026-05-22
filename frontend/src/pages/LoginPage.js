import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import LanguageSwitch from '../components/LanguageSwitch';
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
      <LanguageSwitch className="auth-language-switch" />
      <div className="login-box">
        <h1>CRAMTASK.AI</h1>

        <form onSubmit={handleLogin} className="login-form">
          <h2>{t('auth.loginTitle')}</h2>

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

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? t('auth.loggingIn') : t('auth.login')}
          </button>
        </form>

        <div className="signup-link">
          {t('auth.noAccount')} <Link to="/signup">{t('auth.createOne')}</Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
