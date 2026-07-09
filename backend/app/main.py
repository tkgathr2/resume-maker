"""FastAPI Entry Point"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.routers import admin, ai, auth, resume, generate

logger = logging.getLogger(__name__)

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
        "https://rirekisyo.takagi.bz",
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


# Generic exception handler: return a uniform 500 without leaking internals.
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s: %s", request.method, request.url, exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# Register routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(resume.router, prefix="/resumes", tags=["Resume"])
app.include_router(ai.router, prefix="/ai", tags=["AI Review"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(generate.router, prefix="/api/resume", tags=["Resume Generation"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
