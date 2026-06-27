const db = require('./database');
const bcrypt = require('bcryptjs');

console.log('Seeding dummy data...');

try {
  // Clear existing data for a fresh start (optional, but good for reliable seeding)
  db.exec(`
    DELETE FROM comments;
    DELETE FROM likes;
    DELETE FROM followers;
    DELETE FROM posts;
    DELETE FROM users;
  `);

  const passwordHash = bcrypt.hashSync('password123', 10);

  // 1. Create Users
  const users = [
    { username: 'alice', email: 'alice@example.com', bio: 'Tech enthusiast and developer.', avatar_url: 'https://i.pravatar.cc/150?u=alice' },
    { username: 'bob', email: 'bob@example.com', bio: 'Photography lover. Coffee addict.', avatar_url: 'https://i.pravatar.cc/150?u=bob' },
    { username: 'charlie', email: 'charlie@example.com', bio: 'Just here for the memes.', avatar_url: 'https://i.pravatar.cc/150?u=charlie' },
    { username: 'diana', email: 'diana@example.com', bio: 'Travel blogger 🌍', avatar_url: 'https://i.pravatar.cc/150?u=diana' }
  ];

  const insertUser = db.prepare('INSERT INTO users (username, email, password_hash, bio, avatar_url) VALUES (?, ?, ?, ?, ?)');
  const userIds = {};
  
  for (const u of users) {
    const result = insertUser.run(u.username, u.email, passwordHash, u.bio, u.avatar_url);
    userIds[u.username] = result.lastInsertRowid;
  }
  console.log('✅ Created 4 dummy users');

  // 2. Create Posts
  const posts = [
    { user: 'alice', content: 'Just deployed my new social media app! 🚀', image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop' },
    { user: 'bob', content: 'Morning coffee hits different today ☕️', image_url: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=600&h=400&fit=crop' },
    { user: 'charlie', content: 'Why do programmers prefer dark mode? Because light attracts bugs! 🐛😂', image_url: '' },
    { user: 'diana', content: 'Missing the mountains today 🏔️', image_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=400&fit=crop' },
    { user: 'alice', content: 'Learning SQLite today, it is surprisingly fast and easy to use.', image_url: '' }
  ];

  const insertPost = db.prepare('INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)');
  const postIds = [];
  
  for (const p of posts) {
    const result = insertPost.run(userIds[p.user], p.content, p.image_url);
    postIds.push(result.lastInsertRowid);
  }
  console.log('✅ Created 5 dummy posts');

  // 3. Create Comments
  const insertComment = db.prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)');
  insertComment.run(postIds[0], userIds['bob'], 'Congrats Alice! Looks great.');
  insertComment.run(postIds[0], userIds['charlie'], 'Nice work! 🎉');
  insertComment.run(postIds[1], userIds['diana'], 'Coffee is life!');
  insertComment.run(postIds[2], userIds['alice'], 'Classic joke lol');
  console.log('✅ Created dummy comments');

  // 4. Create Likes
  const insertLike = db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)');
  insertLike.run(postIds[0], userIds['bob']);
  insertLike.run(postIds[0], userIds['charlie']);
  insertLike.run(postIds[0], userIds['diana']);
  insertLike.run(postIds[1], userIds['alice']);
  insertLike.run(postIds[2], userIds['bob']);
  insertLike.run(postIds[3], userIds['alice']);
  console.log('✅ Created dummy likes');

  // 5. Create Followers
  const insertFollower = db.prepare('INSERT INTO followers (follower_id, following_id) VALUES (?, ?)');
  insertFollower.run(userIds['bob'], userIds['alice']); // Bob follows Alice
  insertFollower.run(userIds['charlie'], userIds['alice']); // Charlie follows Alice
  insertFollower.run(userIds['diana'], userIds['alice']); // Diana follows Alice
  insertFollower.run(userIds['alice'], userIds['bob']); // Alice follows Bob
  insertFollower.run(userIds['alice'], userIds['diana']); // Alice follows Diana
  console.log('✅ Created dummy followers');

  console.log('🎉 Database seeding complete!');
  console.log('You can login with any of these usernames: alice, bob, charlie, diana');
  console.log('Password for all users: password123');

} catch (err) {
  console.error('Error seeding database:', err);
}
