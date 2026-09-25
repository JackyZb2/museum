# Architecture

MuseumAI Studio v0.1 is intentionally split into a Next.js frontend and FastAPI backend. PostgreSQL stores metadata only; uploaded binaries live under `backend/uploads/{artifact_id}` behind `app/services/storage.py` so an S3/MinIO implementation can replace it later.

The API keeps SQLAlchemy models, Pydantic schemas, and HTTP routes separate. Artifact deletion cascades metadata records to assets and documents. Physical object deletion remains a documented TODO for the future storage adapter.

