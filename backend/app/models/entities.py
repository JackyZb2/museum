from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base
class Museum(Base):
    __tablename__ = "museums"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    artifacts: Mapped[list["Artifact"]] = relationship(back_populates="museum", cascade="all, delete-orphan")
class Artifact(Base):
    __tablename__ = "artifacts"
    id: Mapped[int] = mapped_column(primary_key=True)
    museum_id: Mapped[int] = mapped_column(ForeignKey("museums.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    dynasty: Mapped[str | None] = mapped_column(String(100)); category: Mapped[str | None] = mapped_column(String(100)); material: Mapped[str | None] = mapped_column(String(100)); inventory_number: Mapped[str | None] = mapped_column(String(100)); description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now()); updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    museum: Mapped[Museum] = relationship(back_populates="artifacts"); assets: Mapped[list["Asset"]] = relationship(back_populates="artifact", cascade="all, delete-orphan"); documents: Mapped[list["Document"]] = relationship(back_populates="artifact", cascade="all, delete-orphan")
class Asset(Base):
    __tablename__ = "assets"
    id: Mapped[int] = mapped_column(primary_key=True); artifact_id: Mapped[int] = mapped_column(ForeignKey("artifacts.id", ondelete="CASCADE"), nullable=False); filename: Mapped[str] = mapped_column(String(255)); original_filename: Mapped[str] = mapped_column(String(255)); file_path: Mapped[str] = mapped_column(String(500)); mime_type: Mapped[str] = mapped_column(String(100)); file_size: Mapped[int] = mapped_column(Integer); asset_type: Mapped[str] = mapped_column(String(30), default="image"); created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now()); artifact: Mapped[Artifact] = relationship(back_populates="assets")
class Document(Base):
    __tablename__ = "documents"
    id: Mapped[int] = mapped_column(primary_key=True); artifact_id: Mapped[int] = mapped_column(ForeignKey("artifacts.id", ondelete="CASCADE"), nullable=False); filename: Mapped[str] = mapped_column(String(255)); original_filename: Mapped[str] = mapped_column(String(255)); file_path: Mapped[str] = mapped_column(String(500)); mime_type: Mapped[str] = mapped_column(String(100)); file_size: Mapped[int] = mapped_column(Integer); document_type: Mapped[str] = mapped_column(String(30), default="other"); created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now()); artifact: Mapped[Artifact] = relationship(back_populates="documents")

