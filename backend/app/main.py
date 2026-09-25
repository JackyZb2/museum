from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from app.api.routes import router
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.entities import Artifact, Museum
@asynccontextmanager
async def lifespan(app: FastAPI):
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    with SessionLocal() as db:
        museum = db.scalar(select(Museum).limit(1))
        if not museum:
            museum = Museum(name="MuseumAI Demo Museum", description="A starter collection for MuseumAI Studio."); db.add(museum); db.flush()
            db.add_all([Artifact(museum_id=museum.id, name="Bronze Ritual Vessel", dynasty="Shang", category="Vessel", material="Bronze", inventory_number="BRV-001"), Artifact(museum_id=museum.id, name="Ceramic Bowl", dynasty="Song", category="Ceramics", material="Porcelain", inventory_number="CB-002")]); db.commit()
    yield
app = FastAPI(title="MuseumAI Studio API", version="0.1.0", lifespan=lifespan)
@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError): return JSONResponse(status_code=422, content={"success": False, "message": "Validation error", "details": exc.errors()})
@app.exception_handler(Exception)
async def server_error(request: Request, exc: Exception): return JSONResponse(status_code=500, content={"success": False, "message": "Internal server error"})
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_methods=["*"], allow_headers=["*"])
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")
app.include_router(router, prefix="/api")
