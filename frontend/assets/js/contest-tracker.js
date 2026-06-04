// ─── Contest Tracker Logic ────────────────────────────────────────────────────
let allContests = [];
let activeFilter = '';
let countdownIntervals = [];

document.addEventListener('DOMContentLoaded', () => {
  loadContests();
  setupFilters();
  
  // Show tabs if logged in
  if (Auth.isLoggedIn()) {
    const tabsContainer = document.getElementById('tracker-tabs');
    if (tabsContainer) {
      tabsContainer.style.display = 'flex';
      setupTabs();
    }
  }
});

async function loadContests(platform = '') {
  const container = document.getElementById('contests-grid');
  container.innerHTML = `
    <div style="grid-column:1/-1;">
      <div class="skeleton" style="height:120px;border-radius:12px;margin-bottom:12px;"></div>
      <div class="skeleton" style="height:120px;border-radius:12px;margin-bottom:12px;"></div>
      <div class="skeleton" style="height:120px;border-radius:12px;"></div>
    </div>
  `;

  try {
    const res = await API.contestsAPI.getAll(platform);
    allContests = res.contests;
    renderContests(res.contests);
    updateCount(res.count);
  } catch (err) {
    container.innerHTML = `<div style="grid-column:1/-1;" class="empty-state"><div class="empty-icon">🌐</div><h3>Failed to load contests</h3><p>${err.message}</p><button onclick="loadContests()" class="btn btn-primary btn-sm" style="margin-top:12px;">Try Again</button></div>`;
  }
}

function renderContests(contests) {
  // Clear existing countdown intervals
  countdownIntervals.forEach(clearInterval);
  countdownIntervals = [];

  const container = document.getElementById('contests-grid');
  if (!contests.length) {
    container.innerHTML = `<div style="grid-column:1/-1;" class="empty-state"><div class="empty-icon">🏆</div><h3>No upcoming contests</h3><p>Check back later or try a different platform filter.</p></div>`;
    return;
  }

  container.innerHTML = contests.map((c, i) => {
    const isLive = new Date(c.startTime) <= new Date() && new Date(c.endTime) >= new Date();
    const isUpcoming = new Date(c.startTime) > new Date();
    const statusBadge = isLive
      ? `<span class="badge" style="background:rgba(239,68,68,0.2);color:#ef4444;border-color:rgba(239,68,68,0.3);animation:pulse 1.5s infinite;">🔴 LIVE</span>`
      : c.inRecentFuture
      ? `<span class="badge" style="background:rgba(245,158,11,0.2);color:#f59e0b;border-color:rgba(245,158,11,0.3);">⚡ Starting Soon</span>`
      : `<span class="badge" style="background:rgba(99,102,241,0.1);color:var(--primary-light);border-color:rgba(99,102,241,0.2);">📅 Upcoming</span>`;

    const platformMeta = c.meta || { color: '#6366f1', icon: '🏅' };
    const durationHours = c.duration ? (parseFloat(c.duration) / 3600).toFixed(1) : '?';

    return `
      <a href="${c.url}" target="_blank" rel="noopener noreferrer" class="contest-card" style="animation:fadeIn 0.4s ease ${i * 0.05}s both;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:1.4rem;">${platformMeta.icon}</span>
            <div>
              <span style="font-size:0.7rem;font-weight:600;color:${platformMeta.color};text-transform:uppercase;letter-spacing:0.05em;">${c.site}</span>
              <h3 style="font-size:0.95rem;font-weight:700;color:var(--text-primary);line-height:1.3;margin-top:2px;">${c.name}</h3>
            </div>
          </div>
          ${statusBadge}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;">
          <div>
            <p style="font-size:0.68rem;color:var(--text-muted);margin-bottom:2px;">STARTS</p>
            <p style="font-size:0.8rem;font-weight:600;">${formatDate(c.startTime)}</p>
          </div>
          <div>
            <p style="font-size:0.68rem;color:var(--text-muted);margin-bottom:2px;">DURATION</p>
            <p style="font-size:0.8rem;font-weight:600;">${durationHours}h</p>
          </div>
          <div>
            <p style="font-size:0.68rem;color:var(--text-muted);margin-bottom:2px;">${isLive ? 'ENDS IN' : 'STARTS IN'}</p>
            <p class="countdown" id="countdown-${i}" style="font-size:0.8rem;">—</p>
          </div>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:0.78rem;color:var(--primary-light);font-weight:600;">View Contest →</span>
        </div>
      </a>
    `;
  }).join('');

  // Start countdowns
  const updateCountdowns = () => {
    contests.forEach((c, i) => {
      const el = document.getElementById(`countdown-${i}`);
      if (!el) return;
      const isLive = new Date(c.startTime) <= new Date() && new Date(c.endTime) >= new Date();
      const target = isLive ? new Date(c.endTime) : new Date(c.startTime);
      const diff = target - new Date();

      if (diff <= 0) { el.textContent = isLive ? 'Ended' : 'Started'; return; }

      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      el.textContent = d > 0 ? `${d}d ${h}h ${m}m` : `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    });
  };

  updateCountdowns();
  const interval = setInterval(updateCountdowns, 1000);
  countdownIntervals.push(interval);
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function updateCount(count) {
  const el = document.getElementById('contest-count');
  if (el) el.textContent = count;
}

function setupFilters() {
  document.querySelectorAll('.platform-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.platform-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.platform;
      loadContests(activeFilter);
    });
  });
}

function setupTabs() {
  const btnUpcoming = document.getElementById('btn-tab-upcoming');
  const btnAttendance = document.getElementById('btn-tab-attendance');
  const upcomingSec = document.getElementById('upcoming-section');
  const attendanceSec = document.getElementById('attendance-section');

  if (!btnUpcoming || !btnAttendance) return;

  btnUpcoming.addEventListener('click', () => {
    btnUpcoming.className = "px-4 py-2 rounded-lg font-semibold bg-indigo-600 text-white transition-all";
    btnAttendance.className = "px-4 py-2 rounded-lg font-semibold bg-gray-800 text-gray-400 hover:text-white transition-all";
    upcomingSec.style.display = 'block';
    attendanceSec.style.display = 'none';
  });

  btnAttendance.addEventListener('click', () => {
    btnAttendance.className = "px-4 py-2 rounded-lg font-semibold bg-indigo-600 text-white transition-all";
    btnUpcoming.className = "px-4 py-2 rounded-lg font-semibold bg-gray-800 text-gray-400 hover:text-white transition-all";
    upcomingSec.style.display = 'none';
    attendanceSec.style.display = 'block';
    loadAttendanceHistory();
  });
}

async function loadAttendanceHistory() {
  const tbody = document.getElementById('attendance-list-body');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="4" class="text-center py-8">
        <div style="display:flex;justify-content:center;align-items:center;gap:10px;color:var(--text-secondary)">
          <span class="spinner"></span> Loading your attendance history...
        </div>
      </td>
    </tr>
  `;

  try {
    const res = await API.contestsAPI.getMyLogs();
    const logs = res.logs || [];
    if (logs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-8 text-gray-500">
            No contest attendance detected yet. Keep coding!
          </td>
        </tr>
      `;
      return;
    }

    const platformColors = {
      LeetCode: { bg: 'rgba(255,161,22,0.15)', fg: '#FFA116' },
      CodeForces: { bg: 'rgba(31,138,203,0.15)', fg: '#1F8ACB' },
      CodeChef: { bg: 'rgba(177,127,89,0.15)', fg: '#B17F59' },
      AtCoder: { bg: 'rgba(255,0,0,0.15)', fg: '#FF0000' }
    };

    tbody.innerHTML = logs.map(log => {
      const colors = platformColors[log.platform] || { bg: 'rgba(99,102,241,0.15)', fg: '#6366f1' };
      const dateStr = new Date(log.startTime).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const method = log.detectedBy === 'exact_match' ? 'Exact Match' : 'Count Delta';

      return `
        <tr class="border-b border-gray-800 text-sm hover:bg-gray-800/20 transition-all">
          <td class="py-4 px-4 font-semibold text-white">
            ${log.contestUrl ? `<a href="${log.contestUrl}" target="_blank" class="hover:underline text-indigo-400">${log.contestName}</a>` : log.contestName}
          </td>
          <td class="py-4 px-4">
            <span class="px-2.5 py-1 rounded text-xs font-bold" style="background:${colors.bg};color:${colors.fg}">
              ${log.platform}
            </span>
          </td>
          <td class="py-4 px-4 text-gray-300">${dateStr}</td>
          <td class="py-4 px-4 text-gray-400 text-xs">${method}</td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-8 text-red-500">
          Failed to load attendance logs: ${err.message}
        </td>
      </tr>
    `;
  }
}
