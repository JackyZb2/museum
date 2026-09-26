# MuseumAI Studio

MuseumAI Studio is an open-source workspace for museum digital asset management and AI-assisted cultural heritage interpretation. v0.1 is a focused foundation: artifact CRUD, local image/document uploads, persistent metadata, and a clean extension point for future AI features.

## Quick start without Docker

The local demo uses SQLite and does not require Docker or PostgreSQL.

```powershell
# Terminal 1
.\backend\run-local.ps1

# Terminal 2
.\frontend\run-local.ps1
```

Open http://localhost:3000 and API docs at http://localhost:8000/docs.

## Docker / PostgreSQL setup

```powershell
docker compose up --build
```

The Docker profile uses PostgreSQL. The local profile uses SQLite for development convenience; set `DATABASE_URL` to a PostgreSQL URL when deploying the full stack.

## Features

- Dashboard, artifact list, create/edit/detail views
- Image uploads (JPG, JPEG, PNG, WEBP) and documents (PDF, DOC, DOCX, TXT)
- Museum, Artifact, Asset, and Document entities (SQLite locally, PostgreSQL with Docker)
- Local storage behind a storage service; ready for S3/MinIO later
- Seeded demo museum and two artifacts

## Structure

`frontend/` Next.js App Router UI · `backend/` FastAPI, SQLAlchemy, Alembic · `docs/` project notes.

## Environment

Copy `.env.example` to `.env` only when you need to override the local defaults. Docker environment values are included in compose.

## Roadmap

v0.2 AI visual tagging · v0.3 document RAG · v0.4 AI interpretation · v0.5 review and citations · v0.6 digital exhibit pages · v1.0 Museum Digital Asset AI Workspace.

AI features are planned for future releases and are not part of v0.1.

Licensed under Apache License 2.0.
