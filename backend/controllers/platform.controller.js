const User = require('../models/User');
const { fetchLeetCodeStats } = require('../utils/leetcode');
const { fetchCodeforcesStats, fetchCodeforcesProblems } = require('../utils/codeforces');
const { fetchCodeChefStats } = require('../utils/codechef');
const { fetchAtCoderStats } = require('../utils/atcoder');

// Refresh LeetCode stats on demand
const refreshLeetCode = async (req, res, next) => {
  try {
    const username = req.params.username;
    const stats = await fetchLeetCodeStats(username);

    if (req.user && req.user.platforms?.leetcode === username) {
      await User.findByIdAndUpdate(req.user._id, {
        'platformStats.leetcode': {
          totalSolved: stats.totalSolved,
          easySolved: stats.easySolved,
          mediumSolved: stats.mediumSolved,
          hardSolved: stats.hardSolved,
          ranking: stats.ranking,
          rating: stats.rating,
          contestsAttended: stats.contestsAttended,
          lastFetched: stats.lastFetched,
        },
      });
    }

    res.json({ success: true, stats });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Refresh Codeforces stats on demand
const refreshCodeforces = async (req, res, next) => {
  try {
    const handle = req.params.handle;
    const [stats, problemsSolved] = await Promise.all([
      fetchCodeforcesStats(handle),
      fetchCodeforcesProblems(handle),
    ]);

    const result = { ...stats, problemsSolved };

    if (req.user && req.user.platforms?.codeforces === handle) {
      await User.findByIdAndUpdate(req.user._id, {
        'platformStats.codeforces': {
          rating: result.rating,
          rank: result.rank,
          maxRating: result.maxRating,
          problemsSolved: result.problemsSolved,
          contestsAttended: result.contestsAttended,
          lastFetched: result.lastFetched,
        },
      });
    }

    res.json({ success: true, stats: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Refresh all platform stats for the logged-in user (LeetCode + Codeforces + CodeChef)
const refreshAllStats = async (req, res, next) => {
  try {
    const user = req.user;
    const results = {};
    const promises = [];

    if (user.platforms?.leetcode) {
      promises.push(
        fetchLeetCodeStats(user.platforms.leetcode)
          .then((s) => { results.leetcode = s; })
          .catch((e) => { results.leetcode = { error: e.message }; })
      );
    }

    if (user.platforms?.codeforces) {
      promises.push(
        Promise.all([
          fetchCodeforcesStats(user.platforms.codeforces),
          fetchCodeforcesProblems(user.platforms.codeforces),
        ])
          .then(([s, p]) => { results.codeforces = { ...s, problemsSolved: p }; })
          .catch((e) => { results.codeforces = { error: e.message }; })
      );
    }

    if (user.platforms?.codechef) {
      promises.push(
        fetchCodeChefStats(user.platforms.codechef)
          .then((s) => { results.codechef = s; })
          .catch((e) => { results.codechef = { error: e.message }; })
      );
    }

    if (user.platforms?.atcoder) {
      promises.push(
        fetchAtCoderStats(user.platforms.atcoder)
          .then((s) => { results.atcoder = s; })
          .catch((e) => { results.atcoder = { error: e.message }; })
      );
    }

    await Promise.all(promises);

    // Update MongoDB
    const updateObj = {};
    if (results.leetcode && !results.leetcode.error) {
      updateObj['platformStats.leetcode'] = {
        totalSolved: results.leetcode.totalSolved,
        easySolved: results.leetcode.easySolved,
        mediumSolved: results.leetcode.mediumSolved,
        hardSolved: results.leetcode.hardSolved,
        ranking: results.leetcode.ranking,
        rating: results.leetcode.rating,
        contestsAttended: results.leetcode.contestsAttended,
        lastFetched: results.leetcode.lastFetched,
      };
    }
    if (results.codeforces && !results.codeforces.error) {
      updateObj['platformStats.codeforces'] = {
        rating: results.codeforces.rating,
        rank: results.codeforces.rank,
        maxRating: results.codeforces.maxRating,
        problemsSolved: results.codeforces.problemsSolved,
        contestsAttended: results.codeforces.contestsAttended,
        lastFetched: results.codeforces.lastFetched,
      };
    }
    if (results.codechef && !results.codechef.error) {
      updateObj['platformStats.codechef'] = {
        rating: results.codechef.rating,
        stars: results.codechef.stars,
        problemsSolved: results.codechef.problemsSolved,
        highestRating: results.codechef.highestRating,
        globalRank: results.codechef.globalRank,
        contestsAttended: results.codechef.contestsAttended,
        lastFetched: results.codechef.lastFetched,
      };
    }
    if (results.atcoder && !results.atcoder.error) {
      updateObj['platformStats.atcoder'] = {
        rating: results.atcoder.rating,
        highestRating: results.atcoder.highestRating,
        rank: results.atcoder.rank,
        problemsSolved: results.atcoder.problemsSolved,
        contestsAttended: results.atcoder.contestsAttended,
        lastFetched: results.atcoder.lastFetched,
      };
    }

    if (Object.keys(updateObj).length > 0) {
      await User.findByIdAndUpdate(user._id, updateObj);
    }

    res.json({ success: true, results });
  } catch (error) {
    next(error);
  }
};

// Refresh CodeChef stats on demand
const refreshCodeChef = async (req, res, next) => {
  try {
    const username = req.params.username;
    const stats = await fetchCodeChefStats(username);

    if (req.user && req.user.platforms?.codechef === username) {
      await User.findByIdAndUpdate(req.user._id, {
        'platformStats.codechef': {
          rating: stats.rating,
          stars: stats.stars,
          problemsSolved: stats.problemsSolved,
          highestRating: stats.highestRating,
          globalRank: stats.globalRank,
          contestsAttended: stats.contestsAttended,
          lastFetched: stats.lastFetched,
        },
      });
    }

    res.json({ success: true, stats });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Refresh AtCoder stats on demand
const refreshAtCoder = async (req, res, next) => {
  try {
    const username = req.params.username;
    const stats = await fetchAtCoderStats(username);

    if (req.user && req.user.platforms?.atcoder === username) {
      await User.findByIdAndUpdate(req.user._id, {
        'platformStats.atcoder': {
          rating: stats.rating,
          highestRating: stats.highestRating,
          rank: stats.rank,
          problemsSolved: stats.problemsSolved,
          contestsAttended: stats.contestsAttended,
          lastFetched: stats.lastFetched,
        },
      });
    }

    res.json({ success: true, stats });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = { refreshLeetCode, refreshCodeforces, refreshCodeChef, refreshAtCoder, refreshAllStats };
