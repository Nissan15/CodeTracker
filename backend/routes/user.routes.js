const express = require('express');
const { getPublicProfile, updateProfile, getDashboard } = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/dashboard', protect, getDashboard);
router.put('/profile', protect, updateProfile);
router.get('/:username', getPublicProfile);

module.exports = router;
