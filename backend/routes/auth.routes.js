const express = require('express');
const passport = require('passport');
const { register, login, getMe, googleCallback } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Email/password auth
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

// Google OAuth — only register routes if credentials are configured
const googleConfigured =
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL;

if (googleConfigured) {
  router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })
  );
  router.get(
    '/google/callback',
    passport.authenticate('google', {
      failureRedirect: `${process.env.FRONTEND_URL}/login.html?error=auth_failed`,
      session: false,
    }),
    googleCallback
  );
} else {
  router.get('/google', (req, res) =>
    res.status(503).json({ success: false, message: 'Google OAuth is not configured on this server.' })
  );
  router.get('/google/callback', (req, res) =>
    res.status(503).json({ success: false, message: 'Google OAuth is not configured on this server.' })
  );
}

module.exports = router;
