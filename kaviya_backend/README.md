# Kaviya Backend (Node.js + Express)

Node.js + Express backend for Kaviya Kids Learn with MongoDB, JWT authentication, quizzes, gamified XP/levels, and rewards.

## Setup

1. Copy environment example and edit values:
```
cp .env.example .env
```

2. Install dependencies (requires Node 18+):
```
npm install
```

3. Seed sample quizzes (ensure MongoDB is running and MONGODB_URI is set):
```
npm run seed
```

4. Start the server:
```
npm run start
```
Or with hot reload (dev only):
```
npm run dev
```

Note: The start script runs a prestart step to install dependencies automatically in containerized/CI environments.

The server starts on `PORT` (default 3001). Health checks:
- GET `/` -> { "message": "Healthy" } (also satisfies "Backend is running." root check if you prefer consuming a string)
- GET `/healthz` -> returns 500 with DB error when DB connection failed (degraded mode)

## Environment Variables

- `PORT` - HTTP port (default 3001)
- `JWT_SECRET` - Secret for signing JWT tokens
- `MONGODB_URI` - MongoDB connection string
  - For local development as requested, use: `mongodb://localhost:27017/kaviyaLMS` (already in `.env.example`)
- Optional `KAVIYA_DB_HOST` hint used by `getMongoUri()` to prefer localhost vs service name.
- Optional `ALLOWED_ORIGINS` CORS allowlist (comma-separated), defaults to `http://localhost:3000`

Tip: Always run `npm install` after pulling changes to ensure dependencies are installed before starting the server (prestart will also help in CI).

## REST API

Base path for APIs: `/api`

All responses use a consistent shape:
```
{ "error": { "code": string, "message": string } } // For errors
```

### Auth

- POST `/api/signup`
  - Body: `{ "username": string, "password": string, "role": "kid"|"parent" }`
  - Response: `{ "token": string, "user": { "id", "username", "role", "xp", "level", "badges" } }`

- POST `/api/login`
  - Body: `{ "username": string, "password": string }`
  - Response: `{ "token": string, "user": { "id", "username", "role", "xp", "level", "badges" } }`

JWT tokens should be sent via `Authorization: Bearer <token>` for protected routes.

### Quizzes

- GET `/api/quiz/:subject`
  - Query: `revealAnswers=true` to include `answerIndex`
  - Response: `{ "quiz": { "id", "subject", "questions": [{ "question", "options", ("answerIndex")? }] } }`
  - Public route (no auth required).

- POST `/api/submit-quiz` (kid only)
  - Body: `{ "userId": string, "quizId": string, "answers": number[] }`
  - Response:
    ```
    {
      "correct": number,
      "total": number,
      "xpAwarded": number,
      "newLevel": number,
      "newBadges": string[],
      "rewards": { "petStage": number, "stickers": string[], "spinAvailable": boolean }
    }
    ```

XP: +10 per correct answer. Level increases every 100 XP (Level N Achiever badge). Rewards: pet stage increases every 2 levels; new sticker each level-up; spin available on level-up or if score >= 80%.

### Dashboard

- GET `/api/dashboard/:id` (kid or parent)
  - Response: `{ "xp": number, "level": number, "badges": string[] }`
  - Auth:
    - Kids can fetch only their own id.
    - Parents can fetch for linked children (see `User.children`).

### Parent

- GET `/api/parent/:id` (parent only)
  - Child aggregated stats:
    ```
    {
      "totalQuizzes": number,
      "averageScore": number, // percentage across all attempts
      "lastAttempts": [
        { "score": number, "total": number, "percentage": number, "timestamp": string, "quizId": string }
      ]
    }
    ```

### Rewards

- GET `/api/rewards/:id` (kid or parent)
  - Response: `{ "petStage": number, "stickers": string[], "spinAvailable": boolean }`
  - Same access rules as dashboard.

## Data Models (Mongoose)

- User: `username`, `passwordHash`, `role`, `xp`, `level`, `avatar`, `badges[]`, `children[]`
- Quiz: `subject`, `questions[]` with `question`, `options[]`, `answerIndex`
- Progress: `userId`, `quizId`, `score`, `total`, `percentage`, `timestamp`
- Reward: `userId`, `petStage`, `stickers[]`, `spinAvailable`

## Notes

- Centralized error handler standardizes error responses.
- TODO: Add rate limiting to auth routes.
- Avoid logging sensitive information.
- For local development per request, ensure MongoDB is running on `mongodb://localhost:27017/kaviyaLMS`.
