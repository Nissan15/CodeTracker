// ─── API Configuration ─────────────────────────────────────────────────────────
// In development: automatically uses localhost backend
// In production (Vercel): uses your Render backend URL
const isLocal = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);

// ⚠️ IMPORTANT: Replace the URL below with your actual Render backend URL
// Example: 'https://codetracker-backend-xxxx.onrender.com'
const RENDER_BACKEND_URL = 'https://codetracker-div3.onrender.com';

const API_BASE = isLocal ? 'http://localhost:5000' : RENDER_BACKEND_URL;

// ─── Core API Request ─────────────────────────────────────────────────────────
const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('codetracker_token');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || `HTTP ${res.status}`);
    }
    return data;
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please try again.');
    }
    throw error;
  }
};

// ─── Auth API ─────────────────────────────────────────────────────────────────
const authAPI = {
  register: (name, email, password, role = 'user') =>
    apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    }),

  login: (email, password) =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => apiRequest('/api/auth/me'),

  loginWithGoogle: () => {
    window.location.href = `${API_BASE}/api/auth/google`;
  },
};

// ─── User API ─────────────────────────────────────────────────────────────────
const userAPI = {
  getPublicProfile: (username) => apiRequest(`/api/user/${username}`),

  getDashboard: () => apiRequest('/api/user/dashboard'),

  updateProfile: (data) =>
    apiRequest('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ─── Platform API ─────────────────────────────────────────────────────────────
const platformAPI = {
  refreshAll: () => apiRequest('/api/platform/refresh-all'),

  refreshLeetCode: (username) => apiRequest(`/api/platform/leetcode/${username}`),

  refreshCodeforces: (handle) => apiRequest(`/api/platform/codeforces/${handle}`),

  refreshCodeChef: (username) => apiRequest(`/api/platform/codechef/${username}`),

  refreshAtCoder: (username) => apiRequest(`/api/platform/atcoder/${username}`),
};

// ─── Contests API ─────────────────────────────────────────────────────────────
const contestsAPI = {
  getAll: (platform = '') => {
    const query = platform ? `?platform=${platform}` : '';
    return apiRequest(`/api/contests${query}`);
  },
  getMyLogs: () => apiRequest('/api/contests/my-logs'),
};

// ─── Admin API ────────────────────────────────────────────────────────────────
const adminAPI = {
  getOverview: () => apiRequest('/api/admin/overview'),
  getUsers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/admin/users?${query}`);
  },
  getUserDetail: (id) => apiRequest(`/api/admin/users/${id}`),
  updateUser: (id, data) =>
    apiRequest(`/api/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteUser: (id) =>
    apiRequest(`/api/admin/users/${id}`, {
      method: 'DELETE',
    }),
  getAllContests: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/admin/contests?${query}`);
  },
  getContestUserDetail: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/admin/contests/detail?${query}`);
  },
  getContestStats: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/admin/contests/stats?${query}`);
  },
  getAllContestLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/admin/contests/logs?${query}`);
  },
  getDepartmentComparison: () => apiRequest('/api/admin/departments/comparison'),
};

// ─── Export ───────────────────────────────────────────────────────────────────
window.API = { authAPI, userAPI, platformAPI, contestsAPI, adminAPI, API_BASE };
