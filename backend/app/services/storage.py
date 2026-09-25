from pathlib import Path
from uuid import uuid4
from fastapi import UploadFile
from app.core.config import settings
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt"}
async def save_upload(upload: UploadFile, artifact_id: int, allowed: set[str]):
    suffix = Path(upload.filename or "").suffix.lower()
    if suffix not in allowed: raise ValueError("Unsupported file format")
    target_dir = Path(settings.upload_dir) / str(artifact_id); target_dir.mkdir(parents=True, exist_ok=True)
    safe_name = f"{uuid4().hex}{suffix}"; target = target_dir / safe_name; size = 0
    with target.open("wb") as output:
        while chunk := await upload.read(1024 * 1024):
            size += len(chunk)
            if size > settings.max_upload_size: target.unlink(missing_ok=True); raise ValueError("File exceeds the 20MB limit")
            output.write(chunk)
    return safe_name, str(target), size

