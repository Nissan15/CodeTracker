const axios = require('axios');
const User = require('../models/User');
const ContestSnapshot = require('../models/ContestSnapshot');
const ContestLog = require('../models/ContestLog');
const { fetchLeetCodeStats } = require('./leetcode');
const { fetchCodeforcesStats } = require('./codeforces');
const { fetchCodeChefStats } = require('./codechef');
const { fetchAtCoderStats } = require('./atcoder');

/**
 * Snapshots all users with linked platform usernames before a contest starts
 */
const snapshotUsersBeforeContest = async (contest) => {
  const platform = contest.site; // 'LeetCode' | 'CodeForces' | 'CodeChef' | 'AtCoder'
  const platformKey = platform.toLowerCase(); // 'leetcode' | 'codeforces' | 'codechef' | 'atcoder'
  
  try {
    const query = {};
    query[`platforms.${platformKey}`] = { $ne: '' };
    const users = await User.find(query);

    if (users.length === 0) {
      console.log(`No users found with linked ${platform} profile for snapshot.`);
      return;
    }

    const snapshots = [];
    for (const user of users) {
      const username = user.platforms[platformKey];
      if (!username) continue;

      try {
        // Check if snapshot already exists
        const existing = await ContestSnapshot.findOne({
          userId: user._id,
          contestName: contest.name,
          platform,
        });
        if (existing) continue;

        let countBefore = 0;
        if (platform === 'LeetCode') {
          const stats = await fetchLeetCodeStats(username);
          countBefore = stats.contestsAttended;
        } else if (platform === 'CodeForces') {
          const stats = await fetchCodeforcesStats(username);
          countBefore = stats.contestsAttended;
        } else if (platform === 'CodeChef') {
          const stats = await fetchCodeChefStats(username);
          countBefore = stats.contestsAttended;
        } else if (platform === 'AtCoder') {
          const stats = await fetchAtCoderStats(username);
          countBefore = stats.contestsAttended;
        }

        let contestId = '';
        if (platform === 'CodeForces') {
          contestId = contest.url.split('/').pop();
        }

        snapshots.push({
          userId: user._id,
          platform,
          contestName: contest.name,
          contestId,
          contestUrl: contest.url,
          startTime: contest.startTime,
          endTime: contest.endTime,
          countBefore,
          snapshotAt: new Date(),
          processed: false,
        });
      } catch (err) {
        console.error(`Failed to snapshot user ${user.username || user.email} for ${contest.name}:`, err.message);
      }
    }

    if (snapshots.length > 0) {
      await ContestSnapshot.insertMany(snapshots);
      console.log(`Successfully saved ${snapshots.length} pre-contest snapshots for "${contest.name}"`);
    }
  } catch (err) {
    console.error(`Error during pre-contest snapshot for "${contest.name}":`, err.message);
  }
};

/**
 * Runs attendance detection for a contest after it ends
 */
const runDetectionForContest = async (contestName, platform) => {
  console.log(`Running attendance detection for "${contestName}" on platform ${platform}...`);
  try {
    const snapshots = await ContestSnapshot.find({ contestName, platform, processed: false }).populate('userId');
    if (snapshots.length === 0) {
      console.log(`No unprocessed snapshots found for "${contestName}"`);
      return;
    }

    for (const snapshot of snapshots) {
      const user = snapshot.userId;
      if (!user) continue;

      const platformKey = platform.toLowerCase();
      const username = user.platforms[platformKey];
      if (!username) continue;

      try {
        let attended = false;
        let detectedBy = 'count_delta';

        if (platform === 'CodeForces') {
          // Exact match via rating history API
          detectedBy = 'exact_match';
          const ratingRes = await axios.get(`https://codeforces.com/api/user.rating?handle=${username}`, { timeout: 10000 });
          if (ratingRes.data.status === 'OK') {
            const history = ratingRes.data.result || [];
            const contestIdNum = parseInt(snapshot.contestId, 10);
            attended = history.some(h => h.contestId === contestIdNum);
          }
        } else {
          // Count delta check
          let countAfter = 0;
          if (platform === 'LeetCode') {
            const stats = await fetchLeetCodeStats(username);
            countAfter = stats.contestsAttended;
          } else if (platform === 'CodeChef') {
            const stats = await fetchCodeChefStats(username);
            countAfter = stats.contestsAttended;
          } else if (platform === 'AtCoder') {
            const stats = await fetchAtCoderStats(username);
            countAfter = stats.contestsAttended;
          }

          if (countAfter > snapshot.countBefore) {
            attended = true;
          }
        }

        if (attended) {
          await ContestLog.findOneAndUpdate(
            { userId: user._id, contestName, platform },
            {
              contestUrl: snapshot.contestUrl,
              startTime: snapshot.startTime,
              detectedAt: new Date(),
              detectedBy,
            },
            { upsert: true, new: true }
          );
          console.log(`User ${user.username || user.email} marked as ATTENDED for ${contestName}`);
        }
      } catch (err) {
        console.error(`Failed checking attendance for user ${user.username || user.email}:`, err.message);
      }
    }

    // Mark snapshots as processed
    await ContestSnapshot.updateMany(
      { contestName, platform, processed: false },
      { $set: { processed: true } }
    );
    console.log(`Finished attendance detection for "${contestName}"`);
  } catch (err) {
    console.error(`Error during attendance detection for "${contestName}":`, err.message);
  }
};

module.exports = {
  snapshotUsersBeforeContest,
  runDetectionForContest,
};
