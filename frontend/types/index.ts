export type Artifact = {
  id: number;
  museum_id: number;
  name: string;
  dynasty?: string;
  category?: string;
  material?: string;
  inventory_number?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  assets?: Asset[];
  documents?: DocumentItem[];
};
export type Asset = {
  id: number;
  artifact_id: number;
  original_filename: string;
  file_path: string;
  file_size: number;
  created_at: string;
};
export type DocumentItem = {
  id: number;
  artifact_id: number;
  original_filename: string;
  mime_type: string;
  file_size: number;
  created_at: string;
};
