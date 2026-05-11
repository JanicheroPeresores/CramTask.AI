import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './GoogleClassroomConnect.css';

function GoogleClassroomConnect({ onSync }) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connectedAt, setConnectedAt] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('token');

  // Check connection status on component mount
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
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
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError('');

      // Get authorization URL
      const response = await axios.get('/api/google-classroom/auth/url');
      const authUrl = response.data.authUrl;

      // Open authorization URL in new window
      const authWindow = window.open(
        authUrl,
        'google-classroom-auth',
        'width=500,height=600'
      );

      if (!authWindow) {
        setError('Popup blocked. Please allow popups and try connecting again.');
        setLoading(false);
        return;
      }

      const expectedAuthOrigin = new URL(authUrl).origin;

      // Listen for message from auth window
      const handleMessage = (event) => {
        if (
          ![window.location.origin, expectedAuthOrigin].includes(event.origin) ||
          event.data?.type !== 'google-classroom-auth'
        ) {
          return;
        }

        if (event.data.type === 'google-classroom-auth') {
          const code = event.data.code;

          if (code) {
            // Send authorization code to backend
            completeAuth(code);
          } else if (event.data.error) {
            setError('Authorization failed: ' + event.data.error);
            setLoading(false);
          }

          authWindow.close();
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);

      // Fallback: Check if window was closed
      const checkWindow = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkWindow);
          window.removeEventListener('message', handleMessage);
          setLoading(false);
        }
      }, 1000);
    } catch (err) {
      console.error('Error connecting to Google Classroom:', err);
      setError('Error connecting to Google Classroom. Please try again.');
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
      setSuccess('Google Classroom connected successfully!');
      setError('');
      setLoading(false);

      // Automatically sync assignments after connecting
      handleSync();
    } catch (err) {
      console.error('Error completing auth:', err);
      setError(
        err.response?.data?.message || 'Error connecting to Google Classroom'
      );
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

      setSuccess(
        `Successfully synced ${response.data.count} assignments from Google Classroom!`
      );

      // Notify parent component to refresh assignments
      if (onSync) {
        onSync();
      }
    } catch (err) {
      console.error('Error syncing assignments:', err);
      setError(
        err.response?.data?.message || 'Error syncing assignments'
      );
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
      setSuccess('Google Classroom disconnected.');
      setError('');
    } catch (err) {
      console.error('Error disconnecting:', err);
      setError(
        err.response?.data?.message || 'Error disconnecting Google Classroom'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="google-classroom-connect">
      <h3>Google Classroom Integration</h3>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="connection-status">
        {connected ? (
          <>
            <div className="status-indicator connected">✓ Connected</div>
            {connectedAt && (
              <p className="connected-at">
                Connected on {new Date(connectedAt).toLocaleDateString()}
              </p>
            )}

            <div className="button-group">
              <button
                onClick={handleSync}
                disabled={syncing || loading}
                className="btn btn-primary"
              >
                {syncing ? 'Syncing...' : 'Sync Assignments'}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={loading || syncing}
                className="btn btn-secondary"
              >
                {loading ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="status-indicator disconnected">
              ✗ Not Connected
            </div>
            <p className="info-text">
              Connect your Google Classroom account to automatically sync your
              assignments.
            </p>
            <button
              onClick={handleConnect}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Connecting...' : 'Connect Google Classroom'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default GoogleClassroomConnect;
