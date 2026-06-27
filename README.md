# Nexus — Mini Social Media App

A full-stack mini social media platform with user profiles, posts, comments, likes and a follow system.

## 🗂️ Project Structure

```
Task 3/
├── backend/
│   ├── server.js              # Express.js entry point
│   ├── database.js            # SQLite schema & initialization
│   ├── routes/
│   │   ├── auth.js            # Register / Login / Me
│   │   ├── users.js           # Profile, Follow/Unfollow, Search
│   │   ├── posts.js           # CRUD posts + personalized feed
│   │   ├── comments.js        # Add / Delete comments
│   │   └── likes.js           # Like / Unlike posts
│   └── middleware/
│       └── auth.js            # JWT authentication guard
├── frontend/
│   ├── index.html             # Login page
│   ├── register.html          # Registration page
│   ├── feed.html              # Home feed
│   ├── profile.html           # User profile page
│   ├── post.html              # Post detail + comments
│   ├── css/
│   │   ├── main.css           # Global design system
│   │   ├── auth.css           # Login/Register styles
│   │   ├── feed.css           # Feed page styles
│   │   ├── profile.css        # Profile page styles
│   │   └── post.css           # Post detail styles
│   └── js/
│       ├── api.js             # API helpers, auth tokens, utilities
│       ├── auth.js            # Login/Register page logic
│       ├── feed.js            # Feed page logic
│       ├── profile.js         # Profile page logic
│       └── post.js            # Post detail logic
├── social_media.db            # SQLite database (auto-created on first run)
├── package.json
└── README.md
```

## 🗄️ Database Schema

### `users`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| username | TEXT UNIQUE | Required |
| email | TEXT UNIQUE | Required |
| password_hash | TEXT | bcrypt hash |
| bio | TEXT | Optional |
| avatar_url | TEXT | Optional |
| created_at | DATETIME | Auto |

### `posts`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| user_id | INTEGER FK | → users |
| content | TEXT | Required, max 500 chars |
| image_url | TEXT | Optional |
| created_at | DATETIME | Auto |

### `comments`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| post_id | INTEGER FK | → posts (CASCADE DELETE) |
| user_id | INTEGER FK | → users |
| content | TEXT | Required, max 300 chars |
| created_at | DATETIME | Auto |

### `likes`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| post_id | INTEGER FK | → posts |
| user_id | INTEGER FK | → users |
| — | UNIQUE(post_id, user_id) | Prevents duplicate likes |

### `followers`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| follower_id | INTEGER FK | → users |
| following_id | INTEGER FK | → users |
| created_at | DATETIME | Auto |
| — | UNIQUE(follower_id, following_id) | Prevents duplicate follows |

## ⚡ Quick Start

### 1. Install Dependencies
```bash
cd "Task 3"
npm install
```

### 2. Start the Server
```bash
npm start
# or for auto-reload during development:
npm run dev
```

### 3. Open the App
Visit [http://localhost:5000](http://localhost:5000) in your browser.

## 🚀 Features

| Feature | Details |
|---|---|
| **Auth** | JWT-based login/register with bcrypt password hashing |
| **Feed** | Explore all posts OR personalized following-only feed |
| **Profiles** | Avatar, bio, post/follower/following counts with animated counters |
| **Posts** | Create posts (up to 500 chars), delete own posts |
| **Comments** | Add and delete comments on any post |
| **Likes** | Like/unlike posts with live counter updates |
| **Follow System** | Follow/unfollow users, follow status check |
| **Search** | Live user search with debounce |
| **Infinite Scroll** | Auto-loads more posts as you scroll |

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Sign in |
| GET | `/api/auth/me` | Yes | Get current user |

### Posts
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/posts` | No | All posts |
| GET | `/api/posts/feed` | Yes | Posts from followed users |
| GET | `/api/posts/:id` | No | Single post |
| POST | `/api/posts` | Yes | Create post |
| DELETE | `/api/posts/:id` | Yes | Delete own post |

### Comments
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/comments/:postId` | No | List comments |
| POST | `/api/comments/:postId` | Yes | Add comment |
| DELETE | `/api/comments/:id` | Yes | Delete own comment |

### Likes
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/likes/:postId` | Yes | Like a post |
| DELETE | `/api/likes/:postId` | Yes | Unlike a post |
| GET | `/api/likes/:postId` | Yes | Like status |

### Users
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/users/:username` | No | Get profile |
| GET | `/api/users/:username/posts` | No | User's posts |
| PUT | `/api/users/profile/update` | Yes | Update own profile |
| POST | `/api/users/:id/follow` | Yes | Follow user |
| DELETE | `/api/users/:id/follow` | Yes | Unfollow user |
| GET | `/api/users/:id/follow-status` | Yes | Check follow |
| GET | `/api/users/search/:query` | No | Search users |

## 🛠️ Tech Stack
- **Backend**: Express.js (Node.js)
- **Database**: SQLite via `better-sqlite3`
- **Auth**: JWT + bcryptjs
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Design**: Dark glassmorphism UI with Inter font
