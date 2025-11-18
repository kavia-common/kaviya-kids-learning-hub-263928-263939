import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import router from './routes/index.js';
import { connectDB, getMongoUri } from './config/db.js';
import { errorHandler } from './utils/errors.js';

const app = express();

// CORS - allow all in dev. For production, restrict origins via env.
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));

/**
 * Root health check.
 * PUBLIC_INTERFACE
 * GET /
 * Returns 200 with { message: 'Healthy' } to indicate service readiness.
 */
app.get('/', (req, res) => {
  res.json({ message: 'Healthy' });
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
