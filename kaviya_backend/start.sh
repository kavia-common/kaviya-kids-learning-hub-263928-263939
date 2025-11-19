#!/usr/bin/env sh
# Ensure Node/Express starts for preview systems that invoke a shell script.
# Binds to PORT (defaults to 3000) and launches the server.
set -e

if [ -z "$PORT" ]; then
  export PORT=3000
fi

echo "Starting Kaviya Backend (Node/Express only) on PORT=$PORT ... (no uvicorn/venv)"
# Prefer npm start for environments that rely on lifecycle hooks, fallback to node
if command -v npm >/dev/null 2>&1; then
  exec env PORT="$PORT" npm start --silent
else
  exec node src/server.js
fi
