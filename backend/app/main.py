"""FastAPI Entry Point"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

# Import routers (will be added in W1-W2)
# from app.routers import auth, resume, ai, integrations

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events (startup/shutdown)"""
    # Startup
    print("Resume Maker API starting...")
    yield
    # Shutdown
    print("Resume Maker API shutting down...")

app = FastAPI(
    title="Resume Maker API",
    description="AI-powered resume generation and management system",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://resume-maker.takagi.bz",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "version": "0.1.0"}

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Resume Maker API",
        "version": "0.1.0",
        "docs": "/docs",
        "openapi": "/openapi.json",
    }

# TODO: Register routers
# app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
# app.include_router(resume.router, prefix="/resume", tags=["Resume"])
# app.include_router(ai.router, prefix="/ai", tags=["AI Generation"])
# app.include_router(integrations.router, prefix="/integrations", tags=["Integrations"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
