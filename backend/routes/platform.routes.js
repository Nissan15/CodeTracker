const express = require('express');
const { refreshLeetCode, refreshCodeforces, refreshCodeChef, refreshAtCoder, refreshAllStats } = require('../controllers/platform.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// All platform routes are protected — user must be logged in
router.use(protect);

router.get('/refresh-all', refreshAllStats);
router.get('/leetcode/:username', refreshLeetCode);
router.get('/codeforces/:handle', refreshCodeforces);
router.get('/codechef/:username', refreshCodeChef);
router.get('/atcoder/:username', refreshAtCoder);

module.exports = router;
