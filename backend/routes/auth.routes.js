const express = require('express');
const passport = require('passport');
const { register, login, getMe, googleCallback } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Email/password auth
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

// Google OAuth
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login.html?error=auth_failed`, session: false }),
  googleCallback
);

module.exports = router;
