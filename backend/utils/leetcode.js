const axios = require('axios');

const LEETCODE_GRAPHQL = 'https://leetcode.com/graphql';

/**
 * Fetch LeetCode user stats via public GraphQL API
 */
const fetchLeetCodeStats = async (username) => {
  const query = `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          ranking
          userAvatar
          realName
          aboutMe
          starRating
          reputation
          solutionCount
        }
        submitStats: submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
            submissions
          }
        }
        badges {
          id
          displayName
          icon
          creationDate
        }
        userCalendar {
          activeYears
          streak
          totalActiveDays
          submissionCalendar
        }
      }
      userContestRanking(username: $username) {
        attendedContestsCount
        rating
        globalRanking
        totalParticipants
        topPercentage
      }
    }
  `;

  const response = await axios.post(
    LEETCODE_GRAPHQL,
    { query, variables: { username } },
    {
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com',
        'User-Agent': 'Mozilla/5.0',
      },
      timeout: 10000,
    }
  );

  const data = response.data?.data;
  if (!data?.matchedUser) throw new Error('LeetCode user not found');

  const user = data.matchedUser;
  const acStats = user.submitStats?.acSubmissionNum || [];

  const getCount = (diff) => acStats.find((s) => s.difficulty === diff)?.count || 0;

  return {
    username,
    avatar: user.profile?.userAvatar || '',
    ranking: user.profile?.ranking || 0,
    totalSolved: getCount('All'),
    easySolved: getCount('Easy'),
    mediumSolved: getCount('Medium'),
    hardSolved: getCount('Hard'),
    rating: Math.round(data.userContestRanking?.rating || 0),
    contestsAttended: data.userContestRanking?.attendedContestsCount || 0,
    streak: user.userCalendar?.streak || 0,
    totalActiveDays: user.userCalendar?.totalActiveDays || 0,
    submissionCalendar: user.userCalendar?.submissionCalendar || '{}',
    lastFetched: new Date(),
  };
};

module.exports = { fetchLeetCodeStats };
