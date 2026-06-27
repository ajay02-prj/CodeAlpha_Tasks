/* ─────────────────────────────────────────
   feed.js — Home Feed Page Logic
   ───────────────────────────────────────── */

let currentTab    = 'explore'; // 'explore' | 'following'
let currentPage   = 1;
let isLoading     = false;
let hasMore       = true;
let currentUser   = null;

document.addEventListener('DOMContentLoaded', async () => {
  requireAuth();
  currentUser = getUser();

  initNavbar();
  initMyProfileWidget();
  initCreatePost();
  initFeedTabs();
  initSearch();
  loadFeed(true);

  // Infinite scroll
  window.addEventListener('scroll', onScroll);
});

// ─────────────────────────────────────────
//  Navbar
// ─────────────────────────────────────────
function initNavbar() {
  const user = currentUser;
  if (!user) return;

  const avatarEl = document.getElementById('nav-avatar');
  if (avatarEl) {
    if (user.avatar_url) {
      avatarEl.innerHTML = `<img src="${user.avatar_url}" alt="${user.username}">`;
    } else {
      avatarEl.textContent = avatarInitials(user.username);
    }
    avatarEl.addEventListener('click', () => {
      window.location.href = `/profile.html?u=${user.username}`;
    });
  }

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    Auth.logout();
  });
}

// ─────────────────────────────────────────
//  My Profile Widget
// ─────────────────────────────────────────
async function initMyProfileWidget() {
  if (!currentUser) return;

  try {
    const data = await Users.profile(currentUser.username);
    const u = data.user;

    const el = document.getElementById('my-profile-widget');
    if (!el) return;

    el.innerHTML = `
      <a href="/profile.html?u=${u.username}" style="text-decoration:none">
        ${avatarHTML(u, 'avatar-md')}
      </a>
      <a class="username" href="/profile.html?u=${u.username}"
         style="font-weight:700;color:var(--text-primary);text-decoration:none">
        @${u.username}
      </a>
      <div class="my-profile-stats">
        <div class="profile-stat">
          <strong>${u.postCount || 0}</strong>
          <span>Posts</span>
        </div>
        <div class="profile-stat">
          <strong>${u.followerCount || 0}</strong>
          <span>Followers</span>
        </div>
        <div class="profile-stat">
          <strong>${u.followingCount || 0}</strong>
          <span>Following</span>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Profile widget error:', err);
  }
}

// ─────────────────────────────────────────
//  Create Post
// ─────────────────────────────────────────
function initCreatePost() {
  const textarea  = document.getElementById('post-content');
  const charCount = document.getElementById('char-count');
  const submitBtn = document.getElementById('create-post-btn');

  if (!textarea) return;

  // Show user avatar in create box
  const avatarWrap = document.getElementById('create-post-avatar');
  if (avatarWrap && currentUser) {
    avatarWrap.innerHTML = avatarHTML(currentUser, 'avatar-md');
  }

  textarea.addEventListener('input', () => {
    const len = textarea.value.length;
    if (charCount) {
      charCount.textContent = `${len}/500`;
      charCount.className = 'char-count' +
        (len > 450 ? ' danger' : len > 380 ? ' warning' : '');
    }
    if (submitBtn) submitBtn.disabled = len === 0 || len > 500;
  });

  submitBtn?.addEventListener('click', async () => {
    const content = textarea.value.trim();
    if (!content) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="btn-spinner"></span>`;

    try {
      const data = await Posts.create({ content });
      textarea.value = '';
      if (charCount) charCount.textContent = '0/500';
      submitBtn.innerHTML = 'Post';

      // Prepend new post to feed
      const feedEl = document.getElementById('feed-list');
      if (feedEl) {
        const cardHTML = buildPostCard(data.post);
        feedEl.insertAdjacentHTML('afterbegin', cardHTML);
        attachPostListeners(data.post.id);
      }
      showToast('Post published! ✨', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Post';
    }
  });
}

// ─────────────────────────────────────────
//  Feed Tabs
// ─────────────────────────────────────────
function initFeedTabs() {
  document.querySelectorAll('.feed-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.feed-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.tab;
      loadFeed(true);
    });
  });
}

// ─────────────────────────────────────────
//  Load Feed
// ─────────────────────────────────────────
async function loadFeed(reset = false) {
  if (isLoading) return;

  if (reset) {
    currentPage = 1;
    hasMore = true;
    const feedEl = document.getElementById('feed-list');
    if (feedEl) feedEl.innerHTML = loadingHTML();
  }

  isLoading = true;

  try {
    let data;
    if (currentTab === 'following') {
      data = await Posts.feed(currentPage);
    } else {
      data = await Posts.all(currentPage, currentUser?.id);
    }

    const posts = data.posts || [];

    if (posts.length < 20) hasMore = false;

    const feedEl = document.getElementById('feed-list');
    if (!feedEl) return;

    if (reset) feedEl.innerHTML = '';

    if (posts.length === 0 && currentPage === 1) {
      feedEl.innerHTML = emptyFeedHTML();
      return;
    }

    posts.forEach(post => {
      feedEl.insertAdjacentHTML('beforeend', buildPostCard(post));
      attachPostListeners(post.id);
    });

    currentPage++;
  } catch (err) {
    showToast(err.message, 'error');
    const feedEl = document.getElementById('feed-list');
    if (feedEl && currentPage === 1) feedEl.innerHTML = `<p class="text-center text-muted" style="padding:40px">Failed to load feed.</p>`;
  } finally {
    isLoading = false;
  }
}

// ─────────────────────────────────────────
//  Build Post Card HTML
// ─────────────────────────────────────────
function buildPostCard(post) {
  const liked = post.liked_by_me;
  const imageHTML = post.image_url
    ? `<img src="${escapeHtml(post.image_url)}" alt="Post image" class="post-image" loading="lazy" />`
    : '';

  return `
    <div class="glass-card post-card" id="post-${post.id}">
      <div class="post-header">
        <a href="/profile.html?u=${escapeHtml(post.username)}" style="text-decoration:none">
          ${avatarHTML({ username: post.username, avatar_url: post.avatar_url }, 'avatar-sm')}
        </a>
        <div class="post-author-info">
          <a class="post-author-name" href="/profile.html?u=${escapeHtml(post.username)}">@${escapeHtml(post.username)}</a>
          <div class="post-time">${timeAgo(post.created_at)}</div>
        </div>
      </div>

      <div class="post-content">${escapeHtml(post.content)}</div>
      ${imageHTML}

      <div class="post-actions">
        <button class="post-action-btn like-btn ${liked ? 'liked' : ''}" data-post-id="${post.id}" data-liked="${liked ? '1' : '0'}">
          <span class="action-icon">${liked ? '❤️' : '🤍'}</span>
          <span class="like-count">${post.like_count}</span>
        </button>
        <button class="post-action-btn comment-btn" data-post-id="${post.id}">
          <span class="action-icon">💬</span>
          <span>${post.comment_count}</span>
        </button>
        <a href="/post.html?id=${post.id}" class="post-action-btn" style="text-decoration:none">
          <span class="action-icon">↗️</span>
          <span>View</span>
        </a>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────
//  Attach Event Listeners to Post
// ─────────────────────────────────────────
function attachPostListeners(postId) {
  // Like
  const likeBtn = document.querySelector(`#post-${postId} .like-btn`);
  if (likeBtn) {
    likeBtn.addEventListener('click', async () => {
      if (!isLoggedIn()) return showToast('Login to like posts', 'info');
      const isLiked = likeBtn.dataset.liked === '1';
      const countEl = likeBtn.querySelector('.like-count');

      try {
        let data;
        if (isLiked) {
          data = await Likes.unlike(postId);
          likeBtn.classList.remove('liked');
          likeBtn.querySelector('.action-icon').textContent = '🤍';
          likeBtn.dataset.liked = '0';
        } else {
          data = await Likes.like(postId);
          likeBtn.classList.add('liked');
          likeBtn.querySelector('.action-icon').textContent = '❤️';
          likeBtn.dataset.liked = '1';
        }
        if (countEl) countEl.textContent = data.like_count;
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Comment — navigate to post detail
  const commentBtn = document.querySelector(`#post-${postId} .comment-btn`);
  if (commentBtn) {
    commentBtn.addEventListener('click', () => {
      window.location.href = `/post.html?id=${postId}`;
    });
  }
}

// ─────────────────────────────────────────
//  Search
// ─────────────────────────────────────────
function initSearch() {
  const searchBar = document.getElementById('search-bar');
  const resultsEl = document.getElementById('search-results');
  if (!searchBar || !resultsEl) return;

  let debounceTimer;

  searchBar.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = searchBar.value.trim();

    if (!q) { resultsEl.innerHTML = ''; return; }

    debounceTimer = setTimeout(async () => {
      try {
        const data = await Users.search(q);
        resultsEl.innerHTML = data.users.length === 0
          ? '<p class="text-sm text-muted" style="padding:8px">No users found</p>'
          : data.users.map(u => `
              <a href="/profile.html?u=${escapeHtml(u.username)}" class="search-result-item">
                ${avatarHTML(u, 'avatar-sm')}
                <span class="name">@${escapeHtml(u.username)}</span>
              </a>
            `).join('');
      } catch (e) { /* silent */ }
    }, 350);
  });
}

// ─────────────────────────────────────────
//  Infinite Scroll
// ─────────────────────────────────────────
function onScroll() {
  if (!hasMore || isLoading) return;
  const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
  if (nearBottom) loadFeed(false);
}

// ── HTML Helpers ──────────────────────────
function loadingHTML() {
  return `<div class="loading-overlay"><div class="spinner"></div><span>Loading posts...</span></div>`;
}

function emptyFeedHTML() {
  return `
    <div class="empty-state">
      <div class="empty-icon">📭</div>
      <h3>${currentTab === 'following' ? 'No posts from people you follow' : 'No posts yet'}</h3>
      <p>${currentTab === 'following' ? 'Follow some users to see their posts here' : 'Be the first to post something!'}</p>
    </div>
  `;
}
