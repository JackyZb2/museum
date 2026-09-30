import type { ArtifactImageAnalysis, ExtractedMetadata, NarrationGeneration } from './types';

export function fallbackImageAnalysis(): ArtifactImageAnalysis {
  return {
    category: '未识别',
    material: '未识别',
    visualDescription: '暂无法可靠识别图片，请人工核对。',
    shapeFeatures: '未知',
    patternFeatures: '未知',
    tags: [],
    confidence: 0,
    source: 'fallback',
  };
}

export function fallbackMetadata(): ExtractedMetadata {
  return {
    category: null,
    material: null,
    dynasty: null,
    dimensions: null,
    description: null,
    tags: [],
    confidence: 0,
    source: 'fallback',
  };
}

export function unavailableNarrations(): NarrationGeneration {
  return { narrations: [], source: 'fallback' };
}
