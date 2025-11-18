import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import router from './routes/index.js';
import { connectDB } from './config/db.js';
import { errorHandler } from './utils/errors.js';

const app = express();

// CORS - allow all in dev. For production, restrict origins via env.
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Health check
// PUBLIC_INTERFACE
app.get('/', (req, res) => {
  res.json({ message: 'Healthy' });
});

// API routes
app.use('/api', router);

// Centralized error handling
app.use(errorHandler);

// Start server after DB connection
const PORT = parseInt(process.env.PORT || '3001', 10);
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  // eslint-disable-next-line no-console
  console.error('Missing MONGODB_URI env var');
  process.exit(1);
}

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
    process.exit(1);
  });

export default app;
