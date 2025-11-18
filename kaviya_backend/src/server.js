import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import router from './routes/index.js';
import { connectDB, getMongoUri } from './config/db.js';
import { errorHandler, ApplicationError } from './utils/errors.js';

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
 * Returns 200 with { message: 'Healthy' } to indicate service readiness.
 */
app.get('/', (req, res) => {
  // Return a simple string as requested by task
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
 * Convenience health page for manual check from browser.
 * PUBLIC_INTERFACE
 * GET /_health
 * Returns plain text 'OK' and echoes CORS origin allowance.
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
 * Compatibility handlers to support both '/login' and '/api/login' as requested.
 * PUBLIC_INTERFACE
 * POST /login
 * Delegates to /api/login to maintain a single implementation.
 */
app.post('/login', (req, res, next) => {
  // If router under /api provides /login, we call next() to let it 404 here,
  // but better to forward by rewriting url then hand off to router.
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
  // Normalize any non-ApplicationError to ApplicationError shape
  if (!(err instanceof ApplicationError)) {
    return errorHandler(err, req, res, next);
  }
  return errorHandler(err, req, res, next);
});

// Start server after DB connection
const PORT = parseInt(process.env.PORT || '3001', 10);
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
    app.get('/healthz', (req, res) => res.status(500).json({ error: { code: 'DB_CONNECTION_FAILED', message: 'Database unavailable' } }));
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server started in degraded mode on port ${PORT}`);
    });
  });

export default app;
