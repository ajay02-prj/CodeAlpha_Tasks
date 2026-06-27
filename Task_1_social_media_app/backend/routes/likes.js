const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────
//  POST /api/likes/:postId  — Like a post
// ─────────────────────────────────────────
router.post('/:postId', authenticateToken, (req, res) => {
  const postId = parseInt(req.params.postId);
  const userId = req.user.id;

  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  try {
    db.prepare(
      'INSERT INTO likes (post_id, user_id) VALUES (?, ?)'
    ).run(postId, userId);

    const count = db.prepare(
      'SELECT COUNT(*) as count FROM likes WHERE post_id = ?'
    ).get(postId).count;

    res.json({ message: 'Post liked', liked: true, like_count: count });
  } catch (err) {
    res.status(409).json({ error: 'Already liked this post' });
  }
});

// ─────────────────────────────────────────
//  DELETE /api/likes/:postId  — Unlike a post
// ─────────────────────────────────────────
router.delete('/:postId', authenticateToken, (req, res) => {
  const postId = parseInt(req.params.postId);
  const userId = req.user.id;

  db.prepare(
    'DELETE FROM likes WHERE post_id = ? AND user_id = ?'
  ).run(postId, userId);

  const count = db.prepare(
    'SELECT COUNT(*) as count FROM likes WHERE post_id = ?'
  ).get(postId).count;

  res.json({ message: 'Post unliked', liked: false, like_count: count });
});

// ─────────────────────────────────────────
//  GET /api/likes/:postId  — Get like info for a post
// ─────────────────────────────────────────
router.get('/:postId', authenticateToken, (req, res) => {
  const postId = parseInt(req.params.postId);
  const userId = req.user.id;

  const count = db.prepare(
    'SELECT COUNT(*) as count FROM likes WHERE post_id = ?'
  ).get(postId).count;

  const liked = db.prepare(
    'SELECT id FROM likes WHERE post_id = ? AND user_id = ?'
  ).get(postId, userId);

  res.json({ like_count: count, liked_by_me: !!liked });
});

module.exports = router;
