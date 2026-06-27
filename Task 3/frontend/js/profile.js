/* ─────────────────────────────────────────
   profile.js — User Profile Page Logic
   ───────────────────────────────────────── */

let profileUser   = null;
let currentUser   = null;
let isOwnProfile  = false;

document.addEventListener('DOMContentLoaded', async () => {
  requireAuth();
  currentUser = getUser();

  const params = new URLSearchParams(window.location.search);
  const username = params.get('u');

  if (!username) {
    // No user specified — show current user's profile
    window.location.href = `/profile.html?u=${currentUser.username}`;
    return;
  }

  initNavbar();
  await loadProfile(username);
});

// ─────────────────────────────────────────
//  Navbar
// ─────────────────────────────────────────
function initNavbar() {
  const avatarEl = document.getElementById('nav-avatar');
  if (avatarEl && currentUser) {
    if (currentUser.avatar_url) {
      avatarEl.innerHTML = `<img src="${currentUser.avatar_url}" alt="${currentUser.username}">`;
    } else {
      avatarEl.textContent = avatarInitials(currentUser.username);
    }
    avatarEl.addEventListener('click', () => {
      window.location.href = `/profile.html?u=${currentUser.username}`;
    });
  }

  document.getElementById('logout-btn')?.addEventListener('click', Auth.logout);

  document.getElementById('nav-feed-btn')?.addEventListener('click', () => {
    window.location.href = '/feed.html';
  });
}

// ─────────────────────────────────────────
//  Load Profile
// ─────────────────────────────────────────
async function loadProfile(username) {
  try {
    const [profileData, postsData] = await Promise.all([
      Users.profile(username),
      Users.posts(username),
    ]);

    profileUser  = profileData.user;
    isOwnProfile = currentUser && currentUser.id === profileUser.id;

    renderProfileHeader(profileUser);
    renderPosts(postsData.posts);

    if (!isOwnProfile && currentUser) {
      await loadFollowStatus();
    }
  } catch (err) {
    showToast(err.message, 'error');
    document.getElementById('profile-content')?.insertAdjacentHTML('beforeend',
      `<div class="empty-state"><div class="empty-icon">😕</div><h3>User not found</h3></div>`
    );
  }
}

// ─────────────────────────────────────────
//  Render Profile Header
// ─────────────────────────────────────────
function renderProfileHeader(user) {
  // Set document title
  document.title = `@${user.username} — Nexus`;

  // Avatar
  const avatarEl = document.getElementById('profile-avatar');
  if (avatarEl) {
    if (user.avatar_url) {
      avatarEl.innerHTML = `<img src="${user.avatar_url}" alt="${user.username}">`;
    } else {
      avatarEl.textContent = avatarInitials(user.username);
    }
  }

  // Username & bio
  const usernameEl = document.getElementById('profile-username');
  if (usernameEl) usernameEl.textContent = '@' + user.username;

  const bioEl = document.getElementById('profile-bio');
  if (bioEl) bioEl.textContent = user.bio || 'No bio yet.';

  // Stats
  document.getElementById('stat-posts')?.setAttribute('data-count', user.postCount || 0);
  document.getElementById('stat-followers')?.setAttribute('data-count', user.followerCount || 0);
  document.getElementById('stat-following')?.setAttribute('data-count', user.followingCount || 0);

  animateCounters();

  // Action buttons
  const actionsEl = document.getElementById('profile-actions');
  if (!actionsEl) return;

  if (isOwnProfile) {
    actionsEl.innerHTML = `
      <button class="btn btn-secondary" id="edit-profile-btn">✏️ Edit Profile</button>
    `;
    document.getElementById('edit-profile-btn').addEventListener('click', openEditModal);
    initEditModal(user);
  } else {
    actionsEl.innerHTML = `
      <button class="btn btn-primary btn-follow" id="follow-btn" data-id="${user.id}">
        <span id="follow-btn-text">Follow</span>
      </button>
      <a href="/feed.html" class="btn btn-secondary">🏠 Feed</a>
    `;
    document.getElementById('follow-btn').addEventListener('click', toggleFollow);
  }
}

// ─────────────────────────────────────────
//  Animate Stat Counters
// ─────────────────────────────────────────
function animateCounters() {
  ['stat-posts', 'stat-followers', 'stat-following'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const target = parseInt(el.getAttribute('data-count')) || 0;
    let current = 0;
    const step  = Math.max(1, Math.floor(target / 30));
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current;
      if (current >= target) clearInterval(timer);
    }, 30);
  });
}

// ─────────────────────────────────────────
//  Render Posts
// ─────────────────────────────────────────
function renderPosts(posts) {
  const container = document.getElementById('posts-container');
  if (!container) return;

  if (posts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <h3>No posts yet</h3>
        <p>${isOwnProfile ? 'Share your first post on the feed!' : 'This user hasn\'t posted yet.'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div class="posts-list" id="posts-list"></div>`;
  const listEl = document.getElementById('posts-list');

  posts.forEach(post => {
    listEl.insertAdjacentHTML('beforeend', buildProfilePostCard(post));
    attachProfilePostListeners(post.id, post);
  });
}

function buildProfilePostCard(post) {
  const liked = post.liked_by_me;
  const imageHTML = post.image_url
    ? `<img src="${escapeHtml(post.image_url)}" alt="Post image" class="post-image" loading="lazy"/>`
    : '';

  return `
    <div class="glass-card post-card" id="prof-post-${post.id}">
      <div class="post-content">${escapeHtml(post.content)}</div>
      ${imageHTML}
      <div class="post-actions">
        <button class="post-action-btn like-btn ${liked ? 'liked' : ''}"
          data-post-id="${post.id}" data-liked="${liked ? '1' : '0'}">
          <span class="action-icon">${liked ? '❤️' : '🤍'}</span>
          <span class="like-count">${post.like_count}</span>
        </button>
        <a href="/post.html?id=${post.id}" class="post-action-btn" style="text-decoration:none">
          <span class="action-icon">💬</span>
          <span>${post.comment_count}</span>
        </a>
        <span class="post-action-btn text-muted" style="cursor:default;font-size:0.78rem">
          ${timeAgo(post.created_at)}
        </span>
        ${isOwnProfile ? `<button class="post-action-btn btn-danger-soft delete-post-btn" data-post-id="${post.id}" style="margin-left:auto;color:var(--danger)">🗑️</button>` : ''}
      </div>
    </div>
  `;
}

function attachProfilePostListeners(postId, post) {
  // Like
  const likeBtn = document.querySelector(`#prof-post-${postId} .like-btn`);
  likeBtn?.addEventListener('click', async () => {
    const isLiked = likeBtn.dataset.liked === '1';
    const countEl = likeBtn.querySelector('.like-count');
    try {
      const data = isLiked ? await Likes.unlike(postId) : await Likes.like(postId);
      likeBtn.classList.toggle('liked', !isLiked);
      likeBtn.querySelector('.action-icon').textContent = !isLiked ? '❤️' : '🤍';
      likeBtn.dataset.liked = isLiked ? '0' : '1';
      if (countEl) countEl.textContent = data.like_count;
    } catch (err) { showToast(err.message, 'error'); }
  });

  // Delete (own posts)
  const deleteBtn = document.querySelector(`#prof-post-${postId} .delete-post-btn`);
  deleteBtn?.addEventListener('click', async () => {
    if (!confirm('Delete this post?')) return;
    try {
      await Posts.delete(postId);
      document.getElementById(`prof-post-${postId}`)?.remove();
      showToast('Post deleted', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  });
}

// ─────────────────────────────────────────
//  Follow / Unfollow
// ─────────────────────────────────────────
async function loadFollowStatus() {
  try {
    const data = await Users.followStatus(profileUser.id);
    updateFollowButton(data.following);
  } catch (err) { /* ignore */ }
}

async function toggleFollow() {
  const btn = document.getElementById('follow-btn');
  const isFollowing = btn.dataset.following === '1';

  btn.disabled = true;
  try {
    let data;
    if (isFollowing) {
      data = await Users.unfollow(profileUser.id);
    } else {
      data = await Users.follow(profileUser.id);
    }
    updateFollowButton(data.following);

    // Update follower count
    const followerEl = document.getElementById('stat-followers');
    if (followerEl) {
      const current = parseInt(followerEl.textContent) || 0;
      followerEl.textContent = data.following ? current + 1 : Math.max(0, current - 1);
    }

    showToast(data.following ? `Following @${profileUser.username}` : `Unfollowed @${profileUser.username}`, 'info');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

function updateFollowButton(isFollowing) {
  const btn = document.getElementById('follow-btn');
  const textEl = document.getElementById('follow-btn-text');
  if (!btn) return;

  btn.dataset.following = isFollowing ? '1' : '0';

  if (isFollowing) {
    btn.className = 'btn btn-follow following';
    if (textEl) textEl.textContent = 'Following ✓';
    btn.onmouseenter = () => { if (textEl) textEl.textContent = 'Unfollow'; };
    btn.onmouseleave = () => { if (textEl) textEl.textContent = 'Following ✓'; };
  } else {
    btn.className = 'btn btn-primary btn-follow';
    if (textEl) textEl.textContent = '+ Follow';
    btn.onmouseenter = null;
    btn.onmouseleave = null;
  }
}

// ─────────────────────────────────────────
//  Edit Profile Modal
// ─────────────────────────────────────────
function openEditModal() {
  document.getElementById('edit-modal')?.classList.add('show');
}

function closeEditModal() {
  document.getElementById('edit-modal')?.classList.remove('show');
}

function initEditModal(user) {
  const modal = document.getElementById('edit-modal');
  if (!modal) return;

  // Pre-fill form
  document.getElementById('edit-bio').value = user.bio || '';
  document.getElementById('edit-avatar').value = user.avatar_url || '';

  document.getElementById('modal-close-btn')?.addEventListener('click', closeEditModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeEditModal(); });

  document.getElementById('edit-profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bio = document.getElementById('edit-bio').value.trim();
    const avatar_url = document.getElementById('edit-avatar').value.trim();

    const saveBtn = document.getElementById('save-profile-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const data = await Users.updateProfile({ bio, avatar_url });
      setUser({ ...currentUser, bio: data.user.bio, avatar_url: data.user.avatar_url });
      currentUser = getUser();
      showToast('Profile updated! 🎉', 'success');
      closeEditModal();
      // Reload profile to reflect changes
      setTimeout(() => location.reload(), 600);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }
  });
}
