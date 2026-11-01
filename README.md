# 📅 AI Content Calendar Planner
> **Category:** Professional Productivity  
> **Course / Assignment:** Major Project  
> **Tech Stack:** React (Vite) + CSS | Node.js (Express) | Groq Cloud AI (`qwen/qwen3.8-27b`) | Persistent Local Storage

---

## 📌 Project Overview
The **AI Content Calendar Planner** is a full-stack web application designed to help social media managers, marketing teams, and content creators plan high-impact social media campaigns across multiple channels (Twitter/X, LinkedIn, Instagram).

Users define their campaign objective, target audience, selected platforms, duration, and tone. The system leverages high-speed **Groq Cloud AI (`qwen/qwen3.8-27b`)** with structured prompt engineering to generate a scheduled content calendar with platform-specific captions, visual asset recommendations, hashtags, and calls-to-action.

The application features:
1. **Interactive Content Calendar**: Monthly grid, Weekly timeline, and List views with platform-specific filtering and inspection modals.
2. **Automated Content Validation Engine**: Algorithmic quality audit verifying character limits, hashtag density, Call-To-Action (CTA) presence, publishing dates, and required fields.
3. **Persistent Local JSON Storage**: Automatically saves all generated campaigns and caption edits to `server/data/campaigns.json`, persisting data across browser refreshes and server restarts.
4. **Interactive Caption Editor**: Real-time caption editing with live validation scorecard updates and persistent synchronization.
5. **Unified Single-Port Deployment**: Express serves both the backend API and the compiled React frontend seamlessly on one port (default `5001`).

---

## 🏗️ Architecture & Modules

| Module | Implementation |
| :--- | :--- |
| **Frontend** | React 18, Vite, CSS Modules / Custom CSS, interactive views (Monthly, Weekly, List), Quick Demo Presets. |
| **Backend** | Express 4, RESTful API endpoints (`/api/health`, `/api/calendar/...`), static asset serving. |
| **AI Integration** | Groq Cloud API using `qwen/qwen3.8-27b` with dynamic token budgeting and JSON schema enforcement. |
| **Prompt Engineering** | 3 tested prompt versions (V1 Basic, V2 Multi-Platform, V3 Optimized Compact JSON schema). |
| **Validation Engine** | `validationService.js` enforcing character limits ($\le 280$ Twitter, $\le 3000$ LinkedIn, $\le 2200$ IG), hashtag density, required fields, and date sequencing. |
| **Persistent Storage** | Local JSON storage with file locking in `server/data/campaigns.json` via `storageService.js`. |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)
- A Groq API Key ([Get one for free at Groq Console](https://console.groq.com/keys))

---

### Step 1: Clone & Configure Backend

```bash
# Clone the repository
git clone https://github.com/mananjain20/AI-Content-Calendar-Planner.git
cd AI-Content-Calendar-Planner

# Install backend dependencies
cd server
npm install

# Configure environment variables
cp .env.example .env
```

Open `server/.env` and add your Groq API Key:
```env
PORT=5001
NODE_ENV=development
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=qwen/qwen3.8-27b
```

---

### Step 2: Build & Run Unified Application (Single Port)

You can run both frontend and backend together on port `5001`:

```bash
# Build frontend
cd ../client
npm install
npm run build

# Start the unified server
cd ../server
node server.js
```

Open your browser at **`http://localhost:5001`**.

---

### Alternative: Development Mode (Hot Reloading)

If you prefer running frontend and backend separately with live hot-reloading:

**Terminal 1 (Backend):**
```bash
cd server
npm start
# Runs on http://localhost:5001
```

**Terminal 2 (Frontend Dev Server):**
```bash
cd client
npm run dev
# Runs on http://localhost:5173
```

---

## 🧪 Testing & Verification

Run backend unit and validation test suites:

```bash
cd server
node test-unit.js            # Runs validation engine test suite (8/8 tests)
node test-prompt-versions.js # Runs prompt engineering comparison (V1 vs V2 vs V3)
```

---

## 🔒 Security Best Practices

- All API keys and secrets are strictly loaded through backend environment variables (`server/.env`).
- `.gitignore` prevents `.env`, `credentials.json`, `node_modules`, and local backups from ever being tracked or committed to version control.
- Never expose API credentials in client-side code or public repositories.

---

## 📄 License
MIT License. Created by Manan Jain.
