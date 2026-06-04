const axios = require('axios');

const CF_API = 'https://codeforces.com/api';

/**
 * Fetch Codeforces user info and stats
 */
const fetchCodeforcesStats = async (handle) => {
  const [userRes, ratingRes] = await Promise.all([
    axios.get(`${CF_API}/user.info?handles=${handle}`, { timeout: 10000 }),
    axios.get(`${CF_API}/user.rating?handle=${handle}`, { timeout: 10000 }),
  ]);

  if (userRes.data.status !== 'OK') throw new Error('Codeforces user not found');

  const user = userRes.data.result[0];
  const ratingHistory = ratingRes.data.result || [];

  return {
    handle: user.handle,
    avatar: user.avatar || user.titlePhoto || '',
    rating: user.rating || 0,
    maxRating: user.maxRating || 0,
    rank: user.rank || 'unrated',
    maxRank: user.maxRank || 'unrated',
    contribution: user.contribution || 0,
    friendOfCount: user.friendOfCount || 0,
    contestsAttended: ratingHistory.length,
    lastFetched: new Date(),
  };
};

/**
 * Fetch Codeforces problems solved count
 */
const fetchCodeforcesProblems = async (handle) => {
  try {
    const res = await axios.get(`${CF_API}/user.status?handle=${handle}&from=1&count=10000`, {
      timeout: 15000,
    });
    if (res.data.status !== 'OK') return 0;

    const solved = new Set();
    res.data.result.forEach((sub) => {
      if (sub.verdict === 'OK') {
        solved.add(`${sub.problem.contestId}-${sub.problem.index}`);
      }
    });
    return solved.size;
  } catch {
    return 0;
  }
};

module.exports = { fetchCodeforcesStats, fetchCodeforcesProblems };
