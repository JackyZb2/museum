# MuseumAI Studio

MuseumAI Studio is an open-source workspace for museum digital asset management and AI-assisted cultural heritage interpretation. v0.1 is a focused foundation: artifact CRUD, local image/document uploads, PostgreSQL persistence, and a clean extension point for future AI features.

## Quick start

```bash
docker compose up --build
```

Open http://localhost:3000 and API docs at http://localhost:8000/docs. Migrations run automatically on backend startup. To run manually: `docker compose exec backend alembic upgrade head`.

## Features

- Dashboard, artifact list, create/edit/detail views
- Image uploads (JPG, JPEG, PNG, WEBP) and documents (PDF, DOC, DOCX, TXT)
- PostgreSQL-backed Museum, Artifact, Asset, and Document entities
- Local storage behind a storage service; ready for S3/MinIO later
- Seeded demo museum and two artifacts

## Structure

`frontend/` Next.js App Router UI · `backend/` FastAPI, SQLAlchemy, Alembic · `docs/` project notes.

## Environment

Copy `.env.example` to `.env` for local development. Docker defaults are already included in compose.

## Roadmap

v0.2 AI visual tagging · v0.3 document RAG · v0.4 AI interpretation · v0.5 review and citations · v0.6 digital exhibit pages · v1.0 Museum Digital Asset AI Workspace.

AI features are planned for future releases and are not part of v0.1.

Licensed under Apache License 2.0.

