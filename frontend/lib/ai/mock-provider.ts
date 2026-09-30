import { fallbackImageAnalysis, fallbackMetadata } from './fallbacks';
import type {
  AIProvider,
  AnalyzeArtifactImageInput,
  ArtifactImageAnalysis,
  ExtractedMetadata,
  ExtractMetadataInput,
  GenerateNarrationsInput,
  NarrationGeneration,
} from './types';
import { validateArtifactImageAnalysis, validateExtractedMetadata } from './validation';
import { createMockNarrations } from './narration-templates';

export class MockAIProvider implements AIProvider {
  readonly name = 'mock' as const;

  async analyzeArtifactImage(_input: AnalyzeArtifactImageInput): Promise<ArtifactImageAnalysis> {
    const output = {
      category: '示例类别',
      material: '示例材质',
      visualDescription: '这是模拟分析结果，未对图片进行真实识别。',
      shapeFeatures: '未知（模拟模式未识别器型）',
      patternFeatures: '未知（模拟模式未识别纹样）',
      tags: ['演示数据', '待人工核对'],
      confidence: 0.5,
    };
    const validated = validateArtifactImageAnalysis(output, 'mock');
    return validated
      ? { ...validated, rawOutput: JSON.stringify(output) }
      : fallbackImageAnalysis();
  }

  async extractMetadata(_input: ExtractMetadataInput): Promise<ExtractedMetadata> {
    const output = {
      category: '示例类别',
      material: '示例材质',
      dynasty: null,
      dimensions: null,
      description: '这是模拟提取结果，未读取真实史料。',
      tags: ['演示数据'],
      confidence: 0.5,
    };
    const validated = validateExtractedMetadata(output, 'mock');
    return validated ? { ...validated, rawOutput: JSON.stringify(output) } : fallbackMetadata();
  }

  async generateNarrations(input: GenerateNarrationsInput): Promise<NarrationGeneration> {
    return createMockNarrations(input);
  }
}
