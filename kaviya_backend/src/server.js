import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import router from './routes/index.js';
import { connectDB, getMongoUri } from './config/db.js';
import { errorHandler, ApplicationError } from './utils/errors.js';
// Note: Startup is handled by PORT=3000 npm start or node src/server.js; no Python/uvicorn.

const app = express();

// Derive allowed origins from env (comma-separated). If not provided, default to localhost:3000
const rawOrigins = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';
const allowedOrigins = rawOrigins.split(',').map(s => s.trim()).filter(Boolean);

// CORS config: when using credentials, cannot use wildcard origin.
// We echo back origin only if it's in the allowed list. For dev safety, if "*" explicitly set, disable credentials.
const useWildcard = allowedOrigins.includes('*');
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (no origin) and allowed origins
    if (!origin || useWildcard || allowedOrigins.includes(origin)) {
      return callback(null, origin || true);
    }
    return callback(new Error('CORS not allowed for this origin'), false);
  },
  credentials: !useWildcard,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));

/**
 * Root health check.
 * PUBLIC_INTERFACE
 * GET /
 * Returns 200 with a simple message to indicate service readiness.
 */
app.get('/', (req, res) => {
  res.send('Backend is running.');
});

/**
 * Lightweight health endpoint for frontend pings.
 * PUBLIC_INTERFACE
 * GET /api/health
 * Returns 200 OK regardless of DB state.
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

/**
 * PUBLIC_INTERFACE
 * Readiness check with DB state (non-throwing).
 * GET /api/ready
 * Returns 200 with db: 'up' if mongoose connected, otherwise 503 with db: 'down'.
 */
app.get('/api/ready', (req, res) => {
  const state = mongoose?.connection?.readyState === 1 ? 'up' : 'down';
  const http = state === 'up' ? 200 : 503;
  res.status(http).json({ status: 'ok', db: state });
});

/**
 * Convenience health page for manual check from browser.
 * PUBLIC_INTERFACE
 * GET /_health
 * Returns plain text 'OK'.
 */
app.get('/_health', (req, res) => {
  res.status(200).send('OK');
});

/**
 * Temporary request logging middleware for /api/login to aid troubleshooting.
 * Masks sensitive fields and logs outcome without exposing secrets.
 */
function loginLogger(req, res, next) {
  if (req.method === 'POST' && (req.path === '/login' || req.path === '/api/login')) {
    const safeBody = {
      username: req.body?.username || null,
      password: req.body?.password ? '[REDACTED]' : null,
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
      level: 'INFO',
      route: req.originalUrl,
      method: req.method,
      body: safeBody,
      origin: req.headers.origin || null,
      ts: new Date().toISOString(),
    }));

    const start = Date.now();
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({
        level: 'INFO',
        route: req.originalUrl,
        method: req.method,
        status: res.statusCode,
        duration_ms: Date.now() - start,
        outcome: res.statusCode >= 200 && res.statusCode < 400 ? 'success' : 'error',
        ts: new Date().toISOString(),
      }));
      return originalJson(data);
    };
  }
  next();
}
app.use(loginLogger);

/**
 * Compatibility handlers to support both '/login' and '/api/login'.
 * PUBLIC_INTERFACE
 * POST /login
 * Delegates to /api/login to maintain a single implementation.
 */
app.post('/login', (req, res, next) => {
  req.url = '/login';
  return router.handle(req, res, next);
});

/**
 * Also provide /signup -> /api/signup compatibility.
 * PUBLIC_INTERFACE
 * POST /signup
 */
app.post('/signup', (req, res, next) => {
  req.url = '/signup';
  return router.handle(req, res, next);
});

/**
 * PUBLIC_INTERFACE
 * API routes are mounted under /api.
 * - /api/login and /api/signup are implemented in routes/index.js
 * - All errors are centralized via errorHandler with response shape:
 *   { "error": { "code": string, "message": string, "details"?: object } }
 */
app.use('/api', router);

// Centralized error handling: ensure JSON errors (avoid axios 'Network Error' when server responds)
app.use((err, req, res, next) => {
  if (!(err instanceof ApplicationError)) {
    return errorHandler(err, req, res, next);
  }
  return errorHandler(err, req, res, next);
});

// Start server after DB connection
const PORT = parseInt(process.env.PORT || '3000', 10); // Bind to 3000 by default for container compatibility
const MONGODB_URI = getMongoUri();

connectDB(MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start server due to DB error:', err?.message);
    // Do not exit hard in containerized env; keep process alive with basic server to expose health error
    app.get('/healthz', (req, res) =>
      res.status(500).json({ error: { code: 'DB_CONNECTION_FAILED', message: 'Database unavailable' } })
    );
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server started in degraded mode on port ${PORT}`);
    });
  });

export default app;
