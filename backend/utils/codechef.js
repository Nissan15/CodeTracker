const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Fetch CodeChef user stats by scraping the user's profile page directly
 */
const fetchCodeChefStats = async (username) => {
  try {
    const url = `https://www.codechef.com/users/${username}`;
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      },
      timeout: 12000
    });

    const $ = cheerio.load(res.data);

    // Current Rating
    const currentRating = parseInt($('.rating-number').first().text().trim(), 10) || 0;

    // Fail-safe check to verify the page has actual rating metrics structure
    if (currentRating === 0 && !$('.rating-header').length) {
      throw new Error(`CodeChef user "${username}" not found or page layout invalid`);
    }

    // Stars
    const starsCount = $('.rating-star span').length;
    const stars = starsCount ? `${starsCount} ★` : '';

    // Highest Rating
    const smallText = $('.rating-header small').text();
    const highestRatingMatch = smallText.match(/Highest Rating\s*(\d+)/i);
    const highestRating = highestRatingMatch ? parseInt(highestRatingMatch[1], 10) : currentRating;

    // Global and Country Ranks
    const globalRankText = $('.rating-ranks li').first().find('strong').text().trim();
    const globalRank = parseInt(globalRankText, 10) || globalRankText || 0;

    const countryRankText = $('.rating-ranks li').eq(1).find('strong').text().trim();
    const countryRank = parseInt(countryRankText, 10) || countryRankText || 0;

    // Problems Solved
    const solvedHeader = $('h3:contains("Total Problems Solved")').text().trim();
    const solvedMatch = solvedHeader.match(/Total Problems Solved:\s*(\d+)/i);
    const problemsSolved = solvedMatch ? parseInt(solvedMatch[1], 10) : 0;

    // Contests Attended
    const contestsHeaderText = $('h3:contains("Contests")').text().trim();
    const contestsMatch = contestsHeaderText.match(/Contests\s*\((\d+)\)/i);
    const contestsAttended = contestsMatch ? parseInt(contestsMatch[1], 10) : 0;

    return {
      username,
      rating: currentRating,
      highestRating,
      stars,
      problemsSolved,
      globalRank: globalRank.toString(),
      countryRank: countryRank.toString(),
      contestsAttended,
      lastFetched: new Date(),
    };
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error(`CodeChef user "${username}" not found`);
    }
    throw new Error(`Failed to fetch CodeChef stats: ${error.message}`);
  }
};

module.exports = { fetchCodeChefStats };
