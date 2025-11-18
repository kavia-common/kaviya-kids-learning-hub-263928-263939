import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import router from './routes/index.js';
import { connectDB, getMongoUri } from './config/db.js';
import { errorHandler } from './utils/errors.js';

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

// API routes
app.use('/api', router);

// Centralized error handling
app.use(errorHandler);

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
