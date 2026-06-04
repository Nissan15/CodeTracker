const express = require('express');
const { protect, adminOnly } = require('../middleware/auth.middleware');
const {
  getOverview,
  getUsers,
  getUserDetail,
  updateUser,
  deleteUser,
  getAllContests,
  getContestUserDetail,
  getContestStats,
  getAllContestLogs,
  getDepartmentComparison,
} = require('../controllers/admin.controller');

const router = express.Router();

// Apply protect and adminOnly to all routes in this file
router.use(protect);
router.use(adminOnly);

router.get('/overview', getOverview);

router.get('/users', getUsers);
router.get('/users/:id', getUserDetail);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

router.get('/contests', getAllContests);
router.get('/contests/detail', getContestUserDetail);
router.get('/contests/stats', getContestStats);
router.get('/contests/logs', getAllContestLogs);

router.get('/departments/comparison', getDepartmentComparison);

module.exports = router;
