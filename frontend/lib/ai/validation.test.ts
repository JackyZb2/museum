import assert from 'node:assert/strict';
import test from 'node:test';

import { MockAIProvider } from './mock-provider';
import {
  parseAIJson,
  validateArtifactImageAnalysis,
  validateExtractedMetadata,
} from './validation';

test('非法 JSON 和错误字段类型不会进入业务结果', () => {
  assert.equal(parseAIJson('{"category":'), null);
  assert.equal(
    validateArtifactImageAnalysis(
      {
        category: '陶瓷',
        material: '瓷',
        visualDescription: '白色器皿',
        shapeFeatures: '圆形',
        patternFeatures: '未知',
        tags: ['瓷器'],
        confidence: 3,
      },
      'model',
    ),
    null,
  );
  assert.equal(
    validateExtractedMetadata(
      {
        category: null,
        material: null,
        dynasty: null,
        dimensions: null,
        description: null,
        tags: ['有效', 1],
        confidence: 0.5,
      },
      'model',
    ),
    null,
  );
});

test('Mock 输出含必需字段并标记模拟来源', async () => {
  const provider = new MockAIProvider();
  const result = await provider.analyzeArtifactImage({ imageUrl: '无须真实图片' });
  assert.equal(result.source, 'mock');
  assert.ok(result.category);
  assert.ok(result.material);
  assert.ok(result.visualDescription);
  assert.ok(result.shapeFeatures);
  assert.ok(result.patternFeatures);
  assert.ok(result.rawOutput);
  assert.ok(Array.isArray(result.tags));
  assert.ok(result.confidence >= 0 && result.confidence <= 1);
});
