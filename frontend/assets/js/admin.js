// ─── ADMIN PORTAL LOGIC ───────────────────────────────────────────────────────

// Global State
let currentView = 'overview';
const chartInstances = {};

// User Management State
let usersPage = 1;
const usersLimit = 10;
let totalUsersPages = 1;

// Contest Analytics State
let contestsTab = 'past'; // 'past' or 'upcoming'
let contestsPlatformFilter = '';
let activeContest = null; // Store current drilldown contest info
let countdownIntervals = [];

// Department Comparison State
let activeDeptMetric = 'totalAttendance';
let deptComparisonData = null;

// Clean Chart helper
function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

// ─── INITIALIZATION & ROUTING ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Auth & Admin Guard
  if (!Auth.requireAuth()) return;
  
  const user = Auth.getUser();
  if (!user || user.role !== 'admin') {
    showToast('Access denied: Administrator privileges required.', 'error');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1500);
    return;
  }

  // Set active sidebar view event
  setupSidebarNavigation();

  // Mobile menu drawer
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.getElementById('sidebar');
  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Load default view
  loadView('overview');
});

// View switching
function setupSidebarNavigation() {
  document.querySelectorAll('.sidebar-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      // Close sidebar in mobile
      const sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.classList.remove('open');

      const view = item.dataset.view;
      loadView(view);
    });
  });
}

function loadView(viewName) {
  currentView = viewName;
  
  // Hide all sections, show active
  document.querySelectorAll('.admin-view').forEach(sec => sec.classList.add('hidden'));
  const activeSec = document.getElementById(`view-${viewName}`);
  if (activeSec) activeSec.classList.remove('hidden');

  // Trigger view-specific loads
  if (viewName === 'overview') {
    loadOverview();
  } else if (viewName === 'users') {
    usersPage = 1;
    loadUsers();
    setupUsersListeners();
  } else if (viewName === 'contests') {
    loadContestsList();
    setupContestsListeners();
  } else if (viewName === 'departments') {
    loadDeptComparison();
    setupDeptListeners();
  } else if (viewName === 'settings') {
    setupSettingsListeners();
    loadAdminProfileSettings();
  }
}

// ─── VIEW 1: OVERVIEW ─────────────────────────────────────────────────────────
async function loadOverview() {
  try {
    const res = await API.adminAPI.getOverview();
    const { stats, charts, recentSignups } = res.data;

    // Populate stat cards
    document.getElementById('overview-total-users').textContent = stats.totalUsers;
    document.getElementById('overview-active-users').textContent = stats.activeUsers;
    document.getElementById('overview-contests-tracked').textContent = stats.contestCount;
    document.getElementById('overview-depts-count').textContent = stats.deptCount;

    // Render charts
    renderOverviewCharts(charts);

    // Populate recent registrations
    const tbody = document.getElementById('overview-recent-signups-body');
    if (recentSignups.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">No student registrations found.</td></tr>`;
      return;
    }

    tbody.innerHTML = recentSignups.map(u => {
      const date = new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `
        <tr class="hover:bg-gray-800/10">
          <td class="font-semibold text-white py-3 px-4">${u.name}</td>
          <td class="text-gray-300 py-3 px-4">${u.email}</td>
          <td class="py-3 px-4">${u.department || '<span class="text-gray-600">—</span>'}</td>
          <td class="py-3 px-4">${u.section || '<span class="text-gray-600">—</span>'}</td>
          <td class="py-3 px-4">${u.year || '<span class="text-gray-600">—</span>'}</td>
          <td class="text-gray-400 py-3 px-4">${date}</td>
        </tr>
      `;
    }).join('');

  } catch (error) {
    showToast(`Failed to load overview: ${error.message}`, 'error');
  }
}

function renderOverviewCharts(charts) {
  // Chart 1: Users by Dept (Doughnut)
  destroyChart('usersDept');
  const deptData = charts.usersByDept;
  const deptLabels = Object.keys(deptData);
  const deptValues = Object.values(deptData);
  
  const ctxDept = document.getElementById('chart-users-dept').getContext('2d');
  chartInstances['usersDept'] = new Chart(ctxDept, {
    type: 'doughnut',
    data: {
      labels: deptLabels.map(l => l === '' ? 'Not Specified' : l),
      datasets: [{
        data: deptValues,
        backgroundColor: ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#64748b'],
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Inter' } } }
      }
    }
  });

  // Chart 2: Users by Section (Bar)
  destroyChart('usersSection');
  const secData = charts.usersBySection;
  const secLabels = Object.keys(secData);
  const secValues = Object.values(secData);

  const ctxSec = document.getElementById('chart-users-section').getContext('2d');
  chartInstances['usersSection'] = new Chart(ctxSec, {
    type: 'bar',
    data: {
      labels: secLabels.map(l => l === '' ? 'Not Specified' : l),
      datasets: [{
        label: 'Students',
        data: secValues,
        backgroundColor: '#8b5cf6',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });

  // Chart 3: Users by Year (Bar)
  destroyChart('usersYear');
  const yearData = charts.usersByYear;
  const yearLabels = Object.keys(yearData);
  const yearValues = Object.values(yearData);

  const ctxYear = document.getElementById('chart-users-year').getContext('2d');
  chartInstances['usersYear'] = new Chart(ctxYear, {
    type: 'bar',
    data: {
      labels: yearLabels.map(l => l === '' ? 'Not Specified' : l),
      datasets: [{
        label: 'Students',
        data: yearValues,
        backgroundColor: '#06b6d4',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

// ─── VIEW 2: USER MANAGEMENT ───────────────────────────────────────────────
async function loadUsers() {
  const tableBody = document.getElementById('users-table-body');
  tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-6"><span class="spinner"></span> Loading student accounts...</td></tr>`;

  try {
    const params = {
      search: document.getElementById('users-search').value.trim(),
      department: document.getElementById('users-filter-dept').value,
      section: document.getElementById('users-filter-section').value,
      year: document.getElementById('users-filter-year').value,
      sort: document.getElementById('users-sort').value,
      page: usersPage,
      limit: usersLimit
    };

    const res = await API.adminAPI.getUsers(params);
    const users = res.data;
    const { total, page, pages } = res.pagination;

    totalUsersPages = pages;
    document.getElementById('users-total-count').textContent = `${total} users found`;
    document.getElementById('users-pagination-text').textContent = `Showing page ${page} of ${pages || 1}`;

    // Manage pagination buttons state
    const prevBtn = document.getElementById('users-pagination-prev');
    const nextBtn = document.getElementById('users-pagination-next');
    
    if (page > 1) prevBtn.classList.remove('disabled');
    else prevBtn.classList.add('disabled');

    if (page < pages) nextBtn.classList.remove('disabled');
    else nextBtn.classList.add('disabled');

    if (users.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-gray-500">No students matched the selected filters.</td></tr>`;
      return;
    }

    tableBody.innerHTML = users.map(u => {
      // Platform linked dots
      const platforms = u.platforms || {};
      const dots = [];
      if (platforms.leetcode) dots.push('<span class="platform-dot bg-[#FFA116]" title="LeetCode"></span>');
      if (platforms.codeforces) dots.push('<span class="platform-dot bg-[#1F8ACB]" title="Codeforces"></span>');
      if (platforms.codechef) dots.push('<span class="platform-dot bg-[#B17F59]" title="CodeChef"></span>');
      if (platforms.atcoder) dots.push('<span class="platform-dot bg-red-600" title="AtCoder"></span>');
      const dotsStr = dots.length > 0 ? `<div class="flex gap-1.5">${dots.join('')}</div>` : '<span class="text-gray-600 text-xs">None</span>';

      const roleBadge = u.role === 'admin' 
        ? `<span class="badge" style="background:rgba(139,92,246,0.15);color:#8b5cf6;border:1px solid rgba(139,92,246,0.25)">Admin</span>`
        : `<span class="badge" style="background:rgba(148,163,184,0.1);color:#94a3b8">Student</span>`;

      return `
        <tr class="hover:bg-gray-800/10">
          <td class="py-3.5 px-4">
            <div class="flex items-center gap-3">
              <div class="avatar-placeholder avatar-sm">${u.name?.charAt(0).toUpperCase() || 'U'}</div>
              <div>
                <div class="font-bold text-white leading-snug">${u.name}</div>
                <div class="text-gray-400 text-xs">${u.email} (@${u.username || 'n/a'})</div>
              </div>
            </div>
          </td>
          <td class="py-3.5 px-4 font-semibold text-gray-200">${u.department || '<span class="text-gray-600">—</span>'}</td>
          <td class="py-3.5 px-4">${u.section || '<span class="text-gray-600">—</span>'}</td>
          <td class="py-3.5 px-4">${u.year || '<span class="text-gray-600">—</span>'}</td>
          <td class="py-3.5 px-4">${dotsStr}</td>
          <td class="py-3.5 px-4">${roleBadge}</td>
          <td class="py-3.5 px-4 text-right">
            <div class="flex gap-2 justify-end">
              <a href="profile.html?user=${u.username}" target="_blank" class="btn btn-ghost btn-sm px-2.5" title="View Public Profile">↗</a>
              <button onclick="openEditUserModal('${u._id}')" class="btn btn-secondary btn-sm px-2.5" title="Edit Profile">✏️</button>
              <button onclick="openDeleteUserConfirm('${u._id}', '${u.name.replace(/'/g, "\\'")}')" class="btn btn-danger btn-sm px-2.5" title="Delete Profile">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

  } catch (error) {
    showToast(`Failed to load users: ${error.message}`, 'error');
  }
}

function setupUsersListeners() {
  // Search button
  const searchBtn = document.getElementById('users-btn-search');
  searchBtn.onclick = () => {
    usersPage = 1;
    loadUsers();
  };

  // Clear button
  const clearBtn = document.getElementById('users-btn-clear');
  clearBtn.onclick = () => {
    document.getElementById('users-search').value = '';
    document.getElementById('users-filter-dept').value = '';
    document.getElementById('users-filter-section').value = '';
    document.getElementById('users-filter-year').value = '';
    usersPage = 1;
    loadUsers();
  };

  // Sort dropdown
  const sortSelect = document.getElementById('users-sort');
  sortSelect.onchange = () => {
    usersPage = 1;
    loadUsers();
  };

  // Pagination next / prev
  const prevBtn = document.getElementById('users-pagination-prev');
  prevBtn.onclick = () => {
    if (usersPage > 1) {
      usersPage--;
      loadUsers();
    }
  };

  const nextBtn = document.getElementById('users-pagination-next');
  nextBtn.onclick = () => {
    if (usersPage < totalUsersPages) {
      usersPage++;
      loadUsers();
    }
  };
}

// ─── USER MODALS (EDIT & DELETE) ──────────────────────────────────────────────
async function openEditUserModal(id) {
  try {
    const res = await API.adminAPI.getUserDetail(id);
    const u = res.data.user;

    document.getElementById('edit-user-id').value = u._id;
    document.getElementById('edit-user-name').value = u.name;
    document.getElementById('edit-user-email').value = u.email;
    document.getElementById('edit-user-username').value = u.username || '';
    document.getElementById('edit-user-dept').value = u.department || '';
    document.getElementById('edit-user-section').value = u.section || '';
    document.getElementById('edit-user-year').value = u.year || '';
    document.getElementById('edit-user-role').value = u.role || 'user';

    const overlay = document.getElementById('modal-edit-user');
    overlay.classList.add('active');

    // Setup close triggers
    const closeBtn = document.getElementById('edit-user-close');
    const cancelBtn = document.getElementById('edit-user-cancel');
    const closeForm = () => overlay.classList.remove('active');
    
    closeBtn.onclick = closeForm;
    cancelBtn.onclick = closeForm;

    // Handle form submit
    const form = document.getElementById('edit-user-form');
    form.onsubmit = async (e) => {
      e.preventDefault();
      try {
        const updateData = {
          name: document.getElementById('edit-user-name').value.trim(),
          email: document.getElementById('edit-user-email').value.trim(),
          username: document.getElementById('edit-user-username').value.trim(),
          department: document.getElementById('edit-user-dept').value,
          section: document.getElementById('edit-user-section').value,
          year: document.getElementById('edit-user-year').value,
          role: document.getElementById('edit-user-role').value
        };

        const resUpdate = await API.adminAPI.updateUser(u._id, updateData);
        if (resUpdate.success) {
          showToast('Profile updated successfully! ✅', 'success');
          closeForm();
          loadUsers();
        }
      } catch (err) {
        showToast(`Failed to update user: ${err.message}`, 'error');
      }
    };

  } catch (error) {
    showToast(`Failed to load student details: ${error.message}`, 'error');
  }
}

function openDeleteUserConfirm(id, name) {
  document.getElementById('delete-user-id').value = id;
  document.getElementById('delete-user-target-name').textContent = name;

  const overlay = document.getElementById('modal-delete-user');
  overlay.classList.add('active');

  const closeBtn = document.getElementById('delete-user-close');
  const cancelBtn = document.getElementById('delete-user-cancel');
  const confirmBtn = document.getElementById('delete-user-confirm');
  const closeForm = () => overlay.classList.remove('active');

  closeBtn.onclick = closeForm;
  cancelBtn.onclick = closeForm;

  confirmBtn.onclick = async () => {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Deleting...';
    try {
      const res = await API.adminAPI.deleteUser(id);
      if (res.success) {
        showToast('Student deleted successfully.', 'success');
        closeForm();
        loadUsers();
      }
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, 'error');
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Delete Forever';
    }
  };
}

// Expose these modal open triggers globally so HTML inline click events can hit them
window.openEditUserModal = openEditUserModal;
window.openDeleteUserConfirm = openDeleteUserConfirm;

// ─── VIEW 3: CONTEST ANALYTICS ───────────────────────────────────────────────
// Helper to format date
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function loadContestsList() {
  const container = document.getElementById('contests-grid');
  container.innerHTML = `
    <div style="grid-column:1/-1;">
      <div class="skeleton mb-3" style="height:100px;border-radius:12px;"></div>
      <div class="skeleton mb-3" style="height:100px;border-radius:12px;"></div>
    </div>
  `;

  // Clear existing countdown intervals
  countdownIntervals.forEach(clearInterval);
  countdownIntervals = [];

  try {
    const params = {
      status: contestsTab,
      platform: contestsPlatformFilter
    };

    const res = await API.adminAPI.getAllContests(params);
    const contests = res.data;

    if (contests.length === 0) {
      container.innerHTML = `<div style="grid-column:1/-1;" class="empty-state"><div class="empty-icon">🏆</div><h3>No contests found</h3><p>Try switching between Past/Upcoming tabs or choosing another platform filter.</p></div>`;
      return;
    }

    container.innerHTML = contests.map((c, i) => {
      c.site = c.site || c.platform;
      if (!c.duration && c.startTime && c.endTime) {
        c.duration = (new Date(c.endTime) - new Date(c.startTime)) / 1000;
      }
      const durationHours = c.duration ? (parseFloat(c.duration) / 3600).toFixed(1) : '?';
      
      const platformColors = {
        LeetCode: { color: '#FFA116', icon: '⚡' },
        CodeForces: { color: '#1F8ACB', icon: '🔵' },
        CodeChef: { color: '#B17F59', icon: '👨‍🍳' },
        AtCoder: { color: '#FF0000', icon: '🔴' }
      };
      const platformMeta = c.meta || platformColors[c.site] || { color: '#6366f1', icon: '🏅' };

      const isLive = new Date(c.startTime) <= new Date() && new Date(c.endTime) >= new Date();
      
      let statusBadge = '';
      let rightColumnHeader = '';
      let rightColumnVal = '';
      let clickHandler = '';

      if (contestsTab === 'upcoming') {
        statusBadge = isLive
          ? `<span class="badge" style="background:rgba(239,68,68,0.2);color:#ef4444;border-color:rgba(239,68,68,0.3);animation:pulse 1.5s infinite;">🔴 LIVE</span>`
          : c.inRecentFuture
          ? `<span class="badge" style="background:rgba(245,158,11,0.2);color:#f59e0b;border-color:rgba(245,158,11,0.3);">⚡ Starting Soon</span>`
          : `<span class="badge" style="background:rgba(99,102,241,0.1);color:var(--primary-light);border-color:rgba(99,102,241,0.2);">📅 Upcoming</span>`;
        
        rightColumnHeader = isLive ? 'ENDS IN' : 'STARTS IN';
        rightColumnVal = `<span class="countdown" id="countdown-${i}">—</span>`;
        clickHandler = `onclick="window.open('${c.url}', '_blank')"`
      } else {
        statusBadge = `<span class="badge" style="background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.25)">✅ Completed</span>`;
        rightColumnHeader = 'ATTENDED';
        rightColumnVal = `<span style="font-weight:700;color:var(--success);">${c.attendanceCount || 0} students</span>`;
        clickHandler = `onclick="selectContestForDrilldown('${c.name.replace(/'/g, "\\'")}', '${c.site}')"`;
      }

      return `
        <div ${clickHandler} class="contest-card flex flex-col justify-between" style="animation:fadeIn 0.4s ease ${i * 0.05}s both;">
          <div>
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
                <p style="font-size:0.68rem;color:var(--text-muted);margin-bottom:2px;">${rightColumnHeader}</p>
                <p style="font-size:0.8rem;font-weight:600;color:var(--text-primary);">${rightColumnVal}</p>
              </div>
            </div>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;border-top:1px solid rgba(255,255,255,0.02);padding-top:8px;">
            <span style="font-size:0.78rem;color:var(--primary-light);font-weight:600;">
              ${contestsTab === 'upcoming' ? 'View Official Contest Page ↗' : 'View Attendance Details & Reports →'}
            </span>
          </div>
        </div>
      `;
    }).join('');

    // Start countdowns if on upcoming tab
    if (contestsTab === 'upcoming') {
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

  } catch (error) {
    showToast(`Failed to load contests: ${error.message}`, 'error');
  }
}

function setupContestsListeners() {
  // Tab triggers
  const pastTab = document.getElementById('contests-tab-past');
  const upcomingTab = document.getElementById('contests-tab-upcoming');

  pastTab.onclick = () => {
    contestsTab = 'past';
    pastTab.className = "px-5 py-2.5 rounded-lg font-bold bg-indigo-600 text-white transition-all";
    upcomingTab.className = "px-5 py-2.5 rounded-lg font-bold bg-gray-800 text-gray-400 hover:text-white transition-all";
    loadContestsList();
  };

  upcomingTab.onclick = () => {
    contestsTab = 'upcoming';
    upcomingTab.className = "px-5 py-2.5 rounded-lg font-bold bg-indigo-600 text-white transition-all";
    pastTab.className = "px-5 py-2.5 rounded-lg font-bold bg-gray-800 text-gray-400 hover:text-white transition-all";
    loadContestsList();
  };

  // Platform filters
  document.querySelectorAll('.contest-platform-filter').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.contest-platform-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      contestsPlatformFilter = btn.dataset.platform;
      loadContestsList();
    };
  });

  // Drilldown back button
  document.getElementById('drilldown-back-btn').onclick = () => {
    document.getElementById('contest-drilldown-container').classList.add('hidden');
    document.getElementById('contest-list-container').classList.remove('hidden');
    activeContest = null;
  };

  // Drilldown filters listeners
  const filters = ['drilldown-filter-dept', 'drilldown-filter-section', 'drilldown-filter-year'];
  filters.forEach(id => {
    document.getElementById(id).onchange = () => {
      if (activeContest) {
        loadContestDrilldownDetails();
      }
    };
  });

  // Report downloads
  document.getElementById('drilldown-btn-csv').onclick = () => {
    if (activeContest) downloadCSVReport();
  };

  document.getElementById('drilldown-btn-print').onclick = () => {
    if (activeContest) generatePrintableReport();
  };
}

async function selectContestForDrilldown(contestName, platform) {
  // If upcoming contest, we can't show past attendance metrics
  if (contestsTab === 'upcoming') {
    showToast('Attendance stats are only available for past/completed contests.', 'info');
    return;
  }

  activeContest = { name: contestName, platform };
  
  // Reset drilldown filter selectors
  document.getElementById('drilldown-filter-dept').value = '';
  document.getElementById('drilldown-filter-section').value = '';
  document.getElementById('drilldown-filter-year').value = '';

  // Setup basics
  const icons = { LeetCode: '⚡', CodeForces: '🔵', CodeChef: '👨‍🍳', AtCoder: '🔴' };
  document.getElementById('drilldown-platform-icon').textContent = icons[platform] || '🏆';
  document.getElementById('drilldown-contest-name').textContent = contestName;
  document.getElementById('drilldown-platform-badge').textContent = platform;

  // Swap views
  document.getElementById('contest-list-container').classList.add('hidden');
  document.getElementById('contest-drilldown-container').classList.remove('hidden');

  // Load details
  await loadContestDrilldownDetails();
}

window.selectContestForDrilldown = selectContestForDrilldown;

async function loadContestDrilldownDetails() {
  if (!activeContest) return;

  const { name, platform } = activeContest;

  const deptFilter = document.getElementById('drilldown-filter-dept').value;
  const sectionFilter = document.getElementById('drilldown-filter-section').value;
  const yearFilter = document.getElementById('drilldown-filter-year').value;

  const attendedBody = document.getElementById('drilldown-attended-table-body');
  const unattendedBody = document.getElementById('drilldown-unattended-table-body');

  attendedBody.innerHTML = `<tr><td colspan="4" class="text-center py-4"><span class="spinner"></span> Loading...</td></tr>`;
  unattendedBody.innerHTML = `<tr><td colspan="4" class="text-center py-4"><span class="spinner"></span> Loading...</td></tr>`;

  try {
    const params = {
      contestName: name,
      platform,
      department: deptFilter,
      section: sectionFilter,
      year: yearFilter
    };

    // Fetch lists
    const res = await API.adminAPI.getContestUserDetail(params);
    const { attended, notAttended, summary } = res.data;

    // Populate summary statistics
    document.getElementById('drilldown-stat-tracked').textContent = attended.length + notAttended.length;
    document.getElementById('drilldown-stat-attended').textContent = attended.length;
    document.getElementById('drilldown-stat-unattended').textContent = notAttended.length;
    document.getElementById('drilldown-stat-rate').textContent = `${summary.rate}%`;

    // Populate tab counts
    document.getElementById('drilldown-attended-count').textContent = attended.length;
    document.getElementById('drilldown-unattended-count').textContent = notAttended.length;

    // Set contest date if snapshot exists (we can extract from the first element)
    if (attended.length > 0 || notAttended.length > 0) {
      // Just placeholder since date is returned by getContests stats, or we can fallback to formatted Date
      document.getElementById('drilldown-date').textContent = 'Completed';
    }

    // Render Attended Table
    if (attended.length === 0) {
      attendedBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500">No attended students.</td></tr>`;
    } else {
      attendedBody.innerHTML = attended.map(u => `
        <tr class="text-xs hover:bg-gray-800/10">
          <td class="py-2.5 px-3 font-semibold text-emerald-400">${u.name}</td>
          <td class="py-2.5 px-3">${u.department || '—'}</td>
          <td class="py-2.5 px-3">${u.section || '—'}</td>
          <td class="py-2.5 px-3">${u.year || '—'}</td>
        </tr>
      `).join('');
    }

    // Render Unattended Table
    if (notAttended.length === 0) {
      unattendedBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500">No unattended students.</td></tr>`;
    } else {
      unattendedBody.innerHTML = notAttended.map(u => `
        <tr class="text-xs hover:bg-gray-800/10">
          <td class="py-2.5 px-3 font-semibold text-red-400">${u.name}</td>
          <td class="py-2.5 px-3">${u.department || '—'}</td>
          <td class="py-2.5 px-3">${u.section || '—'}</td>
          <td class="py-2.5 px-3">${u.year || '—'}</td>
        </tr>
      `).join('');
    }

    // Load and render breakdown charts for this specific drilldown
    const resStats = await API.adminAPI.getContestStats({ contestName: name, platform });
    renderDrilldownCharts(resStats.data);

  } catch (error) {
    showToast(`Drilldown load failed: ${error.message}`, 'error');
  }
}

function renderDrilldownCharts(stats) {
  const { attended, notAttended } = stats;

  // Chart 1: Attendance Rate by Dept
  destroyChart('drilldownDept');
  const depts = ['CSE', 'AI&DS', 'AI&ML', 'CSBS'];
  const deptRates = depts.map(d => {
    const att = attended.breakdown.depts[d] || 0;
    const notAtt = notAttended.breakdown.depts[d] || 0;
    const total = att + notAtt;
    return total > 0 ? parseFloat(((att / total) * 100).toFixed(1)) : 0;
  });

  const ctxDept = document.getElementById('chart-drilldown-dept').getContext('2d');
  chartInstances['drilldownDept'] = new Chart(ctxDept, {
    type: 'bar',
    data: {
      labels: depts,
      datasets: [{
        label: 'Attendance Rate (%)',
        data: deptRates,
        backgroundColor: '#10b981',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
        y: { min: 0, max: 100, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });

  // Chart 2: Attended vs Not Attended by Section
  destroyChart('drilldownSection');
  const sections = ['A', 'B', 'C'];
  const attSecValues = sections.map(s => attended.breakdown.sections[s] || 0);
  const notAttSecValues = sections.map(s => notAttended.breakdown.sections[s] || 0);

  const ctxSec = document.getElementById('chart-drilldown-section').getContext('2d');
  chartInstances['drilldownSection'] = new Chart(ctxSec, {
    type: 'bar',
    data: {
      labels: sections,
      datasets: [
        { label: 'Attended', data: attSecValues, backgroundColor: '#10b981', borderRadius: 4 },
        { label: 'Not Attended', data: notAttSecValues, backgroundColor: '#ef4444', borderRadius: 4 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });

  // Chart 3: Attendance Count by Year
  destroyChart('drilldownYear');
  const years = ['1st year', '2nd year', '3rd year', 'final year'];
  const attYearValues = years.map(y => attended.breakdown.years[y] || 0);

  const ctxYear = document.getElementById('chart-drilldown-year').getContext('2d');
  chartInstances['drilldownYear'] = new Chart(ctxYear, {
    type: 'bar',
    data: {
      labels: ['1st Yr', '2nd Yr', '3rd Yr', 'Final Yr'],
      datasets: [{
        label: 'Attended Count',
        data: attYearValues,
        backgroundColor: '#6366f1',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

// CSV and HTML report generators
async function downloadCSVReport() {
  if (!activeContest) return;
  const { name, platform } = activeContest;

  const dept = document.getElementById('drilldown-filter-dept').value;
  const section = document.getElementById('drilldown-filter-section').value;
  const year = document.getElementById('drilldown-filter-year').value;

  try {
    const params = { contestName: name, platform, department: dept, section, year };
    const res = await API.adminAPI.getContestUserDetail(params);
    const { attended, notAttended } = res.data;

    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Metadata Row
    csvContent += `Report Metadata,Contest Name: ${name},Platform: ${platform},Generated At: ${new Date().toLocaleString()},Filters Applied: Dept=${dept || 'All'}\\; Sec=${section || 'All'}\\; Year=${year || 'All'}\n\n`;
    
    // Attended Section
    csvContent += "=== ATTENDED USERS ===\n";
    csvContent += "Name,Email,Department,Section,Year\n";
    attended.forEach(u => {
      csvContent += `"${u.name}","${u.email}","${u.department || ''}","${u.section || ''}","${u.year || ''}"\n`;
    });

    // Unattended Section
    csvContent += "\n=== NOT ATTENDED USERS ===\n";
    csvContent += "Name,Email,Department,Section,Year\n";
    notAttended.forEach(u => {
      csvContent += `"${u.name}","${u.email}","${u.department || ''}","${u.section || ''}","${u.year || ''}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_Report_${platform}_${name.replace(/[^a-z0-9]/gi, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (error) {
    showToast(`CSV generation failed: ${error.message}`, 'error');
  }
}

async function generatePrintableReport() {
  if (!activeContest) return;
  const { name, platform } = activeContest;

  const dept = document.getElementById('drilldown-filter-dept').value;
  const section = document.getElementById('drilldown-filter-section').value;
  const year = document.getElementById('drilldown-filter-year').value;

  try {
    const params = { contestName: name, platform, department: dept, section, year };
    const res = await API.adminAPI.getContestUserDetail(params);
    const { attended, notAttended, summary } = res.data;

    const printWindow = window.open('', '_blank');
    
    const filterTags = [];
    if (dept) filterTags.push(`Department: ${dept}`);
    if (section) filterTags.push(`Section: ${section}`);
    if (year) filterTags.push(`Year: ${year}`);
    const filterText = filterTags.length > 0 ? filterTags.join(', ') : 'None';

    const buildTableRows = (users) => {
      if (users.length === 0) return '<tr><td colspan="4" style="text-align:center;padding:12px;color:#777;">No users in this category.</td></tr>';
      return users.map((u, i) => `
        <tr style="border-bottom:1px solid #ddd;">
          <td style="padding:8px 12px;">${i + 1}</td>
          <td style="padding:8px 12px;font-weight:bold;">${u.name}</td>
          <td style="padding:8px 12px;">${u.email}</td>
          <td style="padding:8px 12px;">${u.department || '—'} · ${u.section || '—'} · ${u.year || '—'}</td>
        </tr>
      `).join('');
    };

    const htmlContent = `
      <html>
      <head>
        <title>Attendance Report - ${name}</title>
        <style>
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; }
          .header { border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: 800; margin: 0; color: #1e1b4b; }
          .meta { font-size: 13px; color: #666; margin-top: 6px; }
          .summary-box { display: flex; gap: 20px; margin-bottom: 30px; }
          .stat-card { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
          .stat-val { font-size: 20px; font-weight: 800; color: #4f46e5; }
          .stat-lbl { font-size: 11px; text-transform: uppercase; color: #777; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
          th { background: #f8fafc; padding: 10px 12px; border-bottom: 2px solid #cbd5e1; text-align: left; }
          h2 { font-size: 16px; border-left: 4px solid #6366f1; padding-left: 8px; margin-bottom: 12px; }
          .no-print-btn { background: #6366f1; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; float: right; }
          @media print { .no-print-btn { display: none; } }
        </style>
      </head>
      <body>
        <button class="no-print-btn" onclick="window.print()">Print Report</button>
        <div class="header">
          <div class="title">⚡ CodeTracker Contest Attendance Report</div>
          <div class="meta">
            <strong>Contest:</strong> ${name} | <strong>Platform:</strong> ${platform}<br/>
            <strong>Filters:</strong> ${filterText} | <strong>Generated:</strong> ${new Date().toLocaleString()}
          </div>
        </div>

        <div class="summary-box">
          <div class="stat-card">
            <div class="stat-val">${attended.length + notAttended.length}</div>
            <div class="stat-lbl">Tracked Students</div>
          </div>
          <div class="stat-card">
            <div class="stat-val" style="color:#10b981;">${attended.length}</div>
            <div class="stat-lbl">Attended</div>
          </div>
          <div class="stat-card">
            <div class="stat-val" style="color:#ef4444;">${notAttended.length}</div>
            <div class="stat-lbl">Not Attended</div>
          </div>
          <div class="stat-card">
            <div class="stat-val">${summary.rate}%</div>
            <div class="stat-lbl">Attendance Rate</div>
          </div>
        </div>

        <h2>✅ Attended Students</h2>
        <table>
          <thead>
            <tr>
              <th style="width:50px;">#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Class Details</th>
            </tr>
          </thead>
          <tbody>
            ${buildTableRows(attended)}
          </tbody>
        </table>

        <h2 style="border-left-color:#ef4444;">❌ Unattended Students</h2>
        <table>
          <thead>
            <tr>
              <th style="width:50px;">#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Class Details</th>
            </tr>
          </thead>
          <tbody>
            ${buildTableRows(notAttended)}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

  } catch (error) {
    showToast(`Print generation failed: ${error.message}`, 'error');
  }
}

// ─── VIEW 4: DEPARTMENT COMPARISON ────────────────────────────────────
async function loadDeptComparison() {
  const tbody = document.getElementById('dept-comparison-table-body');
  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6"><span class="spinner"></span> Loading department comparisons...</td></tr>`;

  try {
    const res = await API.adminAPI.getDepartmentComparison();
    deptComparisonData = res.data;

    // Render table
    const depts = ['CSE', 'AI&DS', 'AI&ML', 'CSBS'];
    tbody.innerHTML = depts.map(d => {
      const data = deptComparisonData[d] || { totalStudents: 0, totalAttendance: 0, avgAttendance: 0, avgLcSolved: 0, avgCfRating: 0, avgPlatformsLinked: 0 };
      return `
        <tr class="hover:bg-gray-800/10">
          <td class="py-3 px-4 font-bold text-white">${d}</td>
          <td class="py-3 px-4 font-semibold text-gray-200">${data.totalStudents}</td>
          <td class="py-3 px-4 text-indigo-400 font-semibold">${data.totalAttendance}</td>
          <td class="py-3 px-4">${data.avgAttendance}</td>
          <td class="py-3 px-4 text-emerald-400 font-semibold">${data.avgLcSolved}</td>
          <td class="py-3 px-4 text-sky-400 font-semibold">${data.avgCfRating || 'n/a'}</td>
          <td class="py-3 px-4">${data.avgPlatformsLinked} / 4.0</td>
        </tr>
      `;
    }).join('');

    // Render charts
    renderDeptComparisonCharts();

  } catch (error) {
    showToast(`Failed to load department statistics: ${error.message}`, 'error');
  }
}

function renderDeptComparisonCharts() {
  if (!deptComparisonData) return;

  const depts = ['CSE', 'AI&DS', 'AI&ML', 'CSBS'];

  // Chart 1: Bar Comparison (Dynamic Metric)
  destroyChart('deptComparisonBar');
  const barTitleMap = {
    totalAttendance: 'Total Attendance Count',
    avgAttendance: 'Average Attendance per Student',
    avgLcSolved: 'Average LeetCode Solved',
    avgCfRating: 'Average Codeforces Rating'
  };

  document.getElementById('comparison-bar-title').textContent = barTitleMap[activeDeptMetric];

  const barValues = depts.map(d => deptComparisonData[d]?.[activeDeptMetric] || 0);

  const ctxBar = document.getElementById('chart-dept-comparison-bar').getContext('2d');
  chartInstances['deptComparisonBar'] = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels: depts,
      datasets: [{
        data: barValues,
        backgroundColor: '#8b5cf6',
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });

  // Chart 2: Radar Chart (Standardised Metrics)
  destroyChart('deptComparisonRadar');
  
  // Find max values for standardisation (to ensure pretty radar shape)
  const maxValues = {
    avgAttendance: Math.max(...depts.map(d => deptComparisonData[d]?.avgAttendance || 1)),
    avgLcSolved: Math.max(...depts.map(d => deptComparisonData[d]?.avgLcSolved || 1)),
    avgCfRating: Math.max(...depts.map(d => deptComparisonData[d]?.avgCfRating || 1)),
    avgPlatformsLinked: Math.max(...depts.map(d => deptComparisonData[d]?.avgPlatformsLinked || 1))
  };

  const colors = {
    CSE: { border: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
    'AI&DS': { border: '#06b6d4', bg: 'rgba(6,182,212,0.08)' },
    'AI&ML': { border: '#10b981', bg: 'rgba(16,185,209,0.08)' },
    CSBS: { border: '#f59e0b', bg: 'rgba(245,158,11,0.08)' }
  };

  const datasets = depts.map(d => {
    const data = deptComparisonData[d] || {};
    // Standardise values out of 100
    const stdAttendance = maxValues.avgAttendance > 0 ? (data.avgAttendance / maxValues.avgAttendance) * 100 : 0;
    const stdLcSolved = maxValues.avgLcSolved > 0 ? (data.avgLcSolved / maxValues.avgLcSolved) * 100 : 0;
    const stdCfRating = maxValues.avgCfRating > 0 ? (data.avgCfRating / maxValues.avgCfRating) * 100 : 0;
    const stdPlatforms = maxValues.avgPlatformsLinked > 0 ? (data.avgPlatformsLinked / maxValues.avgPlatformsLinked) * 100 : 0;

    return {
      label: d,
      data: [stdAttendance, stdLcSolved, stdCfRating, stdPlatforms],
      borderColor: colors[d]?.border || '#fff',
      backgroundColor: colors[d]?.bg || 'rgba(0,0,0,0)',
      borderWidth: 2,
      pointBackgroundColor: colors[d]?.border
    };
  });

  const ctxRadar = document.getElementById('chart-dept-comparison-radar').getContext('2d');
  chartInstances['deptComparisonRadar'] = new Chart(ctxRadar, {
    type: 'radar',
    data: {
      labels: ['Contest Attendance', 'LeetCode Solved', 'CF Rating', 'Platforms Linked'],
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#94a3b8' } }
      },
      scales: {
        r: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          angleLines: { color: 'rgba(255,255,255,0.05)' },
          ticks: { display: false },
          pointLabels: { color: '#94a3b8', font: { family: 'Inter', size: 10 } }
        }
      }
    }
  });
}

function setupDeptListeners() {
  document.querySelectorAll('.dept-metric-toggle').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.dept-metric-toggle').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeDeptMetric = btn.dataset.metric;
      renderDeptComparisonCharts();
    };
  });
}

// ─── VIEW 5: SETTINGS ─────────────────────────────────────────────────
function setupSettingsListeners() {
  document.getElementById('settings-export-users').onclick = () => exportUsersFull();

  const profileForm = document.getElementById('admin-profile-form');
  if (profileForm) {
    profileForm.onsubmit = async (e) => {
      e.preventDefault();
      const btn = profileForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Saving...';

      const data = {
        name: document.getElementById('admin-name').value.trim(),
        department: document.getElementById('admin-dept').value,
        college: document.getElementById('admin-college').value
      };

      try {
        const res = await API.userAPI.updateProfile(data);
        Auth.setSession(localStorage.getItem('codetracker_token'), res.user);
        showToast('Admin profile details updated successfully! ✅', 'success');
      } catch (err) {
        showToast(`Failed to update profile: ${err.message}`, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '💾 Save Profile';
      }
    };
  }
}

async function loadAdminProfileSettings() {
  try {
    const res = await API.userAPI.getDashboard();
    const user = res.dashboard.user;

    document.getElementById('admin-name').value = user.name || '';
    document.getElementById('admin-dept').value = user.department || '';
    document.getElementById('admin-college').value = user.college || '';
  } catch (error) {
    showToast(`Failed to load admin profile details: ${error.message}`, 'error');
  }
}

async function exportUsersFull() {
  try {
    const res = await API.adminAPI.getUsers({ page: 1, limit: 10000 });
    const users = res.data;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Name,Email,Username,Department,Section,Year,JoinedDate,Role\n";
    users.forEach(u => {
      csvContent += `"${u.name}","${u.email}","${u.username || ''}","${u.department || ''}","${u.section || ''}","${u.year || ''}","${new Date(u.createdAt).toISOString()}","${u.role}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Users_Database_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Users database exported successfully. 📥', 'success');

  } catch (error) {
    showToast(`Export failed: ${error.message}`, 'error');
  }
}
