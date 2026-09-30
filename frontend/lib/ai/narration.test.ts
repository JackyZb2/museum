import assert from 'node:assert/strict';
import test from 'node:test';

import { MockAIProvider } from './mock-provider';
import { createLimitedNarrations } from './narration-templates';
import type { GenerateNarrationsInput } from './types';
import { narrationLength, narrationLimits, validateNarrationGeneration } from './validation';

const withSource: GenerateNarrationsInput = {
  museumAssetId: 'test-asset',
  assetName: '测试文物',
  sourceDocuments: [
    {
      id: 'document-1',
      title: '登记资料',
      text: '登记资料明确写有：材质为陶。',
      priority: 'DOCUMENT',
    },
  ],
  confirmedFields: {},
};

test('有资料时 Mock 一次返回四版，并有可核对来源', async () => {
  const result = await new MockAIProvider().generateNarrations(withSource);
  assert.equal(result.source, 'mock');
  assert.equal(result.narrations.length, 4);
  for (const narration of result.narrations) {
    assert.ok(narration.sourceDocumentIds.includes('document-1'));
    assert.ok(
      narration.sourceReference[0].quote &&
        withSource.sourceDocuments[0].text.includes(narration.sourceReference[0].quote),
    );
    const length = narrationLength(narration.content);
    assert.ok(
      length >= narrationLimits[narration.variant].min &&
        length <= narrationLimits[narration.variant].max,
    );
  }
});

test('无资料时只生成受限内容，不添加历史事实', () => {
  const result = createLimitedNarrations({
    ...withSource,
    sourceDocuments: [],
    visualDescription: '表面可见蓝色纹样',
  });
  assert.equal(result.narrations.length, 4);
  for (const narration of result.narrations) {
    assert.deepEqual(narration.sourceDocumentIds, []);
    assert.match(narration.content, /资料中未提供相关信息/);
    assert.doesNotMatch(narration.content, /商代|宋代|出土于/);
  }
});

test('无资料且名称、视觉描述很长时仍能安全生成受限四版', () => {
  const result = createLimitedNarrations({
    ...withSource,
    assetName: '测试文物'.repeat(30),
    sourceDocuments: [],
    visualDescription: '表面可见蓝色纹样'.repeat(100),
  });
  assert.equal(result.narrations.length, 4);
});

test('非法来源 ID、捏造的引文和非法 JSON 不能通过校验', async () => {
  const valid = await new MockAIProvider().generateNarrations(withSource);
  const invalidId = structuredClone(valid.narrations);
  invalidId[0].sourceDocumentIds = ['invented'];
  assert.equal(validateNarrationGeneration({ narrations: invalidId }, withSource, 'model'), null);
  const invalidQuote = structuredClone(valid.narrations);
  invalidQuote[0].sourceReference[0].quote = '资料里没有的事实';
  assert.equal(
    validateNarrationGeneration({ narrations: invalidQuote }, withSource, 'model'),
    null,
  );
  assert.equal(validateNarrationGeneration({ narrations: null }, withSource, 'model'), null);
});
