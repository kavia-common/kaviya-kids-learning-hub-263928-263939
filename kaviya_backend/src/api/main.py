# Note: This FastAPI app is a stub used only for generating OpenAPI if needed.
# The production/preview server for kaviya_backend is Node/Express (src/server.js).
# No preview/start hook should point to uvicorn or this file.
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"message": "Healthy"}
