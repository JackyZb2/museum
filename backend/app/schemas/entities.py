from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
class ApiModel(BaseModel): model_config = ConfigDict(from_attributes=True)
class MuseumCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
class MuseumOut(ApiModel): id: int; name: str; description: str | None; created_at: datetime; updated_at: datetime
class ArtifactCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    museum_id: int = 1
    name: str = Field(min_length=1, max_length=255)
    dynasty: str | None = None
    category: str | None = None
    material: str | None = None
    inventory_number: str | None = None
    description: str | None = None
class ArtifactOut(ApiModel):
    id: int; museum_id: int; name: str; dynasty: str | None; category: str | None; material: str | None; inventory_number: str | None; description: str | None; created_at: datetime; updated_at: datetime
class AssetOut(ApiModel):
    id: int; artifact_id: int; filename: str; original_filename: str; file_path: str; mime_type: str; file_size: int; asset_type: str; created_at: datetime
class DocumentOut(ApiModel):
    id: int; artifact_id: int; filename: str; original_filename: str; file_path: str; mime_type: str; file_size: int; document_type: str; created_at: datetime
class ArtifactDetail(ArtifactOut): assets: list[AssetOut] = []; documents: list[DocumentOut] = []
