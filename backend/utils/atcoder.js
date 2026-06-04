const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Fetch AtCoder stats by combining HTML scraping and Kenkoooo API
 */
const fetchAtCoderStats = async (username) => {
  try {
    const profileUrl = `https://atcoder.jp/users/${username}`;
    const statsUrl = `https://kenkoooo.com/atcoder/atcoder-api/v3/user/ac_rank?user=${username}`;

    // Fetch in parallel
    const [profileRes, statsRes] = await Promise.all([
      axios.get(profileUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        },
        timeout: 10000
      }).catch(err => {
        if (err.response?.status === 404) {
          throw new Error('AtCoder user not found');
        }
        throw err;
      }),
      axios.get(statsUrl, { timeout: 8000 }).catch(() => null)
    ]);

    const $ = cheerio.load(profileRes.data);

    // Extract Rating
    const ratingText = $('table tr:contains("Rating") td').first().text().trim();
    const ratingMatch = ratingText.match(/(\d+)/);
    const rating = ratingMatch ? parseInt(ratingMatch[1], 10) : 0;

    // Extract Highest Rating
    const highestText = $('table tr:contains("Highest Rating") td').text().trim();
    const highestMatch = highestText.match(/(\d+)/);
    const highestRating = highestMatch ? parseInt(highestMatch[1], 10) : rating;

    // Extract Rank
    const rankText = $('table tr:contains("Rank") td').first().text().trim();

    // Extract Contests Attended
    const matchesText = $('table tr:contains("Rated Matches") td').first().text().trim();
    const contestsAttended = parseInt(matchesText, 10) || 0;

    // Problems Solved from Kenkoooo API
    const problemsSolved = statsRes?.data?.count || 0;

    return {
      username,
      rating,
      highestRating,
      rank: rankText || 'unrated',
      contestsAttended,
      problemsSolved,
      lastFetched: new Date(),
    };
  } catch (error) {
    if (error.message === 'AtCoder user not found') {
      throw error;
    }
    throw new Error(`Failed to fetch AtCoder stats: ${error.message}`);
  }
};

module.exports = { fetchAtCoderStats };
