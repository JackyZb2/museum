$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$projectPython = Join-Path $PSScriptRoot "..\.venv\Scripts\python.exe"
if (-not (Test-Path $projectPython)) { Write-Error "Project Python environment not found. Create .venv with Python 3.12 and install backend/requirements.txt."; exit 1 }
# FastAPI creates missing local SQLite tables at startup. Existing demo databases may not have Alembic version metadata.
& $projectPython -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
