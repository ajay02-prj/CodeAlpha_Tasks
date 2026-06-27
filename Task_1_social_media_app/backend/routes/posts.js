const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────
//  GET /api/posts  — All posts (feed)
// ─────────────────────────────────────────
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const currentUserId = req.query.userId || null;

  const posts = db.prepare(`
    SELECT 
      p.id, p.content, p.image_url, p.created_at,
      u.id as user_id, u.username, u.avatar_url,
      (SELECT COUNT(*) FROM likes    WHERE post_id = p.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
      ${currentUserId ? `, (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ${parseInt(currentUserId)}) as liked_by_me` : ', 0 as liked_by_me'}
    FROM posts p
    JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  res.json({ posts, page, limit });
});

// ─────────────────────────────────────────
//  GET /api/posts/feed  — Feed from followed users
// ─────────────────────────────────────────
router.get('/feed', authenticateToken, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const userId = req.user.id;

  const posts = db.prepare(`
    SELECT 
      p.id, p.content, p.image_url, p.created_at,
      u.id as user_id, u.username, u.avatar_url,
      (SELECT COUNT(*) FROM likes    WHERE post_id = p.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as liked_by_me
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.user_id IN (
      SELECT following_id FROM followers WHERE follower_id = ?
    ) OR p.user_id = ?
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, userId, userId, limit, offset);

  res.json({ posts, page, limit });
});

// ─────────────────────────────────────────
//  GET /api/posts/:id  — Single post
// ─────────────────────────────────────────
router.get('/:id', (req, res) => {
  const post = db.prepare(`
    SELECT 
      p.id, p.content, p.image_url, p.created_at,
      u.id as user_id, u.username, u.avatar_url, u.bio,
      (SELECT COUNT(*) FROM likes    WHERE post_id = p.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json({ post });
});

// ─────────────────────────────────────────
//  POST /api/posts  — Create a post
// ─────────────────────────────────────────
router.post('/', authenticateToken, (req, res) => {
  const { content, image_url } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({ error: 'Post content cannot be empty' });
  }

  if (content.length > 500) {
    return res.status(400).json({ error: 'Post content must be under 500 characters' });
  }

  const result = db.prepare(
    'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)'
  ).run(req.user.id, content.trim(), image_url || '');

  const post = db.prepare(`
    SELECT 
      p.id, p.content, p.image_url, p.created_at,
      u.id as user_id, u.username, u.avatar_url,
      0 as like_count, 0 as comment_count, 0 as liked_by_me
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ message: 'Post created', post });
});

// ─────────────────────────────────────────
//  DELETE /api/posts/:id  — Delete own post
// ─────────────────────────────────────────
router.delete('/:id', authenticateToken, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);

  if (!post) return res.status(404).json({ error: 'Post not found' });

  if (post.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized to delete this post' });
  }

  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ message: 'Post deleted' });
});

module.exports = router;
