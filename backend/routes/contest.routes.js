const express = require('express');
const { getContests, getMyLogs } = require('../controllers/contest.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Public route - no auth needed
router.get('/', getContests);

// Protected route - requires login
router.get('/my-logs', protect, getMyLogs);

module.exports = router;
