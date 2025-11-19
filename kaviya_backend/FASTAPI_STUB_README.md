This directory contains a minimal FastAPI stub under src/api solely to generate OpenAPI if needed.

Important:
- Preview/start should NEVER invoke uvicorn or Python venv for kaviya_backend.
- The production/preview server is Node/Express at src/server.js.
- Use: PORT=3000 npm start (see Procfile, start.sh, run.sh).
- Health endpoint for checks: GET /api/health -> { "status": "ok" }.
