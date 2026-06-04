# Codolio Frontend 🎨

This directory contains the user interface client for **Codolio** (formerly CodeTracker). The client is built as a responsive, interactive dashboard using pure HTML, CSS, and Vanilla JavaScript. It communicates with the backend Express API.

---

## 🛠️ Technical Stack

* **Structure:** Semantic HTML5 pages.
* **Styling:** Vanilla CSS3. The main styling sheet is [custom.css](file:///d:/Codolio%201st%20commit/frontend/assets/css/custom.css) which defines dynamic color palettes, layouts, interactive components, hover animations, and a dark glassmorphic design theme.
* **Interactivity:** Modern ES6+ JavaScript. Logic is decoupled from the markup using page-specific scripts.
* **API Integration:** Native Web standard `Fetch API` for non-blocking asynchronous request handling.
* **Routing:** `vercel.json` routing configuration rules enabling clean URL endpoints.

---

## 📂 Frontend Directory Structure

```directory
frontend/
├── assets/
│   ├── css/
│   │   └── custom.css       # Core design tokens, gradients, animations, and layouts
│   └── js/
│       ├── admin.js         # Controls user listing, metrics updates, and logs review inside admin dashboard
│       ├── api.js           # API request handler and modules (authAPI, userAPI, contestsAPI, etc.)
│       ├── auth.js          # Credentials validator, session token manager, and route guards
│       ├── contest-tracker.js # Fetches and filters upcoming contest lists
│       ├── dashboard.js     # Orchestrates individual metrics loading and user data rendering
│       └── profile.js       # Manages handle updates, settings, and profile details updates
├── admin.html               # Administrative interface page
├── auth-callback.html       # Landing route for completed Google OAuth redirection
├── contest-tracker.html     # Aggregated view of upcoming/recent programming contests
├── dashboard.html           # User metrics, graph data, and platform connection status dashboard
├── index.html               # Main landing / entry page of Codolio
├── login.html               # Email-password signup & login options
├── profile.html             # User settings configuration panel
└── vercel.json              # Vercel deployment configuration file (handles rewrites and security headers)
```

---

## ⚙️ Running Locally

Because the frontend is built using standard HTML5, CSS3, and JavaScript, it does not require a compilation/build step.

### Local Development Server
To run the project locally, serve the `frontend` folder using any static web server:

1. **VS Code Live Server (Recommended):**
   * Install the "Live Server" extension in VS Code.
   * Right-click `frontend/index.html` and choose **Open with Live Server**.
   * By default, this will run on `http://127.0.0.1:5500`. Ensure this origin is configured in the backend `.env` file under `FRONTEND_URL`.

2. **Node.js Static Server:**
   You can serve the directory using `serve` or any similar HTTP server package:
   ```bash
   npm install -g serve
   serve -p 5500
   ```
   Access the client application at `http://localhost:5500`.

---

## 🚀 Routing & Vercel Configuration

The project is preconfigured to support routing patterns on Vercel via [vercel.json](file:///d:/Codolio%201st%20commit/frontend/vercel.json).
This handles:
* **Clean URLs:** Access `/dashboard` instead of `/dashboard.html` in the browser URL bar.
* **Security Headers:** Enforces security policies like `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `X-XSS-Protection`.
