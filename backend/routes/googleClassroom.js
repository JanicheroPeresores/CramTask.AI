const express = require('express');
const authMiddleware = require('../middleware/auth');
const GoogleClassroomCredentials = require('../models/GoogleClassroomCredentials');
const GoogleClassroomAssignment = require('../models/GoogleClassroomAssignment');
const {
  getAuthorizationUrl,
  getAccessToken,
  syncAllAssignments,
} = require('../utils/googleClassroom');

const router = express.Router();

const encodeOAuthState = (value) => Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');

const decodeOAuthState = (state) => {
  if (!state) return {};

  try {
    return JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
  } catch (err) {
    return {};
  }
};

const getRequestOrigin = (req) => {
  if (req.get('origin')) return req.get('origin');
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;

  try {
    return new URL(req.get('referer')).origin;
  } catch (err) {
    return `${req.protocol}://${req.get('host')}`;
  }
};

const buildOAuthCallbackHtml = ({ code = '', error = '', targetOrigin }) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Google Classroom Authorization</title>
  </head>
  <body>
    <p>You can close this window.</p>
    <script>
      if (window.opener) {
        window.opener.postMessage({
          type: 'google-classroom-auth',
          code: ${JSON.stringify(code)},
          error: ${JSON.stringify(error)}
        }, ${JSON.stringify(targetOrigin || '*')});
      }
      window.close();
    </script>
  </body>
</html>`;

// Get authorization URL for connecting Google Classroom
router.get('/auth/url', (req, res) => {
  try {
    const url = getAuthorizationUrl(encodeOAuthState({ origin: getRequestOrigin(req) }));

    try {
      const parsed = new URL(url);
      const redirectUri = parsed.searchParams.get('redirect_uri');
      const clientId = parsed.searchParams.get('client_id');
      console.log('[googleClassroom/auth/url] redirect_uri:', redirectUri);
      console.log('[googleClassroom/auth/url] client_id:', clientId);
    } catch (e) {
      console.log('[googleClassroom/auth/url] authUrl:', url);
    }

    res.json({ authUrl: url });
  } catch (err) {
    console.error('Error getting auth URL:', err);
    res.status(500).json({
      message: err?.message || 'Error generating authorization URL',
    });
  }
});

// Browser redirect target for Google OAuth. The popup sends the code back to React.
router.get('/auth/callback', (req, res) => {
  const { code, error, state } = req.query;
  const { origin } = decodeOAuthState(state);

  res
    .status(error ? 400 : 200)
    .type('html')
    .send(buildOAuthCallbackHtml({ code, error, targetOrigin: origin }));
});

// Handle OAuth callback
router.post('/auth/callback', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.userId;

    if (!code) {
      return res.status(400).json({ message: 'Authorization code is required' });
    }

    // Exchange code for tokens
    const tokens = await getAccessToken(code);

    // Save tokens to database
    const credentials = await GoogleClassroomCredentials.save(
      userId,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expiry_date ? new Date(tokens.expiry_date) : null
    );

    res.json({
      message: 'Google Classroom connected successfully',
      credentials: {
        id: credentials.id,
        connectedAt: credentials.created_at,
      },
    });
  } catch (err) {
    console.error('Error handling OAuth callback:', err);
    res.status(500).json({ message: 'Error connecting Google Classroom' });
  }
});

// Sync assignments from Google Classroom
router.post('/sync', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    // Get stored credentials
    const credentials = await GoogleClassroomCredentials.getByUserId(userId);

    if (!credentials) {
      return res.status(400).json({
        message: 'Google Classroom not connected. Please authenticate first.',
      });
    }

    // Sync assignments
    const assignments = await syncAllAssignments(credentials, userId);

    // Save the current Google Classroom snapshot and remove work that disappeared.
    const savedAssignments = await GoogleClassroomAssignment.replaceForUser(
      userId,
      assignments
    );

    res.json({
      message: 'Assignments synced successfully',
      count: savedAssignments.length,
      assignments: savedAssignments,
    });
  } catch (err) {
    console.error('Error syncing assignments:', err);

    const status = err?.response?.status || 500;
    const details = err?.response?.data || err?.message || String(err);

    res.status(status).json({
      message:
        (err?.response?.data && err.response.data.message) ||
        err?.message ||
        (typeof details === 'string' ? details : JSON.stringify(details)),
      details,
    });
  }
});

// Get synced Google Classroom assignments
router.get('/assignments', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const assignments = await GoogleClassroomAssignment.getByUserId(userId);

    res.json({ assignments });
  } catch (err) {
    console.error('Error fetching Google Classroom assignments:', err);
    res.status(500).json({ message: 'Error fetching assignments' });
  }
});

// Get connection status
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const credentials = await GoogleClassroomCredentials.getByUserId(userId);

    if (credentials) {
      res.json({
        connected: true,
        connectedAt: credentials.created_at,
        lastUpdated: credentials.updated_at,
      });
    } else {
      res.json({ connected: false });
    }
  } catch (err) {
    console.error('Error getting connection status:', err);
    res.status(500).json({ message: 'Error getting connection status' });
  }
});

// Disconnect Google Classroom
router.post('/disconnect', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    // Delete credentials
    await GoogleClassroomCredentials.delete(userId);

    await GoogleClassroomAssignment.deleteByUserId(userId);

    res.json({ message: 'Google Classroom disconnected successfully' });
  } catch (err) {
    console.error('Error disconnecting Google Classroom:', err);
    res.status(500).json({ message: 'Error disconnecting Google Classroom' });
  }
});

module.exports = router;
