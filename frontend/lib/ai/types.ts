export type AIOutputSource = 'model' | 'mock' | 'fallback';

export type AnalyzeArtifactImageInput = {
  imageUrl: string;
  context?: string;
};

export type ExtractMetadataInput = {
  sourceText: string;
  context?: string;
};

export type GenerateNarrationsInput = {
  museumAssetId: string;
  assetName: string;
  sourceDocuments: NarrationSource[];
  confirmedFields: Record<string, string>;
  visualDescription?: string;
};

export type NarrationSource = {
  id: string;
  title: string;
  text: string;
  priority: 'STAFF' | 'DOCUMENT';
};

export type NarrationVariant = 'GENERAL' | 'CHILDREN' | 'PROFESSIONAL' | 'SHORT';

export type NarrationSourceReference = {
  sourceDocumentId: string;
  quote: string;
};

export type ArtifactImageAnalysis = {
  category: string;
  material: string;
  visualDescription: string;
  shapeFeatures: string;
  patternFeatures: string;
  tags: string[];
  confidence: number;
  source: AIOutputSource;
  rawOutput?: string;
};

export type ExtractedMetadata = {
  category: string | null;
  material: string | null;
  dynasty: string | null;
  dimensions: string | null;
  description: string | null;
  tags: string[];
  confidence: number;
  source: AIOutputSource;
  rawOutput?: string;
};

export type NarrationDraft = {
  variant: NarrationVariant;
  content: string;
  sourceDocumentIds: string[];
  sourceReference: NarrationSourceReference[];
};

export type NarrationGeneration = {
  narrations: NarrationDraft[];
  source: AIOutputSource;
};

export interface AIProvider {
  readonly name: 'mock' | 'openai-compatible';
  analyzeArtifactImage(input: AnalyzeArtifactImageInput): Promise<ArtifactImageAnalysis>;
  extractMetadata(input: ExtractMetadataInput): Promise<ExtractedMetadata>;
  generateNarrations(input: GenerateNarrationsInput): Promise<NarrationGeneration>;
}
