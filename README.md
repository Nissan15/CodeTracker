# Codolio (CodeTracker) 🚀

A comprehensive competitive programming contest tracking and analytics dashboard. Codolio aggregates stats from multiple programming platforms (**LeetCode**, **Codeforces**, **CodeChef**, and **AtCoder**), schedules background syncs, tracks active and upcoming contests, and manages user submission/question logging with a complete Admin panel.

---

## 📋 Table of Contents
1. [Project Overview](#-project-overview)
2. [Technical Stack](#%EF%B8%8F-technical-stack)
3. [Project Structure](#-project-structure)
4. [Getting Started & Installation](#%EF%B8%8F-getting-started--installation)
5. [Database Architecture](#-database-architecture)
6. [Scraping & Cron Jobs](#-scraping--cron-jobs)
7. [Deployment Guide](#%EF%B8%8F-deployment-guide)

---

## 🌟 Project Overview

Codolio is designed to bridge the gap between multiple coding platforms and a unified tracking hub.
* **Aggregated Profile Stats:** Scraping profile details, solved question counts, ratings, and active statuses across major competitive coding platforms.
* **Interactive Contest Tracker:** Real-time fetching of upcoming contests with scheduling alerts.
* **Attendance Detection:** Automatic cron-based snapshotting of user stats before contests and matching after completion to check if users participated.
* **Admin Dashboard:** Administrative controls to review users, inspect department rankings, delete/update profiles, and audit contest logs.
* **Secured Authentication:** Password-based login/signup, OAuth 2.0 via Google, and JWT-guarded API sessions.

---

## 🛠️ Technical Stack

### Backend
* **Runtime Environment:** [Node.js](https://nodejs.org/) (v18+)
* **Framework:** [Express.js](https://expressjs.com/) (REST APIs)
* **Database:** [MongoDB](https://www.mongodb.com/) (via [Mongoose ODM](https://mongoosejs.com/))
* **Authentication:** [Passport.js](http://www.passportjs.org/) (Google OAuth 2.0 integration) & [JSON Web Tokens (JWT)](https://jwt.io/)
* **Scheduling:** [node-cron](https://github.com/node-cron/node-cron) for automated background scrapers
* **Web Scraping:** [Cheerio](https://cheerio.js.org/) & [Axios](https://axios-http.com/)

### Frontend
* **Structure & UI:** Semantic HTML5 & Vanilla CSS3 (`custom.css` with a responsive fluid layout, dark/glassmorphic accents)
* **Logic:** Vanilla JavaScript (ES6+ Modules)
* **API Communication:** Browser `Fetch API` communicating with the backend Express server
* **Hosting Configuration:** `vercel.json` with route rewrites for clean URLs (e.g. `/dashboard` instead of `/dashboard.html`)

---

## 📂 Project Structure

```directory
.
├── backend/                  # Express REST API Server
│   ├── config/               # Database connection configurations
│   ├── controllers/          # Request handlers mapping API routes to business logic
│   ├── middleware/           # JWT verification, CORS settings, and global error handlers
│   ├── models/               # Mongoose schemas for MongoDB
│   ├── routes/               # Express routing tables split by feature
│   ├── utils/                # Web scraping and contest metadata fetching scrapers
│   ├── cron.js               # Scheduled jobs for pre/post contest attendance detection
│   └── server.js             # Express application entry point
│
└── frontend/                 # Client Interface (Static SPA-like site)
    ├── assets/
    │   ├── css/              # Core stylesheets (e.g. custom.css)
    │   └── js/               # API clients, authentication guards, and page-specific scripts
    ├── vercel.json           # Vercel deployment and routing rules
    ├── index.html            # Public landing page
    ├── login.html            # Authentication interface (Login / Registration)
    ├── auth-callback.html    # Handlers for finishing Google OAuth loop
    ├── dashboard.html        # Main analytics dashboard & profile metrics
    ├── profile.html          # Individual user settings and platform handles
    ├── contest-tracker.html  # Contest calendar and live registration status
    └── admin.html            # Admin control dashboard
```

### Detailed Component Summary

#### Backend Components
* **`backend/server.js`**: Initialises environment variables, sets up CORS rules for localhost & production URLs, handles database connection callbacks, hooks up cron schedules, and starts the listener.
* **`backend/controllers/`**:
  * `auth.controller.js`: User signup, login, Google OAuth callbacks, and token signing.
  * `platform.controller.js`: Scrapes and caches data from LeetCode, CodeChef, Codeforces, and AtCoder profile pages.
  * `user.controller.js`: Fetches private and public profiles, dashboard statistics, and updates details.
  * `admin.controller.js`: Access control commands to look at comparative metrics, view raw contest logs, and purge users.
* **`backend/utils/`**:
  * `leetcode.js`, `codeforces.js`, `codechef.js`, `atcoder.js`: Customized scrapers retrieving ratings, solved count, and submissions.
  * `attendanceDetector.js`: Runs snapshot logs before and after contests to determine participant statistics.

#### Frontend Components
* **`frontend/assets/js/api.js`**: Core HTTP client module using `fetch` with automatic header injection of authorization tokens. Exports modules: `authAPI`, `userAPI`, `platformAPI`, `contestsAPI`, and `adminAPI`.
* **`frontend/assets/js/auth.js`**: Manages localStorage JWT storage, login state verification, redirects, and roles.

---

## ⚙️ Getting Started & Installation

### Prerequisites
* **Node.js** (v18.0.0 or higher recommended)
* **MongoDB Atlas** database account or a local MongoDB installation

### 1. Clone & Set Up Backend

1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your `.env` configuration file from the example:
   ```bash
   cp .env.example .env
   ```
4. Edit `.env` and fill in the values:
   ```env
   PORT=5000
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/codetracker
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRE=7d
   GOOGLE_CLIENT_ID=your_google_oauth_client_id
   GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
   FRONTEND_URL=http://127.0.0.1:5500 # URL of your frontend dev server
   NODE_ENV=development
   ```
5. Start the backend developer server:
   ```bash
   npm run dev
   ```

### 2. Set Up Frontend

1. Navigate to the `frontend` folder:
   ```bash
   cd ../frontend
   ```
2. You can serve this static directory using any local web server. For instance, using VS Code's **Live Server** extension or Node's `serve` package:
   ```bash
   # Using Live Server, ensure it runs on the port specified in your backend's FRONTEND_URL (e.g. http://127.0.0.1:5500)
   # Or install global static server tool:
   npm install -g serve
   serve -p 5500
   ```
3. Open `http://localhost:5500` (or `http://127.0.0.1:5500`) in your browser.

---

## 🗄️ Database Architecture

We use MongoDB as the persistence layer with the following models (Mongoose schemas):

* **User (`User.js`):** Stores user credentials, roles (`user`/`admin`), and competitive programming handle configurations (LeetCode username, Codeforces handle, AtCoder ID, etc.).
* **Question (`Question.js`):** Track solved questions manually or automatically, recording tags, difficulty, and submission dates.
* **Note (`Note.js`):** Personal study logs/notes associated with contests or platform questions.
* **ContestSnapshot (`ContestSnapshot.js`):** Stores snapshots of user progress metrics prior to the start of a contest to calculate post-contest solving deltas.
* **ContestLog (`ContestLog.js`):** Final audited details showing whether a user attended/solved problems during specific contest window frames.

---

## 🤖 Scraping & Cron Jobs

The system tracks coding platforms dynamically:
1. **Pre-Contest Snapshots:** A cron job runs every 30 minutes, looking for contests starting soon, and stores the user state (`solved` count) for active users.
2. **Post-Contest Processing:** Every 30 minutes, another job searches for recently completed contests, updates platform statistics, compares current stats to the snapshot, and marks the user as **Attended** if the solved count increased.

---

## 🚀 Deployment Guide

### Backend (Render / Heroku)
1. Set up a Web Service on Render and point to your GitHub repo.
2. Specify the **Root Directory** as `backend`.
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. Configure Environment Variables in the Render settings panel matching `.env`.

### Frontend (Vercel)
1. Add a new project on Vercel and import your repository.
2. Select the `frontend` folder as the Root Directory.
3. Vercel will automatically read `vercel.json` to handle page routing correctly. No build command is necessary (Static HTML/JS deployment).
