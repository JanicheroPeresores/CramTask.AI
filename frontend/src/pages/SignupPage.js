import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import LanguageSwitch from '../components/LanguageSwitch';
import { useLanguage } from '../i18n/LanguageContext';
import './SignupPage.css';

function SignupPage({ onSignup }) {
  const { t, translateServerMessage } = useLanguage();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError(t('errors.passwordsMatch'));
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('/api/auth/signup', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      onSignup(response.data.token, response.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(translateServerMessage(err.response?.data?.message, 'errors.signupFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <LanguageSwitch className="auth-language-switch" />
      <div className="signup-box">
        <h1>{t('auth.createAccountTitle')}</h1>

        <form onSubmit={handleSignup} className="signup-form">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">{t('auth.username')}</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">{t('auth.email')}</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <small style={{ color: '#f1c40f', marginTop: '5px', display: 'block' }}>
              {t('auth.emailHint')}
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('auth.password')}</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">{t('auth.confirmPassword')}</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? t('auth.creatingAccount') : t('auth.signup')}
          </button>
        </form>

        <div className="login-link">
          {t('auth.hasAccount')} <Link to="/">{t('auth.login')}</Link>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
