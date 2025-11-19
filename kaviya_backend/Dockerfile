# Use official Node.js 18 LTS runtime
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (leverage Docker layer caching)
COPY package.json package-lock.json* ./
RUN npm install --production --no-audit --no-fund

# Copy source code
COPY src ./src
COPY scripts ./scripts

# Expose app port
EXPOSE 3000

# Environment defaults (can be overridden at runtime)
ENV PORT=3000
# Note: MONGODB_URI, JWT_SECRET, ALLOWED_ORIGINS must be provided via env/secret manager in deployment

# Healthcheck hitting lightweight endpoint that is always 200
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

# Start the Node/Express server
CMD ["node", "src/server.js"]
