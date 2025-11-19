#!/usr/bin/env sh
# Root-level convenience starter for preview systems that invoke a default start.sh
# Delegates to kaviya_backend Node/Express server. No Python venv/uvicorn here.
set -e

cd "$(dirname "$0")/kaviya_backend"

if [ -z "$PORT" ]; then
  export PORT=3000
fi

echo "Root start.sh delegating to kaviya_backend on PORT=$PORT ..."
if command -v npm >/dev/null 2>&1; then
  exec env PORT="$PORT" npm start --silent
else
  exec node src/server.js
fi
