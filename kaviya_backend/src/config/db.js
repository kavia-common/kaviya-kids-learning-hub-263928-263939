import mongoose from 'mongoose';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

/**
 * Resolve MongoDB URI using environment variable with sensible defaults.
 * Priority:
 * 1) process.env.MONGODB_URI
 * 2) mongodb://appuser:dbuser123@kaviya_database:5000/myapp?authSource=admin
 * 3) mongodb://appuser:dbuser123@localhost:5000/myapp?authSource=admin
 */
// PUBLIC_INTERFACE
export function getMongoUri() {
  const envUri = process.env.MONGODB_URI;
  if (envUri && envUri.trim().length > 0) return envUri.trim();
  const serviceUri = 'mongodb://appuser:dbuser123@kaviya_database:5000/myapp?authSource=admin';
  const localUri = 'mongodb://appuser:dbuser123@localhost:5000/myapp?authSource=admin';
  // Prefer service name (in docker-compose/k8s), else localhost
  return process.env.KAVIYA_DB_HOST?.includes('localhost') ? localUri : serviceUri;
}

/**
 * Connect to MongoDB with retry logic.
 * PUBLIC_INTERFACE
 * @param {string} mongoUri - Full MongoDB connection string.
 */
export async function connectDB(mongoUri) {
  let attempt = 0;
  mongoose.set('strictQuery', true);

  while (attempt < MAX_RETRIES) {
    try {
      await mongoose.connect(mongoUri, {
        // Mongoose modern defaults; no legacy options needed.
      });
      // eslint-disable-next-line no-console
      console.log('MongoDB connected');
      return;
    } catch (err) {
      attempt += 1;
      // eslint-disable-next-line no-console
      console.error(`MongoDB connection attempt ${attempt} failed: ${err?.message}`);
      if (attempt >= MAX_RETRIES) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

/**
 * Gracefully close Mongo connection.
 * PUBLIC_INTERFACE
 */
export async function disconnectDB() {
  await mongoose.connection.close();
}
