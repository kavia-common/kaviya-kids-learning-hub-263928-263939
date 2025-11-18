import mongoose from 'mongoose';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

/**
 * Connect to MongoDB with retry logic.
 */
export async function connectDB(mongoUri) {
  let attempt = 0;
  mongoose.set('strictQuery', true);

  while (attempt < MAX_RETRIES) {
    try {
      await mongoose.connect(mongoUri, {
        // Mongoose 8 defaults are fine; keep options minimal and modern.
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
 */
export async function disconnectDB() {
  await mongoose.connection.close();
}
