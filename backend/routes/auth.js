const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { sendResetEmail, sendWelcomeEmail } = require('../utils/email');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Sign up
router.post('/signup', async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;
    const email = req.body.email?.trim().toLowerCase();

    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({
        message: 'This email is already connected to an account. Please log in using that email.'
      });
    }

    const newUser = await User.create(username, email, password);

    // Send welcome email (non-blocking)
    sendWelcomeEmail(email, username).catch(err => console.error('Welcome email error:', err));

    const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET, {
      expiresIn: '7d'
    });

    res.json({ token, user: newUser });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Error creating user' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const identifier = username || email;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Username/email and password are required' });
    }

    console.log('[auth/login] identifier:', identifier);

    const user = await User.findByUsernameOrEmail(identifier);
    if (!user) {
      console.warn('[auth/login] user not found for:', identifier);
      return res.status(401).json({ message: 'Invalid username/email or password' });
    }

    if (typeof user.password !== 'string' || !user.password.length) {
      console.warn('[auth/login] user password missing/invalid in DB. userId:', user.id, 'email:', user.email);
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const looksLikeBcryptHash = user.password.startsWith('$2');
    console.log('[auth/login] password format:', looksLikeBcryptHash ? 'bcrypt' : 'legacy/plaintext');

    const isPasswordValid = looksLikeBcryptHash
      ? bcrypt.compareSync(password, user.password)
      : password === user.password; // legacy plaintext fallback

    if (!isPasswordValid) {
      console.warn('[auth/login] password mismatch. userId:', user.id, 'email:', user.email);
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // If legacy plaintext matched, upgrade it to a bcrypt hash now.
    if (!looksLikeBcryptHash) {
      console.log('[auth/login] upgrading legacy plaintext password to bcrypt. userId:', user.id);
      await User.updatePassword(user.email, password);
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: '7d'
    });

    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Error during login' });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'Email not found' });
    }

    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await User.setResetToken(email, resetToken, expires.toISOString());

    // Build the frontend URL for the reset link.
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const requestBaseUrl = `${protocol}://${host}`;
    const baseUrl = process.env.FRONTEND_URL || requestBaseUrl.replace(/:5000$/, ':3000');

    await sendResetEmail(email, resetToken, baseUrl);

    res.json({ message: 'Password reset link sent to your email' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Error processing request' });
  }
});

// Verify reset token
router.get('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    const user = await User.findByResetToken(token);
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    res.json({ valid: true, email: user.email });
  } catch (err) {
    console.error('Verify token error:', err);
    res.status(500).json({ message: 'Error verifying token' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const user = await User.findByResetToken(token);
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Check if new password is the same as the old one
    const isSamePassword = bcrypt.compareSync(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ message: 'No previous passwords — please choose a different password' });
    }

    await User.updatePassword(user.email, newPassword);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Error updating password' });
  }
});

module.exports = router;
