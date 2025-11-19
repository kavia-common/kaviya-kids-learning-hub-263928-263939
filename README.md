# kaviya-kids-learning-hub-263928-263939

Backend quick start (Node/Express):
- cd kaviya_backend
- cp .env.example .env
- npm install
- npm run start
  # Starts Express on 0.0.0.0:3000 by default (set PORT if needed)

Preview runners:
- If the platform looks for a Procfile or shell script, use kaviya_backend/Procfile or kaviya_backend/start.sh
- Expected command: PORT=${PORT:-3000} node src/server.js

Ensure your MongoDB is reachable at the URI configured in `.env` (defaults to `mongodb://appuser:dbuser123@kaviya_database:5000/myapp?authSource=admin`). If developing locally without the service name, use `mongodb://appuser:dbuser123@localhost:5000/myapp?authSource=admin`.