const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────
//  GET /api/users/:username  — Public profile
// ─────────────────────────────────────────
router.get('/:username', (req, res) => {
  const { username } = req.params;

  const user = db.prepare(
    'SELECT id, username, bio, avatar_url, created_at FROM users WHERE username = ?'
  ).get(username);

  if (!user) return res.status(404).json({ error: 'User not found' });

  const followerCount = db.prepare(
    'SELECT COUNT(*) as count FROM followers WHERE following_id = ?'
  ).get(user.id).count;

  const followingCount = db.prepare(
    'SELECT COUNT(*) as count FROM followers WHERE follower_id = ?'
  ).get(user.id).count;

  const postCount = db.prepare(
    'SELECT COUNT(*) as count FROM posts WHERE user_id = ?'
  ).get(user.id).count;

  res.json({ user: { ...user, followerCount, followingCount, postCount } });
});

// ─────────────────────────────────────────
//  GET /api/users/:username/posts  — User's posts
// ─────────────────────────────────────────
router.get('/:username/posts', (req, res) => {
  const { username } = req.params;
  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const posts = db.prepare(`
    SELECT 
      p.id, p.content, p.image_url, p.created_at,
      u.id as user_id, u.username, u.avatar_url,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
  `).all(user.id);

  res.json({ posts });
});

// ─────────────────────────────────────────
//  PUT /api/users/profile  — Update own profile
// ─────────────────────────────────────────
router.put('/profile/update', authenticateToken, (req, res) => {
  const { bio, avatar_url } = req.body;

  db.prepare(
    'UPDATE users SET bio = ?, avatar_url = ? WHERE id = ?'
  ).run(bio || '', avatar_url || '', req.user.id);

  const updated = db.prepare(
    'SELECT id, username, email, bio, avatar_url, created_at FROM users WHERE id = ?'
  ).get(req.user.id);

  res.json({ message: 'Profile updated', user: updated });
});

// ─────────────────────────────────────────
//  POST /api/users/:id/follow  — Follow a user
// ─────────────────────────────────────────
router.post('/:id/follow', authenticateToken, (req, res) => {
  const following_id = parseInt(req.params.id);
  const follower_id = req.user.id;

  if (follower_id === following_id) {
    return res.status(400).json({ error: "You can't follow yourself" });
  }

  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(following_id);
  if (!target) return res.status(404).json({ error: 'User not found' });

  try {
    db.prepare(
      'INSERT INTO followers (follower_id, following_id) VALUES (?, ?)'
    ).run(follower_id, following_id);

    res.json({ message: 'Followed successfully', following: true });
  } catch (err) {
    // UNIQUE constraint = already following
    res.status(409).json({ error: 'Already following this user' });
  }
});

// ─────────────────────────────────────────
//  DELETE /api/users/:id/follow  — Unfollow a user
// ─────────────────────────────────────────
router.delete('/:id/follow', authenticateToken, (req, res) => {
  const following_id = parseInt(req.params.id);
  const follower_id = req.user.id;

  db.prepare(
    'DELETE FROM followers WHERE follower_id = ? AND following_id = ?'
  ).run(follower_id, following_id);

  res.json({ message: 'Unfollowed successfully', following: false });
});

// ─────────────────────────────────────────
//  GET /api/users/:id/follow-status  — Check if following
// ─────────────────────────────────────────
router.get('/:id/follow-status', authenticateToken, (req, res) => {
  const following_id = parseInt(req.params.id);
  const follower_id = req.user.id;

  const record = db.prepare(
    'SELECT id FROM followers WHERE follower_id = ? AND following_id = ?'
  ).get(follower_id, following_id);

  res.json({ following: !!record });
});

// ─────────────────────────────────────────
//  GET /api/users/search/:query  — Search users
// ─────────────────────────────────────────
router.get('/search/:query', (req, res) => {
  const query = `%${req.params.query}%`;
  const users = db.prepare(
    'SELECT id, username, bio, avatar_url FROM users WHERE username LIKE ? LIMIT 20'
  ).all(query);
  res.json({ users });
});

module.exports = router;
