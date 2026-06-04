const { fetchContests, getPlatformMeta } = require('../utils/contests');
const ContestLog = require('../models/ContestLog');

// GET /api/contests — Live upcoming contests
const getContests = async (req, res, next) => {
  try {
    const { platform } = req.query;
    let contests = await fetchContests();

    if (platform) {
      contests = contests.filter((c) => c.site.toLowerCase().includes(platform.toLowerCase()));
    }

    // Enrich with platform metadata
    contests = contests.map((c) => ({
      ...c,
      meta: getPlatformMeta(c.site),
    }));

    res.json({ success: true, count: contests.length, contests });
  } catch (error) {
    res.status(503).json({ success: false, message: error.message });
  }
};

// GET /api/contests/my-logs — Logs for the logged-in user
const getMyLogs = async (req, res, next) => {
  try {
    const logs = await ContestLog.find({ userId: req.user._id }).sort({ startTime: -1 });
    res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getContests, getMyLogs };
