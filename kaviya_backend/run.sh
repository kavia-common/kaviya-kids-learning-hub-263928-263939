#!/usr/bin/env sh
# Compatibility wrapper for preview processes expecting run.sh
set -e

if [ -z "$PORT" ]; then
  export PORT=3000
fi

echo "Running server via run.sh on PORT=$PORT (Node/Express). Ignoring any uvicorn/venv hooks."
# Prefer npm start when available to ensure consistent behavior with package.json
if command -v npm >/dev/null 2>&1; then
  exec env PORT="$PORT" npm start --silent
else
  exec node src/server.js
fi
