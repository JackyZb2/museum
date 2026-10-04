"""Stability checks use only an isolated database and local fixture files."""
import asyncio
from io import BytesIO
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from fastapi import HTTPException, UploadFile
from pydantic import ValidationError
from sqlalchemy import create_engine, select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session
from app.api.routes import delete_artifact, upload_file, get_artifact
from app.core.config import settings
from app.db.session import Base
from app.models.entities import Artifact, Asset, Document, Museum
from app.schemas.entities import ArtifactCreate
from app.services.storage import save_upload, IMAGE_EXTENSIONS, DOCUMENT_EXTENSIONS
from app.services.operations import upload_operation, is_uploading


class StabilityTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix=".local-qa-test-", dir=Path.cwd())
        self.old_upload_dir = settings.upload_dir
        settings.upload_dir = self.directory.name
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.db.add(Museum(id=1, name="隔离测试馆"))
        self.db.add(Artifact(id=1, museum_id=1, name="异常测试文物"))
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()
        settings.upload_dir = self.old_upload_dir
        self.directory.cleanup()

    def file(self, name, content):
        return UploadFile(filename=name, file=BytesIO(content))

    def test_empty_name(self):
        for name in ["", "   "]:
            with self.assertRaises(ValidationError): ArtifactCreate(name=name)

    def test_bad_and_empty_image_cleanup(self):
        for content in [b"", b"this is not png"]:
            with self.assertRaises(ValueError):
                asyncio.run(save_upload(self.file("image.png", content), 1, IMAGE_EXTENSIONS))
        self.assertFalse(list(Path(self.directory.name).rglob("*.png")))

    def test_storage_failure(self):
        with patch("pathlib.Path.mkdir", side_effect=OSError("qa disk failure")):
            with self.assertRaises(HTTPException) as error:
                asyncio.run(upload_file(1, self.file("image.png", b"x"), self.db, IMAGE_EXTENSIONS, "asset"))
            self.assertEqual(error.exception.status_code, 503)

    def test_pdf_not_parsed_and_invalid_pdf_rejected(self):
        with self.assertRaises(ValueError):
            asyncio.run(save_upload(self.file("broken.pdf", b"not pdf"), 1, DOCUMENT_EXTENSIONS))
        # Empty/scanned placeholder: it is archived, never represented as extracted text.
        result = asyncio.run(upload_file(1, self.file("no-text.pdf", b"%PDF-1.4\n% archive-only fixture\n%%EOF"), self.db, DOCUMENT_EXTENSIONS, "document"))
        self.assertIn("不提取文字", result["warning"])
        self.assertEqual(self.db.scalars(select(Document)).all()[0].document_type, "pdf")

    def test_deleting_parent_in_use_is_blocked(self):
        self.db.add(Asset(artifact_id=1, filename="a.png", original_filename="a.png", file_path="fixture", mime_type="image/png", file_size=1))
        self.db.commit()
        with self.assertRaises(HTTPException) as error: delete_artifact(1, self.db)
        self.assertEqual(error.exception.status_code, 409)
        self.assertIsNotNone(self.db.get(Artifact, 1))
        self.assertEqual(len(self.db.scalars(select(Asset)).all()), 1)

    def test_missing_artifact(self):
        with self.assertRaises(HTTPException) as error: get_artifact(999, self.db)
        self.assertEqual(error.exception.status_code, 404)

    def test_deleting_during_upload_is_blocked(self):
        with upload_operation(1):
            self.assertTrue(is_uploading(1))
            with self.assertRaises(HTTPException) as error: delete_artifact(1, self.db)
            self.assertEqual(error.exception.status_code, 409)
        self.assertFalse(is_uploading(1))

    def test_database_failure_cleans_uploaded_file(self):
        failure = OperationalError("qa", {}, Exception("qa write failure"))
        with patch.object(self.db, "commit", side_effect=failure):
            with self.assertRaises(OperationalError):
                asyncio.run(upload_file(1, self.file("source.txt", b"source text"), self.db, DOCUMENT_EXTENSIONS, "document"))
        self.assertFalse(list(Path(self.directory.name).rglob("*.txt")))
        self.assertEqual(self.db.scalars(select(Document)).all(), [])


if __name__ == "__main__": unittest.main()
