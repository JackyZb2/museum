from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from app.api.routes import router
from app.core.config import settings
from app.db.session import Base, SessionLocal, engine
from app.models.entities import Artifact, Museum
@asynccontextmanager
async def lifespan(app: FastAPI):
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    # Local SQLite mode is self-healing for a first-run demo. Docker/PostgreSQL
    # still uses the explicit Alembic migration in the container startup.
    if settings.database_url.startswith("sqlite"):
        Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        museum = db.scalar(select(Museum).limit(1))
        if not museum:
            museum = Museum(name="博物馆数字化示范馆", description="MuseumAI Studio 中文示范馆藏。"); db.add(museum); db.flush()
            db.add_all([Artifact(museum_id=museum.id, name="青铜礼器", dynasty="商代", category="礼器", material="青铜", inventory_number="BRV-001"), Artifact(museum_id=museum.id, name="宋代瓷碗", dynasty="宋代", category="陶瓷", material="瓷", inventory_number="CB-002")]); db.commit()
    yield
app = FastAPI(title="MuseumAI Studio API", version="0.1.0", lifespan=lifespan)
@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError): return JSONResponse(status_code=422, content={"success": False, "message": "提交内容校验失败", "details": exc.errors()})
@app.exception_handler(Exception)
async def server_error(request: Request, exc: Exception): return JSONResponse(status_code=500, content={"success": False, "message": "服务器内部错误"})
@app.exception_handler(SQLAlchemyError)
async def database_error(request: Request, exc: SQLAlchemyError):
    return JSONResponse(status_code=503, content={"success": False, "message": "数据库暂不可用，操作未完成。请保留已填写内容，检查本地服务后重试。"})
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_methods=["*"], allow_headers=["*"])
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")
app.include_router(router, prefix="/api")
