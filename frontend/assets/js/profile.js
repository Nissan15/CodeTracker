// ─── Profile Page Logic ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const username = params.get('u');

  if (username) {
    // Public profile view
    loadPublicProfile(username);
  } else if (Auth.isLoggedIn()) {
    // Own profile / settings
    loadOwnProfile();
  } else {
    window.location.href = 'login.html';
  }
});

async function loadPublicProfile(username) {
  document.title = `${username} - CodeTracker Profile`;
  showSection('public-profile');

  try {
    const res = await API.userAPI.getPublicProfile(username);
    renderPublicProfile(res.profile);
  } catch (err) {
    document.getElementById('profile-container').innerHTML = `
      <div class="empty-state" style="padding:80px 20px;">
        <div class="empty-icon">👤</div>
        <h3>${err.message === 'This profile is private' ? 'This profile is private' : 'User not found'}</h3>
        <p>${err.message}</p>
        <a href="index.html" class="btn btn-primary btn-sm" style="margin-top:16px;">Go Home</a>
      </div>`;
  }
}

function renderPublicProfile(profile) {
  document.title = `${profile.name} - CodeTracker`;

  const container = document.getElementById('profile-container');
  const lc = profile.platformStats?.leetcode;
  const cf = profile.platformStats?.codeforces;
  const cc = profile.platformStats?.codechef;
  const atcoder = profile.platformStats?.atcoder;

  const deptMap = {
    'CSE': 'Computer Science & Engineering',
    'AI&DS': 'Artificial Intelligence & Data Science',
    'AI&ML': 'Artificial Intelligence & Machine Learning',
    'CSBS': 'Computer Science & Business Systems'
  };
  const deptName = deptMap[profile.department] || profile.department;

  container.innerHTML = `
    <div style="max-width:900px;margin:0 auto;padding:32px 24px;animation:fadeIn 0.5s ease;">

      <!-- Profile Card -->
      <div class="glass-card" style="padding:32px;margin-bottom:24px;">
        <div style="display:flex;flex-wrap:wrap;align-items:flex-start;gap:24px;">
          ${profile.avatar
      ? `<img src="${profile.avatar}" class="avatar avatar-xl animate-fade-in" alt="${profile.name}" />`
      : `<div class="avatar-placeholder" style="width:100px;height:100px;font-size:2.5rem;border:3px solid var(--primary);">${profile.name?.charAt(0).toUpperCase()}</div>`
    }
          <div style="flex:1;">
            <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:4px;">${profile.name}</h1>
            <p style="color:var(--text-muted);font-size:0.875rem;margin-bottom:8px;">@${profile.username}</p>
            ${profile.bio ? `<p style="font-size:0.9rem;line-height:1.6;margin-bottom:12px;">${profile.bio}</p>` : ''}
            <div style="display:flex;flex-wrap:wrap;gap:16px;">
              ${profile.college ? `<span style="font-size:0.8rem;color:var(--text-muted);">🎓 ${profile.college}</span>` : ''}
              ${profile.department ? `<span style="font-size:0.8rem;color:var(--text-muted);">🏢 ${deptName}</span>` : ''}
              ${profile.section && profile.section !== 'None' ? `<span style="font-size:0.8rem;color:var(--text-muted);">🏫 Section ${profile.section}</span>` : ''}
              ${profile.year ? `<span style="font-size:0.8rem;color:var(--text-muted);">📅 ${profile.year}</span>` : ''}
              ${profile.location ? `<span style="font-size:0.8rem;color:var(--text-muted);">📍 ${profile.location}</span>` : ''}
              <span style="font-size:0.8rem;color:var(--text-muted);">📅 Member since ${new Date(profile.memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>
            <div style="display:flex;gap:12px;margin-top:12px;flex-wrap:wrap;">
              ${profile.socialLinks?.linkedin ? `<a href="${profile.socialLinks.linkedin}" target="_blank" class="btn btn-ghost btn-sm">💼 LinkedIn</a>` : ''}
              ${profile.socialLinks?.twitter ? `<a href="${profile.socialLinks.twitter}" target="_blank" class="btn btn-ghost btn-sm">🐦 Twitter</a>` : ''}
              ${profile.socialLinks?.website ? `<a href="${profile.socialLinks.website}" target="_blank" class="btn btn-ghost btn-sm">🌐 Website</a>` : ''}
              ${profile.platforms?.github ? `<a href="https://github.com/${profile.platforms.github}" target="_blank" class="btn btn-ghost btn-sm">🐙 GitHub</a>` : ''}
            </div>
          </div>
          <button onclick="shareProfile()" class="btn btn-secondary btn-sm">📤 Share</button>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="grid-4 stagger-children" style="margin-bottom:24px;">
        <div class="stat-card">
          <div class="stat-icon">📚</div>
          <div class="stat-value">${profile.stats?.totalQuestions || 0}</div>
          <div class="stat-label">Questions Tracked</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-value">${profile.stats?.solvedQuestions || 0}</div>
          <div class="stat-label">Problems Solved</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⚡</div>
          <div class="stat-value">${lc?.totalSolved || '—'}</div>
          <div class="stat-label">LeetCode Solved</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🔵</div>
          <div class="stat-value">${cf?.rating || '—'}</div>
          <div class="stat-label">CF Rating</div>
        </div>
      </div>

      <!-- Platform Stats -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:24px;margin-bottom:24px;">
        ${lc ? `
        <div class="glass-card" style="padding:20px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
            <span style="font-size:1.4rem;">⚡</span>
            <span style="font-weight:700;color:#FFA116;">LeetCode</span>
            ${profile.platforms?.leetcode ? `<a href="https://leetcode.com/${profile.platforms.leetcode}" target="_blank" style="font-size:0.75rem;color:var(--text-muted);">@${profile.platforms.leetcode} ↗</a>` : ''}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="glass-card-2" style="padding:12px;text-align:center;">
              <div style="font-size:1.5rem;font-weight:800;color:#10b981;">${lc.easySolved || 0}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);">Easy</div>
            </div>
            <div class="glass-card-2" style="padding:12px;text-align:center;">
              <div style="font-size:1.5rem;font-weight:800;color:#f59e0b;">${lc.mediumSolved || 0}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);">Medium</div>
            </div>
            <div class="glass-card-2" style="padding:12px;text-align:center;">
              <div style="font-size:1.5rem;font-weight:800;color:#ef4444;">${lc.hardSolved || 0}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);">Hard</div>
            </div>
            <div class="glass-card-2" style="padding:12px;text-align:center;">
              <div style="font-size:1.5rem;font-weight:800;color:var(--primary-light);">${lc.rating || '—'}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);">Contest Rating</div>
            </div>
            <div class="glass-card-2" style="padding:12px;text-align:center;grid-column:span 2;">
              <div style="font-size:1.5rem;font-weight:800;color:var(--primary-light);">${lc.contestsAttended || 0}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);">Contests Attended</div>
            </div>
          </div>
        </div>
        ` : ''}

        ${cf ? `
        <div class="glass-card" style="padding:20px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
            <span style="font-size:1.4rem;">🔵</span>
            <span style="font-weight:700;color:#1F8ACB;">Codeforces</span>
            ${profile.platforms?.codeforces ? `<a href="https://codeforces.com/profile/${profile.platforms.codeforces}" target="_blank" style="font-size:0.75rem;color:var(--text-muted);">@${profile.platforms.codeforces} ↗</a>` : ''}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="glass-card-2" style="padding:12px;text-align:center;">
              <div style="font-size:1.5rem;font-weight:800;color:#1F8ACB;">${cf.rating || 0}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);">Current Rating</div>
            </div>
            <div class="glass-card-2" style="padding:12px;text-align:center;">
              <div style="font-size:1.5rem;font-weight:800;color:var(--text-primary);">${cf.maxRating || 0}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);">Max Rating</div>
            </div>
            <div class="glass-card-2" style="padding:12px;text-align:center;">
              <div style="font-size:1rem;font-weight:700;text-transform:capitalize;color:var(--primary-light);">${cf.rank || 'unrated'}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);">Rank</div>
            </div>
            <div class="glass-card-2" style="padding:12px;text-align:center;">
              <div style="font-size:1.5rem;font-weight:800;color:#10b981;">${cf.problemsSolved || 0}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);">Solved</div>
            </div>
            <div class="glass-card-2" style="padding:12px;text-align:center;grid-column:span 2;">
              <div style="font-size:1.5rem;font-weight:800;color:var(--primary-light);">${cf.contestsAttended || 0}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);">Contests Attended</div>
            </div>
          </div>
        </div>
        ` : ''}

        ${cc ? `
        <div class="glass-card" style="padding:20px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
            <span style="font-size:1.4rem;">👨‍🍳</span>
            <span style="font-weight:700;color:#B17F59;">CodeChef</span>
            ${profile.platforms?.codechef ? `<a href="https://codechef.com/users/${profile.platforms.codechef}" target="_blank" style="font-size:0.75rem;color:var(--text-muted);">@${profile.platforms.codechef} ↗</a>` : ''}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="glass-card-2" style="padding:12px;text-align:center;">
              <div style="font-size:1.5rem;font-weight:800;color:#B17F59;">${cc.rating || 0}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);">Current Rating</div>
            </div>
            <div class="glass-card-2" style="padding:12px;text-align:center;">
              <div style="font-size:1.5rem;font-weight:800;color:var(--text-primary);">${cc.highestRating || 0}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);">Highest Rating</div>
            </div>
            <div class="glass-card-2" style="padding:12px;text-align:center;">
              <div style="font-size:1rem;font-weight:700;color:var(--primary-light);">${cc.stars || '—'}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);">Stars</div>
            </div>
            <div class="glass-card-2" style="padding:12px;text-align:center;">
              <div style="font-size:1.5rem;font-weight:800;color:#10b981;">${cc.problemsSolved || 0}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);">Solved</div>
            </div>
            <div class="glass-card-2" style="padding:12px;text-align:center;grid-column:span 2;">
              <div style="font-size:1.5rem;font-weight:800;color:var(--primary-light);">${cc.contestsAttended || 0}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);">Contests Attended</div>
            </div>
          </div>
        </div>
        ` : ''}

        ${atcoder && profile.platforms?.atcoder ? `
        <div class="glass-card" style="padding:20px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
            <span style="font-size:1.4rem;">🔴</span>
            <span style="font-weight:700;color:#FF0000;">AtCoder</span>
            ${profile.platforms?.atcoder ? `<a href="https://atcoder.jp/users/${profile.platforms.atcoder}" target="_blank" style="font-size:0.75rem;color:var(--text-muted);">@${profile.platforms.atcoder} ↗</a>` : ''}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="glass-card-2" style="padding:12px;text-align:center;">
              <div style="font-size:1.5rem;font-weight:800;color:#ef4444;">${atcoder.rating || 0}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);">Current Rating</div>
            </div>
            <div class="glass-card-2" style="padding:12px;text-align:center;">
              <div style="font-size:1.5rem;font-weight:800;color:var(--text-primary);">${atcoder.highestRating || 0}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);">Highest Rating</div>
            </div>
            <div class="glass-card-2" style="padding:12px;text-align:center;">
              <div style="font-size:1rem;font-weight:700;color:var(--primary-light);">${atcoder.rank || '—'}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);">Rank</div>
            </div>
            <div class="glass-card-2" style="padding:12px;text-align:center;">
              <div style="font-size:1.5rem;font-weight:800;color:#10b981;">${atcoder.problemsSolved || 0}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);">Solved</div>
            </div>
            <div class="glass-card-2" style="padding:12px;text-align:center;grid-column:span 2;">
              <div style="font-size:1.5rem;font-weight:800;color:var(--primary-light);">${atcoder.contestsAttended || 0}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);">Contests Attended</div>
            </div>
          </div>
        </div>
        ` : ''}
      </div>
    </div>
  `;
}

async function loadOwnProfile() {
  document.title = 'My Profile - CodeTracker';
  showSection('own-profile');

  try {
    const res = await API.userAPI.getDashboard();
    populateSettingsForm(res.dashboard.user);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function populateSettingsForm(user) {
  const fields = {
    'set-name': user.name,
    'set-username': user.username,
    'set-bio': user.bio,
    'set-college': user.college,
    'set-location': user.location,
    'set-department': user.department,
    'set-section': user.section,
    'set-year': user.year,
    'set-lc': user.platforms?.leetcode,
    'set-cf': user.platforms?.codeforces,
    'set-cc': user.platforms?.codechef,
    'set-atcoder': user.platforms?.atcoder,
    'set-gfg': user.platforms?.gfg,
    'set-github': user.platforms?.github,
    'set-linkedin': user.socialLinks?.linkedin,
    'set-twitter': user.socialLinks?.twitter,
    'set-website': user.socialLinks?.website,
  };

  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  });

  const toggle = document.getElementById('set-public');
  if (toggle) toggle.checked = user.isPublic !== false;

  // Share link
  const link = document.getElementById('own-share-link');
  if (link && user.username) link.value = `${window.location.origin}/profile.html?u=${user.username}`;

  // Avatar preview
  if (user.avatar) {
    const img = document.getElementById('settings-avatar');
    if (img) img.src = user.avatar;
  }
}

// Settings form submit
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('settings-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Saving...';

    const data = {
      name: document.getElementById('set-name').value,
      username: document.getElementById('set-username').value,
      bio: document.getElementById('set-bio').value,
      college: document.getElementById('set-college').value,
      location: document.getElementById('set-location').value,
      department: document.getElementById('set-department').value,
      section: document.getElementById('set-section').value,
      year: document.getElementById('set-year').value,
      isPublic: document.getElementById('set-public').checked,
      platforms: {
        leetcode: document.getElementById('set-lc').value,
        codeforces: document.getElementById('set-cf').value,
        codechef: document.getElementById('set-cc').value,
        gfg: document.getElementById('set-gfg').value,
        atcoder: document.getElementById('set-atcoder').value,
        github: document.getElementById('set-github').value,
      },
      socialLinks: {
        linkedin: document.getElementById('set-linkedin').value,
        twitter: document.getElementById('set-twitter').value,
        website: document.getElementById('set-website').value,
      },
    };

    try {
      const res = await API.userAPI.updateProfile(data);
      // Update cached user
      Auth.setSession(localStorage.getItem('codetracker_token'), res.user);
      showToast('Profile updated! Refreshing platform stats...', 'success');

      // Auto-refresh platform stats so new usernames fetch immediately
      try {
        await API.platformAPI.refreshAll();
        showToast('Platform stats refreshed! ✅', 'success');
      } catch (refreshErr) {
        // Non-fatal — user can manually refresh on dashboard
        console.warn('Auto-refresh failed:', refreshErr.message);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '💾 Save Changes';
    }
  });
});

function showSection(id) {
  document.getElementById('public-profile')?.style.setProperty('display', id === 'public-profile' ? 'block' : 'none');
  document.getElementById('own-profile')?.style.setProperty('display', id === 'own-profile' ? 'block' : 'none');
}

function shareProfile() {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => showToast('Profile URL copied!', 'success'));
}

window.shareProfile = shareProfile;
