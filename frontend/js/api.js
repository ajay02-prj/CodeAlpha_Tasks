/* ─────────────────────────────────────────
   api.js — Shared API helper & Auth token management
   ───────────────────────────────────────── */

const API_BASE = '/api';

// ── Token Management ──────────────────────
function getToken() {
  return localStorage.getItem('sm_token');
}

function setToken(token) {
  localStorage.setItem('sm_token', token);
}

function removeToken() {
  localStorage.removeItem('sm_token');
  localStorage.removeItem('sm_user');
}

function getUser() {
  const raw = localStorage.getItem('sm_user');
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function setUser(user) {
  localStorage.setItem('sm_user', JSON.stringify(user));
}

function isLoggedIn() {
  return !!getToken();
}

// ── Redirect Guards ───────────────────────
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '/index.html';
  }
}

function redirectIfLoggedIn() {
  if (isLoggedIn()) {
    window.location.href = '/feed.html';
  }
}

// ── Core Fetch Wrapper ────────────────────
async function apiRequest(method, endpoint, body = null, requiresAuth = false) {
  const headers = { 'Content-Type': 'application/json' };

  if (requiresAuth) {
    const token = getToken();
    if (!token) {
      window.location.href = '/index.html';
      return;
    }
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

// ── Auth API ──────────────────────────────
const Auth = {
  register: (payload) => apiRequest('POST', '/auth/register', payload),
  login:    (payload) => apiRequest('POST', '/auth/login',    payload),
  me:       ()        => apiRequest('GET',  '/auth/me', null, true),
  logout: () => {
    removeToken();
    window.location.href = '/index.html';
  }
};

// ── Posts API ─────────────────────────────
const Posts = {
  all:    (page = 1, userId = null) => {
    const qs = `?page=${page}&limit=20${userId ? `&userId=${userId}` : ''}`;
    return apiRequest('GET', `/posts${qs}`);
  },
  feed:   (page = 1) => apiRequest('GET',  `/posts/feed?page=${page}`, null, true),
  get:    (id)       => apiRequest('GET',  `/posts/${id}`),
  create: (payload)  => apiRequest('POST', '/posts', payload, true),
  delete: (id)       => apiRequest('DELETE', `/posts/${id}`, null, true),
};

// ── Comments API ──────────────────────────
const Comments = {
  list:   (postId)          => apiRequest('GET',    `/comments/${postId}`),
  add:    (postId, content) => apiRequest('POST',   `/comments/${postId}`, { content }, true),
  delete: (commentId)       => apiRequest('DELETE', `/comments/${commentId}`, null, true),
};

// ── Likes API ─────────────────────────────
const Likes = {
  like:   (postId) => apiRequest('POST',   `/likes/${postId}`, null, true),
  unlike: (postId) => apiRequest('DELETE', `/likes/${postId}`, null, true),
  status: (postId) => apiRequest('GET',    `/likes/${postId}`, null, true),
};

// ── Users API ─────────────────────────────
const Users = {
  profile:       (username) => apiRequest('GET', `/users/${username}`),
  posts:         (username) => apiRequest('GET', `/users/${username}/posts`),
  updateProfile: (payload)  => apiRequest('PUT', '/users/profile/update', payload, true),
  follow:        (id)       => apiRequest('POST',   `/users/${id}/follow`, null, true),
  unfollow:      (id)       => apiRequest('DELETE', `/users/${id}/follow`, null, true),
  followStatus:  (id)       => apiRequest('GET',    `/users/${id}/follow-status`, null, true),
  search:        (q)        => apiRequest('GET',    `/users/search/${encodeURIComponent(q)}`),
};

// ── Toast Notifications ───────────────────
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 3200);
}

// ── Format relative time ──────────────────
function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60)  return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Generate Avatar Initials ──────────────
function avatarInitials(username) {
  return username ? username.charAt(0).toUpperCase() : '?';
}

// ── Avatar HTML helper ────────────────────
function avatarHTML(user, sizeClass = 'avatar-md') {
  if (user.avatar_url) {
    return `<div class="avatar ${sizeClass}"><img src="${user.avatar_url}" alt="${user.username}" /></div>`;
  }
  return `<div class="avatar ${sizeClass}" style="background:var(--accent)">${avatarInitials(user.username)}</div>`;
}

// ── Escape HTML ───────────────────────────
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
