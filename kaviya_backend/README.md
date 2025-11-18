# Kaviya Backend - API Server

This service exposes REST endpoints for authentication, quizzes, progress, rewards and parent dashboard.

## Quick start

1) Install dependencies
   npm install

2) Configure environment (see `.env.example`):
   - PORT=3001
   - JWT_SECRET=your-strong-secret
   - MONGODB_URI=mongodb://localhost:27017/kaviya
   - ALLOWED_ORIGINS=http://localhost:3000

3) Start
   npm run start

## CORS

The server reads `ALLOWED_ORIGINS` (comma-separated) and will only allow those origins.
For local development with the React app:
- Frontend on http://localhost:3000
- Backend on http://localhost:3001
Set:
  ALLOWED_ORIGINS=http://localhost:3000

Note: If you set `ALLOWED_ORIGINS=*`, credentials (cookies) are disabled as per CORS rules.

## Auth Routes

- POST /api/signup
  Body: { username, password, role: "kid" | "parent" }
  Response: { token, user }

- POST /api/login
  Body: { username, password }
  Response: { token, user }

Both routes emit minimal structured logs to stdout for temporary troubleshooting and return consistent error shapes:
{
  "error": {
    "code": "AUTH_INVALID",
    "message": "Invalid credentials"
  }
}

## Health

- GET / returns "Backend is running."
- GET /healthz returns a 500 JSON error if DB failed at startup (degraded mode).

