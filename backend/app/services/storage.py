from pathlib import Path
from uuid import uuid4
from fastapi import UploadFile
from app.core.config import settings
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt"}
async def save_upload(upload: UploadFile, artifact_id: int, allowed: set[str]):
    suffix = Path(upload.filename or "").suffix.lower()
    if suffix not in allowed: raise ValueError("不支持的文件格式")
    target_dir = Path(settings.upload_dir) / str(artifact_id); target_dir.mkdir(parents=True, exist_ok=True)
    safe_name = f"{uuid4().hex}{suffix}"; target = target_dir / safe_name; size = 0
    try:
        with target.open("wb") as output:
            while chunk := await upload.read(1024 * 1024):
                size += len(chunk)
                if size > settings.max_upload_size: raise ValueError("文件大小不能超过 20MB")
                output.write(chunk)
        if size == 0: raise ValueError("文件不能为空")
        if suffix in IMAGE_EXTENSIONS:
            with target.open("rb") as source: header = source.read(32)
            valid = (suffix in {".jpg", ".jpeg"} and header.startswith(b"\xff\xd8\xff")) or (suffix == ".png" and len(header) >= 24 and header.startswith(b"\x89PNG\r\n\x1a\n")) or (suffix == ".webp" and header[:4] == b"RIFF" and header[8:12] == b"WEBP")
            if not valid: raise ValueError("图片内容与格式不符或文件已损坏，请重新选择图片")
        if suffix == ".pdf":
            content = target.read_bytes()
            if not content.startswith(b"%PDF-") or b"%%EOF" not in content[-1024:]:
                raise ValueError("PDF 文件格式无效或不完整。本版本不提供 PDF 文字解析，请粘贴来源文字。")
    except Exception:
        target.unlink(missing_ok=True)
        raise
    return safe_name, str(target), size
