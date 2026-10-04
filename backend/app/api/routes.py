from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import or_, select
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import Artifact, Asset, Document, Museum
from app.schemas.entities import *
from app.services.storage import DOCUMENT_EXTENSIONS, IMAGE_EXTENSIONS, save_upload
from pathlib import Path
from app.services.operations import is_uploading, upload_operation
router = APIRouter()
def ok(data): return {"success": True, "data": data}
@router.get("/museums")
def list_museums(db: Session = Depends(get_db)): return ok([MuseumOut.model_validate(x) for x in db.scalars(select(Museum)).all()])
@router.post("/museums", status_code=201)
def create_museum(payload: MuseumCreate, db: Session = Depends(get_db)):
    item = Museum(**payload.model_dump()); db.add(item); db.commit(); db.refresh(item); return ok(MuseumOut.model_validate(item))
@router.get("/museums/{museum_id}")
def get_museum(museum_id: int, db: Session = Depends(get_db)):
    item = db.get(Museum, museum_id)
    if not item: raise HTTPException(404, "未找到博物馆")
    return ok(MuseumOut.model_validate(item))
@router.get("/artifacts")
def list_artifacts(museum_id: int | None = None, search: str | None = Query(None), db: Session = Depends(get_db)):
    stmt = select(Artifact).order_by(Artifact.created_at.desc())
    if museum_id: stmt = stmt.where(Artifact.museum_id == museum_id)
    if search: stmt = stmt.where(or_(Artifact.name.ilike(f"%{search}%"), Artifact.inventory_number.ilike(f"%{search}%")))
    return ok([ArtifactOut.model_validate(x) for x in db.scalars(stmt).all()])
@router.post("/artifacts", status_code=201)
def create_artifact(payload: ArtifactCreate, db: Session = Depends(get_db)):
    if not db.get(Museum, payload.museum_id): raise HTTPException(404, "未找到博物馆")
    item = Artifact(**payload.model_dump()); db.add(item); db.commit(); db.refresh(item); return ok(ArtifactOut.model_validate(item))
@router.get("/artifacts/{artifact_id}")
def get_artifact(artifact_id: int, db: Session = Depends(get_db)):
    item = db.get(Artifact, artifact_id)
    if not item: raise HTTPException(404, "未找到文物")
    return ok(ArtifactDetail.model_validate(item))
@router.put("/artifacts/{artifact_id}")
def update_artifact(artifact_id: int, payload: ArtifactCreate, db: Session = Depends(get_db)):
    item = db.get(Artifact, artifact_id)
    if not item: raise HTTPException(404, "未找到文物")
    for key, value in payload.model_dump(exclude={"museum_id"}).items(): setattr(item, key, value)
    db.commit(); db.refresh(item); return ok(ArtifactOut.model_validate(item))
@router.delete("/artifacts/{artifact_id}")
def delete_artifact(artifact_id: int, db: Session = Depends(get_db)):
    item = db.get(Artifact, artifact_id)
    if not item: raise HTTPException(404, "未找到文物")
    if is_uploading(artifact_id) or item.assets or item.documents:
        raise HTTPException(409, "文物仍关联数字资产或来源资料，不能直接删除。请先核对并处理关联记录。")
    db.delete(item); db.commit() # TODO: delete object-storage files in a future storage service.
    return ok({"deleted": True})
async def upload_file(artifact_id: int, file: UploadFile, db: Session, allowed: set[str], kind: str):
    with upload_operation(artifact_id):
        return await _upload_file(artifact_id, file, db, allowed, kind)

async def _upload_file(artifact_id: int, file: UploadFile, db: Session, allowed: set[str], kind: str):
    if not db.get(Artifact, artifact_id): raise HTTPException(404, "未找到文物")
    try: filename, path, size = await save_upload(file, artifact_id, allowed)
    except ValueError as e: raise HTTPException(400, str(e))
    except OSError: raise HTTPException(503, "文件存储不可用，上传未完成，请保留所选文件后重试。")
    common = dict(artifact_id=artifact_id, filename=filename, original_filename=file.filename or filename, file_path=path, mime_type=file.content_type or "application/octet-stream", file_size=size)
    if kind == "asset": item = Asset(**common)
    else:
        suffix = filename.rsplit(".", 1)[-1]; item = Document(**common, document_type="word" if suffix in {"doc", "docx"} else suffix)
    try:
        db.add(item); db.commit()
    except Exception:
        db.rollback()
        Path(path).unlink(missing_ok=True)
        raise
    db.refresh(item)
    response = ok((AssetOut if kind == "asset" else DocumentOut).model_validate(item))
    if kind == "document" and item.document_type == "pdf":
        response["warning"] = "本版本仅保存 PDF，不提取文字（含扫描件）。请手动粘贴来源文字，不能将上传成功视为解析成功。"
    return response
@router.post("/artifacts/{artifact_id}/assets", status_code=201)
async def upload_asset(artifact_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)): return await upload_file(artifact_id, file, db, IMAGE_EXTENSIONS, "asset")
@router.post("/artifacts/{artifact_id}/documents", status_code=201)
async def upload_document(artifact_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)): return await upload_file(artifact_id, file, db, DOCUMENT_EXTENSIONS, "document")
@router.delete("/assets/{asset_id}")
def delete_asset(asset_id: int, db: Session = Depends(get_db)):
    item = db.get(Asset, asset_id)
    if not item: raise HTTPException(404, "未找到数字资产")
    db.delete(item); db.commit(); return ok({"deleted": True})
@router.delete("/documents/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    item = db.get(Document, document_id)
    if not item: raise HTTPException(404, "未找到资料")
    db.delete(item); db.commit(); return ok({"deleted": True})
