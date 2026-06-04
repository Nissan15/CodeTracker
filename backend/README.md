# Codolio Backend 🚀

This is the Node.js + Express + MongoDB backend service for the **Codolio** platform (formerly CodeTracker). It provides REST API endpoints for user authentication, dashboard analytics, profile scraping, contest schedule retrieval, automated attendance tracking, and administrative reports.

---

## 🛠️ Technical Stack

* **Runtime:** Node.js (v18+)
* **Framework:** Express.js (v4)
* **Database:** MongoDB (via Mongoose ODM)
* **Authentication:** JSON Web Tokens (JWT) & Passport.js (Google OAuth 2.0)
* **Web Scraping:** Cheerio & Axios (scrapes LeetCode, Codeforces, CodeChef, and AtCoder profile pages)
* **Task Scheduler:** node-cron (for automated profile syncs and contest attendance logs)

---

## 📂 Backend Structure

```directory
backend/
├── config/             # Database connectivity & Passport configurations
│   ├── db.js           # Mongoose MongoDB connection function
│   └── ...             # OAuth strategies configuration
├── controllers/        # Request handlers mapping API requests to database actions
│   ├── admin.controller.js     # Admin control panel queries & user moderation
│   ├── auth.controller.js      # Register, login, and Google OAuth flow
│   ├── contest.controller.js   # Upcoming contests & log fetching
│   ├── platform.controller.js  # Live statistics retrieval from competitive programming platforms
│   ├── question.controller.js  # Solved questions logging and search filters
│   └── user.controller.js      # Profile details updates & metrics aggregation
├── middleware/         # Custom Express middlewares
│   ├── auth.js         # JWT validation & user role permissions check
│   └── errorHandler.js # Centralized API error response handler
├── models/             # Mongoose Schemas (MongoDB collections)
│   ├── User.js         # User models, authentication credentials, and platform handles
│   ├── Question.js     # User's solved question history log
│   ├── Note.js         # Personal notes linked to questions/contests
│   ├── ContestSnapshot.js # Pre-contest stats snapshot for attendance auditing
│   └── ContestLog.js   # Final user attendance logs for specific coding contests
├── routes/             # API Router definitions split by logical domains
│   ├── admin.routes.js
│   ├── auth.routes.js
│   ├── contest.routes.js
│   ├── platform.routes.js
│   ├── question.routes.js
│   └── user.routes.js
├── utils/              # Support functions & platform-specific web scrapers
│   ├── contests.js     # Fetches upcoming contests from LeetCode, Codeforces, CodeChef, and AtCoder
│   ├── attendanceDetector.js # Automated snapshot comparisons to check contest participation
│   ├── leetcode.js     # GraphQL scraper for LeetCode user metrics
│   ├── codeforces.js   # Scraper for Codeforces profile info
│   ├── codechef.js     # Scraper for CodeChef profile info
│   └── atcoder.js      # Scraper for AtCoder profile info
├── cron.js             # node-cron scheduler executing background syncs
├── server.js           # App entry point (initializes Express, middleware, & port listener)
└── .env.example        # Reference environment configuration schema
```

---

## ⚙️ Setup & Run Locally

### 1. Install Dependencies
Make sure you are in the `backend` directory:
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and populate the values:
```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `PORT` | Local server port (default: `5000`) |
| `MONGODB_URI` | Connection URI for MongoDB Atlas or Local MongoDB instance |
| `JWT_SECRET` | Secret key used to sign JSON Web Tokens |
| `JWT_EXPIRE` | Lifetime duration of JWT tokens (e.g. `7d`) |
| `GOOGLE_CLIENT_ID` | OAuth Client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret from Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | Redirect URI for Google OAuth (`http://localhost:5000/api/auth/google/callback`) |
| `FRONTEND_URL` | URL of the frontend development server (`http://127.0.0.1:5500` or custom origin) |

### 3. Launch Development Server
Runs the Express application locally with automatic live reload on code changes (using `nodemon`):
```bash
npm run dev
```

---

## ⚡ Background Tasks & Scrapers

The backend runs two automated cron jobs (defined in [cron.js](file:///d:/Codolio%201st%20commit/backend/cron.js)) scheduled every **30 minutes**:
1. **Pre-Contest Snapshot:** Scans upcoming contest lists for all 4 platforms. If a contest is starting within the next 30 minutes, it records a snapshot of current user submission tallies.
2. **Post-Contest Attendance Audit:** For contests that concluded between 30 to 90 minutes ago, the scheduler scrapes the users' profiles again. If a user's total solved questions on that platform increased relative to the snapshot, they are marked as **Attended** in the contest audit log.

---

## 📡 API Endpoints Overview

| Method | Endpoint | Auth Required | Description |
|--------|----------|:-------------:|-------------|
| **GET** | `/health` | No | Health check, API online status confirmation |
| **POST** | `/api/auth/register` | No | Creates a new user profile with password hashing |
| **POST** | `/api/auth/login` | No | Local sign in, returns JWT session token |
| **GET** | `/api/auth/me` | Yes | Retrieves current user object from JWT |
| **GET** | `/api/auth/google` | No | Initiates Google OAuth authentication redirect |
| **GET** | `/api/auth/google/callback` | No | Completes Google OAuth login and issues JWT |
| **GET** | `/api/user/:username` | No | Retrieves public user profile statistics |
| **PUT** | `/api/user/profile` | Yes | Updates platform user handles or settings |
| **GET** | `/api/user/dashboard` | Yes | Aggregates all user-specific progress stats |
| **GET** | `/api/questions` | Yes | Fetch user solved questions (with filter/search support) |
| **POST** | `/api/questions` | Yes | Manually logs a solved question |
| **PUT** | `/api/questions/:id` | Yes | Updates custom question details or notes |
| **DELETE** | `/api/questions/:id` | Yes | Deletes a logged question |
| **GET** | `/api/platform/refresh-all` | Yes | Manually forces refresh of all connected platform stats |
| **GET** | `/api/contests` | No | Lists upcoming coding contests |
| **GET** | `/api/admin/overview` | Admin | Provides system metrics summary for administrators |
| **GET** | `/api/admin/users` | Admin | Lists registered users (with query filter parameters) |

---

## 🚀 Deploying to Production (Render)

1. Commit your codebase to a GitHub repository.
2. Create a new **Web Service** on [Render](https://render.com).
3. Connect your repository and select `backend` as the **Root Directory**.
4. Configure the build parameters:
   * **Build Command:** `npm install`
   * **Start Command:** `node server.js`
5. Head to the **Environment** settings and add all key-value configurations present in `.env`.
