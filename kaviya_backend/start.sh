#!/usr/bin/env sh
# Ensure Node/Express starts for preview systems that invoke a shell script.
# Binds to PORT (defaults to 3000) and launches the server.
set -e

if [ -z "$PORT" ]; then
  export PORT=3000
fi

echo "Starting Kaviya Backend (Node/Express) on PORT=$PORT ..."
exec node src/server.js
