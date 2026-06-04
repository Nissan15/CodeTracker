// ─── Dashboard Page Logic ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth()) return;
  loadDashboard();
});

async function loadDashboard() {
  showSkeletons();
  try {
    const [dashRes, contestRes] = await Promise.all([
      API.userAPI.getDashboard(),
      API.contestsAPI.getAll('').catch(() => ({ contests: [] })),
    ]);

    renderUserInfo(dashRes.dashboard.user);
    renderQuickStats(dashRes.dashboard.platformStats);
    renderPlatformStats(dashRes.dashboard.platformStats);
    renderUpcomingContests(contestRes.contests || []);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showSkeletons() {
  ['stat-1', 'stat-2', 'stat-3', 'stat-4'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<div class="skeleton" style="height:60px;border-radius:8px;"></div>';
  });
}

function renderUserInfo(user) {
  const el = document.getElementById('user-greeting');
  if (el) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    el.textContent = `${greeting}, ${user.name?.split(' ')[0]} 👋`;
  }

  // Update profile share link
  const profileLink = document.getElementById('profile-share-link');
  if (profileLink && user.username) {
    profileLink.value = `${window.location.origin}/profile.html?u=${user.username}`;
  }
}

// ─── Quick Stat Cards — overall aggregate across all platforms ────────────────
function renderQuickStats(platformStats) {
  const lc = platformStats?.leetcode;
  const cf = platformStats?.codeforces;
  const cc = platformStats?.codechef;
  const atcoder = platformStats?.atcoder;

  // Total problems solved: LeetCode + Codeforces + CodeChef + AtCoder
  const lcSolved  = lc?.totalSolved    || 0;
  const cfSolved  = cf?.problemsSolved || 0;
  const ccSolved  = cc?.problemsSolved || 0;
  const atcoderSolved = atcoder?.problemsSolved || 0;
  const totalSolved = lcSolved + cfSolved + ccSolved + atcoderSolved;
  const hasSolved = lcSolved || cfSolved || ccSolved || atcoderSolved;

  // Best rating across platforms (highest of the four)
  const ratings = [lc?.rating || 0, cf?.rating || 0, cc?.rating || 0, atcoder?.rating || 0].filter(r => r > 0);
  const bestRating = ratings.length ? Math.max(...ratings) : null;

  // CodeChef stars
  const ccStars = cc?.stars || null;

  // Total contests count / indicators
  const lcContests = lc?.rating > 0 ? '✓' : null;
  const cfContests = cf?.contestsAttended ?? null;

  const items = [
    {
      id: 'stat-1',
      value: hasSolved ? totalSolved : '—',
      label: 'Total Problems Solved',
      icon: '🏆',
      sub: hasSolved ? `LC ${lcSolved} · CF ${cfSolved} · CC ${ccSolved} · AC ${atcoderSolved}` : 'Add usernames in profile',
      color: '#6366f1',
    },
    {
      id: 'stat-2',
      value: lc?.totalSolved ?? '—',
      label: 'LeetCode Solved',
      icon: '⚡',
      sub: lc?.rating ? `Contest Rating: ${lc.rating}` : 'Not fetched yet',
      color: '#FFA116',
    },
    {
      id: 'stat-3',
      value: cf?.rating ?? '—',
      label: 'Codeforces Rating',
      icon: '🔵',
      sub: cf?.rank ? `Rank: ${cf.rank}` : 'Not fetched yet',
      color: '#1F8ACB',
    },
    {
      id: 'stat-4',
      value: cc?.rating ?? '—',
      label: 'CodeChef Rating',
      icon: '👨‍🍳',
      sub: cc?.stars ? `Stars: ${cc.stars}` : 'Not fetched yet',
      color: '#B17F59',
    },
  ];

  items.forEach(({ id, value, label, icon, sub, color }) => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = `
        <div class="stat-icon" style="color:${color};font-size:1.3rem;">${icon}</div>
        <div class="stat-value">${value}</div>
        <div class="stat-label">${label}</div>
        <div style="font-size:0.68rem;color:var(--text-muted);margin-top:4px;">${sub}</div>
      `;
    }
  });
}

// ─── Platform Stats Cards (LeetCode + Codeforces + CodeChef) ─────────────────
function renderPlatformStats(platformStats) {
  const container = document.getElementById('platform-stats-grid');
  if (!container) return;

  const platforms = [
    {
      key: 'leetcode',
      name: 'LeetCode',
      color: '#FFA116',
      icon: '⚡',
      stats: platformStats?.leetcode,
      fields: [
        { label: 'Total Solved',     key: 'totalSolved' },
        { label: 'Easy',             key: 'easySolved',    color: '#10b981' },
        { label: 'Medium',           key: 'mediumSolved',  color: '#f59e0b' },
        { label: 'Hard',             key: 'hardSolved',    color: '#ef4444' },
        { label: 'Contest Rating',   key: 'rating' },
        { label: 'Global Rank',      key: 'ranking' },
        { label: 'Contests Attended', key: 'contestsAttended' },
      ],
    },
    {
      key: 'codeforces',
      name: 'Codeforces',
      color: '#1F8ACB',
      icon: '🔵',
      stats: platformStats?.codeforces,
      fields: [
        { label: 'Rating',           key: 'rating' },
        { label: 'Max Rating',       key: 'maxRating' },
        { label: 'Rank',             key: 'rank' },
        { label: 'Problems Solved',  key: 'problemsSolved' },
        { label: 'Contests Attended', key: 'contestsAttended' },
      ],
    },
    {
      key: 'codechef',
      name: 'CodeChef',
      color: '#B17F59',
      icon: '👨‍🍳',
      stats: platformStats?.codechef,
      fields: [
        { label: 'Rating',           key: 'rating' },
        { label: 'Highest Rating',   key: 'highestRating' },
        { label: 'Stars',            key: 'stars' },
        { label: 'Problems Solved',  key: 'problemsSolved' },
        { label: 'Global Rank',      key: 'globalRank' },
        { label: 'Contests Attended', key: 'contestsAttended' },
      ],
    },
    {
      key: 'atcoder',
      name: 'AtCoder',
      color: '#FF0000',
      icon: '🔴',
      stats: platformStats?.atcoder,
      fields: [
        { label: 'Rating',           key: 'rating' },
        { label: 'Highest Rating',   key: 'highestRating' },
        { label: 'Rank',             key: 'rank' },
        { label: 'Problems Solved',  key: 'problemsSolved' },
        { label: 'Contests Attended', key: 'contestsAttended' },
      ],
    },
  ];

  container.innerHTML = platforms.map((p) => {
    const lastFetched = p.stats?.lastFetched
      ? `<span style="font-size:0.72rem;color:var(--text-muted);">Updated: ${new Date(p.stats.lastFetched).toLocaleString()}</span>`
      : `<span style="font-size:0.72rem;color:var(--text-muted);">Not fetched yet — add your username in <a href="profile.html" style="color:var(--primary-light);">Profile</a></span>`;

    const statsHtml = p.stats && !p.stats.error
      ? p.fields.map((f) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
            <span style="font-size:0.8rem;color:var(--text-muted);">${f.label}</span>
            <span style="font-size:0.875rem;font-weight:600;color:${f.color || 'var(--text-primary)'};">${p.stats[f.key] ?? '—'}</span>
          </div>
        `).join('')
      : `<p style="font-size:0.85rem;color:var(--text-muted);text-align:center;padding:16px 0;">No data yet. Add your username in profile and hit Refresh.</p>`;

    return `
      <div class="glass-card" style="padding:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:1.4rem;">${p.icon}</span>
            <span style="font-weight:700;color:${p.color};">${p.name}</span>
          </div>
          <button onclick="refreshPlatform('${p.key}')" id="refresh-${p.key}" class="btn btn-secondary btn-sm" title="Refresh ${p.name} stats">
            🔄 Refresh
          </button>
        </div>
        <div>${statsHtml}</div>
        <div style="margin-top:10px;">${lastFetched}</div>
      </div>
    `;
  }).join('');
}

async function refreshPlatform(platform) {
  const btn = document.getElementById(`refresh-${platform}`);
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>'; }

  try {
    await API.platformAPI.refreshAll();
    showToast('Stats refreshed! ✅', 'success');
    const dashRes = await API.userAPI.getDashboard();
    renderPlatformStats(dashRes.dashboard.platformStats);
    renderQuickStats(dashRes.dashboard.platformStats);
  } catch (err) {
    showToast(`Refresh failed: ${err.message}`, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '🔄 Refresh'; }
  }
}

window.refreshPlatform = refreshPlatform;

// ─── Upcoming Contests Preview (next 3) ──────────────────────────────────────
function renderUpcomingContests(contests) {
  const container = document.getElementById('upcoming-contests-preview');
  if (!container) return;

  const upcoming = contests.filter((c) => new Date(c.startTime) > new Date()).slice(0, 3);

  if (!upcoming.length) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:0.875rem;text-align:center;padding:16px 0;">No upcoming contests right now. <a href="contest-tracker.html" style="color:var(--primary-light);">Check the full list →</a></p>`;
    return;
  }

  const platformColors = {
    LeetCode:   '#FFA116',
    CodeForces: '#1F8ACB',
    CodeChef:   '#B17F59',
    AtCoder:    '#FF0000',
  };
  const platformIcons = {
    LeetCode:   '⚡',
    CodeForces: '🔵',
    CodeChef:   '👨‍🍳',
    AtCoder:    '🔴',
  };

  container.innerHTML = upcoming.map((c) => {
    const color  = platformColors[c.site] || '#6366f1';
    const icon   = platformIcons[c.site]  || '🏅';
    const start  = new Date(c.startTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const diff   = new Date(c.startTime) - new Date();
    const days   = Math.floor(diff / 86400000);
    const hours  = Math.floor((diff % 86400000) / 3600000);
    const mins   = Math.floor((diff % 3600000) / 60000);
    const timeLeft = days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    return `
      <a href="${c.url}" target="_blank" rel="noopener noreferrer"
         style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid var(--border);margin-bottom:8px;text-decoration:none;transition:background 0.2s;"
         onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:1.2rem;">${icon}</span>
          <div>
            <p style="font-size:0.7rem;font-weight:600;color:${color};text-transform:uppercase;letter-spacing:0.05em;">${c.site}</p>
            <p style="font-size:0.85rem;font-weight:600;color:var(--text-primary);">${c.name}</p>
          </div>
        </div>
        <div style="text-align:right;">
          <p style="font-size:0.72rem;color:var(--text-muted);">${start}</p>
          <p style="font-size:0.78rem;font-weight:600;color:var(--primary-light);">in ${timeLeft}</p>
        </div>
      </a>
    `;
  }).join('');
}
