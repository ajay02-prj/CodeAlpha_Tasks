/* ─────────────────────────────────────────
   post.js — Single Post Detail Page Logic
   ───────────────────────────────────────── */

let currentPost = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  requireAuth();
  currentUser = getUser();

  const params = new URLSearchParams(window.location.search);
  const postId = params.get('id');

  if (!postId) {
    window.location.href = '/feed.html';
    return;
  }

  initNavbar();
  await loadPost(postId);
  await loadComments(postId);
  initCommentForm(postId);
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
}

// ─────────────────────────────────────────
//  Load Post
// ─────────────────────────────────────────
async function loadPost(postId) {
  const container = document.getElementById('post-detail-container');
  if (!container) return;

  container.innerHTML = `<div class="loading-overlay"><div class="spinner"></div><span>Loading post...</span></div>`;

  try {
    const data = await Posts.get(postId);
    currentPost = data.post;

    document.title = `@${currentPost.username}'s post — Nexus`;

    // Check like status
    let liked = false;
    let likeCount = currentPost.like_count;
    try {
      const likeData = await Likes.status(postId);
      liked = likeData.liked_by_me;
      likeCount = likeData.like_count;
    } catch (e) { /* ignore if not auth */ }

    const isOwn = currentUser && currentUser.id === currentPost.user_id;
    const imageHTML = currentPost.image_url
      ? `<img src="${escapeHtml(currentPost.image_url)}" alt="Post image" class="post-detail-image" />`
      : '';

    container.innerHTML = `
      <div class="glass-card post-detail-card">
        <div class="post-detail-header">
          <a href="/profile.html?u=${escapeHtml(currentPost.username)}" style="text-decoration:none">
            ${avatarHTML({ username: currentPost.username, avatar_url: currentPost.avatar_url }, 'avatar-md')}
          </a>
          <div class="post-detail-author">
            <a class="name" href="/profile.html?u=${escapeHtml(currentPost.username)}">@${escapeHtml(currentPost.username)}</a>
            <div class="time">${timeAgo(currentPost.created_at)}</div>
          </div>
          ${isOwn ? `
            <button class="delete-post-btn" id="delete-post-btn">🗑️ Delete</button>
          ` : ''}
        </div>

        <div class="post-detail-content">${escapeHtml(currentPost.content)}</div>
        ${imageHTML}

        <div class="post-stats-row">
          <div class="post-stat">
            <strong id="display-like-count">${likeCount}</strong>
            <span>Likes</span>
          </div>
          <div class="post-stat">
            <strong id="display-comment-count">${currentPost.comment_count}</strong>
            <span>Comments</span>
          </div>
          <div class="post-stat text-muted">
            📅 ${new Date(currentPost.created_at).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric'
            })}
          </div>
        </div>

        <div class="post-detail-actions">
          <button class="detail-action-btn ${liked ? 'liked' : ''}" id="like-btn"
            data-liked="${liked ? '1' : '0'}" data-post-id="${postId}">
            <span id="like-icon">${liked ? '❤️' : '🤍'}</span>
            <span id="like-label">${liked ? 'Liked' : 'Like'}</span>
          </button>
          <button class="detail-action-btn" id="focus-comment-btn">
            💬 Comment
          </button>
          <button class="detail-action-btn" id="share-btn">
            🔗 Share
          </button>
        </div>
      </div>
    `;

    // Like button
    document.getElementById('like-btn')?.addEventListener('click', () => toggleLike(postId));

    // Focus comment
    document.getElementById('focus-comment-btn')?.addEventListener('click', () => {
      document.getElementById('comment-input')?.focus();
    });

    // Share
    document.getElementById('share-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(window.location.href)
        .then(() => showToast('Link copied to clipboard!', 'success'))
        .catch(() => showToast('Could not copy link', 'error'));
    });

    // Delete post
    document.getElementById('delete-post-btn')?.addEventListener('click', async () => {
      if (!confirm('Delete this post? This cannot be undone.')) return;
      try {
        await Posts.delete(postId);
        showToast('Post deleted', 'success');
        setTimeout(() => { window.location.href = '/feed.html'; }, 700);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">😕</div>
        <h3>Post not found</h3>
        <p>${err.message}</p>
        <a href="/feed.html" class="btn btn-primary" style="margin-top:20px">← Back to Feed</a>
      </div>
    `;
  }
}

// ─────────────────────────────────────────
//  Toggle Like
// ─────────────────────────────────────────
async function toggleLike(postId) {
  const btn = document.getElementById('like-btn');
  if (!btn) return;

  const isLiked = btn.dataset.liked === '1';
  const likeCountEl = document.getElementById('display-like-count');
  const likeIcon = document.getElementById('like-icon');
  const likeLabel = document.getElementById('like-label');

  btn.disabled = true;
  try {
    const data = isLiked ? await Likes.unlike(postId) : await Likes.like(postId);

    btn.dataset.liked = data.liked ? '1' : '0';
    btn.classList.toggle('liked', data.liked);
    if (likeIcon) likeIcon.textContent = data.liked ? '❤️' : '🤍';
    if (likeLabel) likeLabel.textContent = data.liked ? 'Liked' : 'Like';
    if (likeCountEl) likeCountEl.textContent = data.like_count;
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

// ─────────────────────────────────────────
//  Load Comments
// ─────────────────────────────────────────
async function loadComments(postId) {
  const container = document.getElementById('comments-container');
  const countEl   = document.getElementById('comments-count-badge');
  if (!container) return;

  container.innerHTML = `<div class="loading-overlay"><div class="spinner"></div></div>`;

  try {
    const data = await Comments.list(postId);
    const comments = data.comments || [];

    if (countEl) countEl.textContent = comments.length;
    const displayCount = document.getElementById('display-comment-count');
    if (displayCount) displayCount.textContent = comments.length;

    if (comments.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding:40px 20px">
          <div class="empty-icon">💬</div>
          <p>No comments yet. Be the first!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `<div class="comment-list" id="comment-list"></div>`;
    const listEl = document.getElementById('comment-list');

    comments.forEach(comment => {
      listEl.insertAdjacentHTML('beforeend', buildCommentHTML(comment));
      attachCommentListeners(comment.id, postId);
    });

  } catch (err) {
    container.innerHTML = `<p class="text-muted text-center" style="padding:20px">Failed to load comments.</p>`;
  }
}

// ─────────────────────────────────────────
//  Build Comment HTML
// ─────────────────────────────────────────
function buildCommentHTML(comment) {
  const isOwn = currentUser && currentUser.id === comment.user_id;
  return `
    <div class="comment-item" id="comment-${comment.id}">
      <a href="/profile.html?u=${escapeHtml(comment.username)}" style="text-decoration:none">
        ${avatarHTML({ username: comment.username, avatar_url: comment.avatar_url }, 'avatar-sm')}
      </a>
      <div class="comment-body">
        <div class="comment-header">
          <a class="comment-username" href="/profile.html?u=${escapeHtml(comment.username)}">@${escapeHtml(comment.username)}</a>
          <span class="comment-time">${timeAgo(comment.created_at)}</span>
          ${isOwn ? `<button class="comment-delete" data-id="${comment.id}">🗑️</button>` : ''}
        </div>
        <div class="comment-text">${escapeHtml(comment.content)}</div>
      </div>
    </div>
  `;
}

function attachCommentListeners(commentId, postId) {
  const deleteBtn = document.querySelector(`#comment-${commentId} .comment-delete`);
  deleteBtn?.addEventListener('click', async () => {
    try {
      await Comments.delete(commentId);
      document.getElementById(`comment-${commentId}`)?.remove();

      // Update counts
      const badge = document.getElementById('comments-count-badge');
      const display = document.getElementById('display-comment-count');
      [badge, display].forEach(el => {
        if (el) el.textContent = Math.max(0, (parseInt(el.textContent) || 0) - 1);
      });

      showToast('Comment deleted', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// ─────────────────────────────────────────
//  Comment Form
// ─────────────────────────────────────────
function initCommentForm(postId) {
  const form      = document.getElementById('comment-form');
  const input     = document.getElementById('comment-input');
  const submitBtn = document.getElementById('comment-submit-btn');

  // Show user avatar next to form
  const avatarEl = document.getElementById('comment-form-avatar');
  if (avatarEl && currentUser) {
    avatarEl.innerHTML = avatarHTML(currentUser, 'avatar-sm');
  }

  if (!form || !input) return;

  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
    if (submitBtn) submitBtn.disabled = input.value.trim().length === 0;
  });

  // Submit on Ctrl+Enter
  input.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      form.dispatchEvent(new Event('submit'));
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = input.value.trim();
    if (!content) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="btn-spinner"></span>`;

    try {
      const data = await Comments.add(postId, content);
      input.value = '';
      input.style.height = 'auto';
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Post';

      // Append to list
      let listEl = document.getElementById('comment-list');
      if (!listEl) {
        document.getElementById('comments-container').innerHTML =
          `<div class="comment-list" id="comment-list"></div>`;
        listEl = document.getElementById('comment-list');
      }

      listEl.insertAdjacentHTML('beforeend', buildCommentHTML(data.comment));
      attachCommentListeners(data.comment.id, postId);

      // Update counts
      const badge = document.getElementById('comments-count-badge');
      const display = document.getElementById('display-comment-count');
      [badge, display].forEach(el => {
        if (el) el.textContent = (parseInt(el.textContent) || 0) + 1;
      });

      showToast('Comment posted! 💬', 'success');
    } catch (err) {
      showToast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Post';
    }
  });
}
