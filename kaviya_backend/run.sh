#!/usr/bin/env sh
# Compatibility wrapper for preview processes expecting run.sh
set -e

if [ -z "$PORT" ]; then
  export PORT=3000
fi

echo "Running server via run.sh on PORT=$PORT"
exec node src/server.js
