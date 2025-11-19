# Kaviya Backend - API Server

This service exposes REST endpoints for authentication, quizzes, progress, rewards and parent dashboard.

## Quick start

1) Install dependencies
   npm install

2) Configure environment (see `.env.example`):
   - PORT=3000
   - JWT_SECRET=your-strong-secret
   - MONGODB_URI=mongodb://localhost:27017/kaviya
   - ALLOWED_ORIGINS=http://localhost:3000

3) Start
   npm run start
   # The server listens on 0.0.0.0:3000 by default (override with PORT)

## CORS

The server reads `ALLOWED_ORIGINS` (comma-separated) and will only allow those origins.
For local development with the React app:
- Frontend on http://localhost:3000
- Backend on http://localhost:3000 (default; set PORT if you prefer a different port)
Set:
  ALLOWED_ORIGINS=http://localhost:3000

Important:
- If you set `ALLOWED_ORIGINS=*`, credentials (cookies) are disabled as per CORS rules. Prefer listing explicit origins for local dev.
- Axios/fetch should target the same origin when using a CRA/Next proxy via baseURL `/api`.

## Auth Routes

- POST /api/signup
  Body: { username, password, role: "kid" | "parent" }
  Response: { token, user }

- POST /api/login
  Body: { username, password }
  Response: { token, user }

Compatibility: The server also accepts POST /signup and POST /login and routes them internally to `/api/*` to ease integration.

Temporary logging: Both routes emit minimal structured logs to stdout for troubleshooting and return consistent error shapes:
{
  "error": {
    "code": "AUTH_INVALID",
    "message": "Invalid credentials"
  }
}

## Health

- GET / returns "Backend is running."
- GET /api/health returns `{ "status": "ok" }` (always 200 for connectivity checks)
- GET /healthz returns a 500 JSON error if DB failed at startup (degraded mode).
- GET /_health returns a simple "OK" page to test browser access.

