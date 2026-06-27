const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────
//  GET /api/comments/:postId  — All comments for a post
// ─────────────────────────────────────────
router.get('/:postId', (req, res) => {
  const comments = db.prepare(`
    SELECT 
      c.id, c.content, c.created_at,
      u.id as user_id, u.username, u.avatar_url
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `).all(req.params.postId);

  res.json({ comments });
});

// ─────────────────────────────────────────
//  POST /api/comments/:postId  — Add a comment
// ─────────────────────────────────────────
router.post('/:postId', authenticateToken, (req, res) => {
  const { content } = req.body;
  const postId = req.params.postId;

  if (!content || content.trim() === '') {
    return res.status(400).json({ error: 'Comment cannot be empty' });
  }

  if (content.length > 300) {
    return res.status(400).json({ error: 'Comment must be under 300 characters' });
  }

  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const result = db.prepare(
    'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)'
  ).run(postId, req.user.id, content.trim());

  const comment = db.prepare(`
    SELECT c.id, c.content, c.created_at,
           u.id as user_id, u.username, u.avatar_url
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ message: 'Comment added', comment });
});

// ─────────────────────────────────────────
//  DELETE /api/comments/:id  — Delete own comment
// ─────────────────────────────────────────
router.delete('/:id', authenticateToken, (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);

  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  if (comment.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized to delete this comment' });
  }

  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  res.json({ message: 'Comment deleted' });
});

module.exports = router;
