const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Fetch upcoming LeetCode contests via public GraphQL
 */
const fetchLeetCodeContests = async () => {
  try {
    const query = 'query { topTwoContests { title startTime duration titleSlug } }';
    const res = await axios.post('https://leetcode.com/graphql', { query }, { timeout: 8000 });
    const contests = res.data?.data?.topTwoContests || [];
    return contests.map(c => ({
      name: c.title,
      url: `https://leetcode.com/contest/${c.titleSlug}`,
      startTime: new Date(c.startTime * 1000),
      endTime: new Date((c.startTime + c.duration) * 1000),
      duration: c.duration,
      site: 'LeetCode',
      inRecentFuture: false,
      status: 'BEFORE',
    }));
  } catch (e) {
    console.error('Error fetching LeetCode contests:', e.message);
    return [];
  }
};

/**
 * Fetch upcoming Codeforces contests via public REST API
 */
const fetchCodeforcesContests = async () => {
  try {
    const res = await axios.get('https://codeforces.com/api/contest.list?gym=false', { timeout: 8000 });
    if (res.data.status !== 'OK') return [];
    const now = new Date();
    return res.data.result
      .filter(c => c.phase === 'BEFORE' || (c.phase === 'CODING' && new Date((c.startTimeSeconds + c.durationSeconds) * 1000) > now))
      .map(c => ({
        name: c.name,
        url: `https://codeforces.com/contest/${c.id}`,
        startTime: new Date(c.startTimeSeconds * 1000),
        endTime: new Date((c.startTimeSeconds + c.durationSeconds) * 1000),
        duration: c.durationSeconds,
        site: 'CodeForces',
        inRecentFuture: false,
        status: c.phase,
      }));
  } catch (e) {
    console.error('Error fetching Codeforces contests:', e.message);
    return [];
  }
};

/**
 * Fetch upcoming CodeChef contests via public REST API
 */
const fetchCodeChefContests = async () => {
  try {
    const res = await axios.get('https://www.codechef.com/api/list/contests/all?page=1&sortBy=start_date&sortOrder=asc', { timeout: 8000 });
    const contests = res.data?.future_contests || [];
    return contests.map(c => {
      const startTime = new Date(c.contest_start_date_iso);
      const durationSec = parseInt(c.contest_duration, 10) * 60;
      const endTime = new Date(c.contest_end_date_iso);
      return {
        name: c.contest_name,
        url: `https://www.codechef.com/${c.contest_code}`,
        startTime,
        endTime,
        duration: durationSec,
        site: 'CodeChef',
        inRecentFuture: false,
        status: 'BEFORE',
      };
    });
  } catch (e) {
    console.error('Error fetching CodeChef contests:', e.message);
    return [];
  }
};

/**
 * Fetch upcoming AtCoder contests via scraping
 */
const fetchAtCoderContests = async () => {
  try {
    const res = await axios.get('https://atcoder.jp/contests/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    const $ = cheerio.load(res.data);
    const contests = [];

    const table = $('#contest-table-upcoming table tbody tr');
    table.each((i, el) => {
      const tds = $(el).find('td');
      if (tds.length >= 4) {
        const timeText = $(tds[0]).find('time').text().trim() || $(tds[0]).text().trim();
        const nameLink = $(tds[1]).find('a').last();
        const name = nameLink.text().trim();
        const path = nameLink.attr('href') || '';
        const url = path.startsWith('http') ? path : `https://atcoder.jp${path}`;
        
        const durationText = $(tds[2]).text().trim();
        
        let isoStr = timeText.replace(' ', 'T');
        const startTime = new Date(isoStr);

        let durationSec = 0;
        const parts = durationText.split(':');
        if (parts.length === 2) {
          durationSec = (parseInt(parts[0], 10) * 3600) + (parseInt(parts[1], 10) * 60);
        }

        const endTime = new Date(startTime.getTime() + durationSec * 1000);

        contests.push({
          name,
          url,
          startTime,
          endTime,
          duration: durationSec,
          site: 'AtCoder',
          inRecentFuture: false,
          status: 'BEFORE',
        });
      }
    });

    return contests;
  } catch (e) {
    console.error('Error fetching AtCoder contests:', e.message);
    return [];
  }
};

/**
 * Fetch upcoming contests — merged and sorted from all four platforms
 */
const fetchContests = async () => {
  const [lc, cf, cc, ac] = await Promise.all([
    fetchLeetCodeContests(),
    fetchCodeforcesContests(),
    fetchCodeChefContests(),
    fetchAtCoderContests(),
  ]);

  const now = new Date();
  const allContests = [...lc, ...cf, ...cc, ...ac]
    .filter(c => c.endTime > now)
    .map(c => {
      const diffHrs = (c.startTime - now) / 3600000;
      return {
        ...c,
        inRecentFuture: diffHrs > 0 && diffHrs <= 24,
      };
    })
    .sort((a, b) => a.startTime - b.startTime);

  return allContests;
};

/**
 * Get platform icon/color mapping
 */
const getPlatformMeta = (site) => {
  const map = {
    LeetCode:   { color: '#FFA116', icon: '⚡' },
    CodeForces: { color: '#1F8ACB', icon: '🔵' },
    CodeChef:   { color: '#B17F59', icon: '👨‍🍳' },
    AtCoder:    { color: '#FF0000', icon: '🔴' },
  };
  return map[site] || { color: '#6366f1', icon: '🏅' };
};

module.exports = { fetchContests, getPlatformMeta };
