from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import uvicorn

from app.config import settings
from app.exception_handlers import register_exception_handlers
from app.routers import analyzer

current_dir = os.path.dirname(os.path.abspath(__file__))
frontend_dist_dir = os.path.join(os.path.dirname(current_dir), "frontend", "dist")

app = FastAPI(
    title="GitHub Analyzer API",
    description="A FastAPI backend environment to analyze public GitHub repositories.",
    version="1.0.0",
    debug=settings.DEBUG
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register custom exception handling rules
register_exception_handlers(app)

# Include API router first
app.include_router(analyzer.router)

# Mount frontend compiled static files if they exist (production / docker container deployment)
if os.path.exists(frontend_dist_dir):
    assets_dir = os.path.join(frontend_dist_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
        
    @app.get("/{catchall:path}")
    async def serve_react(catchall: str):
        if catchall.startswith("api/"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="API route not found")
        
        index_path = os.path.join(frontend_dist_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"message": "Frontend build index.html not found"}

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
