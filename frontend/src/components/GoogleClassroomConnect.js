import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useLanguage } from '../i18n/LanguageContext';
import './GoogleClassroomConnect.css';

function GoogleClassroomConnect({ onSync }) {
  const { language, t } = useLanguage();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connectedAt, setConnectedAt] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('token');

  const checkConnectionStatus = useCallback(async () => {
    try {
      const response = await axios.get('/api/google-classroom/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.connected) {
        setConnected(true);
        setConnectedAt(response.data.connectedAt);
      }
    } catch (err) {
      console.error('Error checking connection status:', err);
    }
  }, [token]);

  useEffect(() => {
    checkConnectionStatus();
  }, [checkConnectionStatus]);

  const formatDate = (date) =>
    new Date(date).toLocaleDateString(language === 'tl' ? 'fil-PH' : 'en-US');

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.get('/api/google-classroom/auth/url');
      const authWindow = window.open(
        response.data.authUrl,
        'google-classroom-auth',
        'width=500,height=600'
      );

      if (!authWindow) {
        setError(t('errors.popupBlocked'));
        setLoading(false);
        return;
      }

      const handleMessage = (event) => {
        if (event.data?.type !== 'google-classroom-auth') {
          return;
        }

        const code = event.data.code;
        if (code) {
          completeAuth(code);
        } else if (event.data.error) {
          setError(t('errors.authFailed', { error: event.data.error }));
          setLoading(false);
        }

        authWindow.close();
        window.removeEventListener('message', handleMessage);
      };

      window.addEventListener('message', handleMessage);

      const checkWindow = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkWindow);
          window.removeEventListener('message', handleMessage);
          setLoading(false);
        }
      }, 1000);
    } catch (err) {
      console.error('Error connecting to Google Classroom:', err);
      setError(err?.response?.data?.message || t('errors.connectClassroom'));
      setLoading(false);
    }
  };

  const completeAuth = async (code) => {
    try {
      const response = await axios.post(
        '/api/google-classroom/auth/callback',
        { code },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setConnected(true);
      setConnectedAt(response.data.credentials.connectedAt);
      setSuccess(t('classroom.connectedSuccess'));
      setError('');
      setLoading(false);
      handleSync();
    } catch (err) {
      console.error('Error completing auth:', err);
      setError(err.response?.data?.message || t('errors.connectClassroom'));
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError('');

      const response = await axios.post('/api/google-classroom/sync', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess(t('classroom.synced', { count: response.data.count }));

      if (onSync) {
        onSync(response.data.assignments || []);
      }
    } catch (err) {
      console.error('Error syncing assignments:', err);

      const payload = err?.response?.data;
      const message = payload?.message;
      const details = payload?.details;
      let nextError = t('errors.syncAssignments');

      if (message) nextError = message;
      if (!message && details) {
        nextError =
          typeof details === 'string'
            ? `${t('errors.syncAssignments')}: ${details}`
            : `${t('errors.syncAssignments')}: ${JSON.stringify(details)}`;
      }
      if (!message && !details && payload) {
        nextError = `${t('errors.syncAssignments')}: ${JSON.stringify(payload)}`;
      }

      setError(nextError);
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      await axios.post(
        '/api/google-classroom/disconnect',
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setConnected(false);
      setConnectedAt(null);
      setSuccess(t('classroom.disconnectedSuccess'));
      setError('');
      if (onSync) {
        onSync([]);
      }
    } catch (err) {
      console.error('Error disconnecting:', err);
      setError(err.response?.data?.message || t('errors.disconnectClassroom'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="google-classroom-connect">
      <h3>{t('classroom.title')}</h3>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="connection-status">
        {connected ? (
          <>
            <div className="status-indicator connected">OK {t('common.connected')}</div>
            {connectedAt && (
              <p className="connected-at">
                {t('classroom.connectedOn', { date: formatDate(connectedAt) })}
              </p>
            )}

            <div className="button-group">
              <button
                onClick={handleSync}
                disabled={syncing || loading}
                className="btn btn-primary"
              >
                {syncing ? t('classroom.syncing') : t('classroom.syncAssignments')}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={loading || syncing}
                className="btn btn-secondary"
              >
                {loading ? t('classroom.disconnecting') : t('classroom.disconnect')}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="status-indicator disconnected">
              X {t('common.notConnected')}
            </div>
            <p className="info-text">
              {t('classroom.connectInfo')}
            </p>
            <button
              onClick={handleConnect}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? t('classroom.connecting') : t('classroom.connect')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default GoogleClassroomConnect;
