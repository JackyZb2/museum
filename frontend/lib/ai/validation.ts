import type {
  AIOutputSource,
  ArtifactImageAnalysis,
  ExtractedMetadata,
  GenerateNarrationsInput,
  NarrationDraft,
  NarrationGeneration,
  NarrationVariant,
} from './types';

export const narrationLimits: Record<NarrationVariant, { min: number; max: number }> = {
  GENERAL: { min: 300, max: 500 },
  CHILDREN: { min: 200, max: 300 },
  PROFESSIONAL: { min: 500, max: 800 },
  SHORT: { min: 100, max: 150 },
};

export function narrationLength(content: string): number {
  return Array.from(content.replace(/\s/g, '')).length;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseAIJson(content: unknown): unknown | null {
  if (typeof content !== 'string' || content.length > 20_000) return null;
  const trimmed = content.trim();
  const candidate = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    : trimmed;

  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    return null;
  }
}

function requiredText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > 0 && text.length <= maxLength ? text : null;
}

function optionalText(value: unknown, maxLength: number): string | null | undefined {
  if (value === null) return null;
  return requiredText(value, maxLength) ?? undefined;
}

function validatedTags(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 20) return null;
  const tags = value.map((tag) => requiredText(tag, 50));
  return tags.every((tag): tag is string => tag !== null) ? tags : null;
}

function validatedConfidence(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
    ? value
    : null;
}

export function validateArtifactImageAnalysis(
  value: unknown,
  source: AIOutputSource,
): ArtifactImageAnalysis | null {
  if (!isRecord(value)) return null;
  const category = requiredText(value.category, 100);
  const material = requiredText(value.material, 100);
  const visualDescription = requiredText(value.visualDescription, 2_000);
  const shapeFeatures = requiredText(value.shapeFeatures, 1_000);
  const patternFeatures = requiredText(value.patternFeatures, 1_000);
  const tags = validatedTags(value.tags);
  const confidence = validatedConfidence(value.confidence);
  if (
    !category ||
    !material ||
    !visualDescription ||
    !shapeFeatures ||
    !patternFeatures ||
    !tags ||
    confidence === null
  )
    return null;
  return {
    category,
    material,
    visualDescription,
    shapeFeatures,
    patternFeatures,
    tags,
    confidence,
    source,
  };
}

export function validateExtractedMetadata(
  value: unknown,
  source: AIOutputSource,
): ExtractedMetadata | null {
  if (!isRecord(value)) return null;
  const category = optionalText(value.category, 100);
  const material = optionalText(value.material, 100);
  const dynasty = optionalText(value.dynasty, 100);
  const dimensions = optionalText(value.dimensions, 100);
  const description = optionalText(value.description, 2_000);
  const tags = validatedTags(value.tags);
  const confidence = validatedConfidence(value.confidence);
  if (
    category === undefined ||
    material === undefined ||
    dynasty === undefined ||
    dimensions === undefined ||
    description === undefined ||
    !tags ||
    confidence === null
  ) {
    return null;
  }
  return { category, material, dynasty, dimensions, description, tags, confidence, source };
}

export function validateNarrationGeneration(
  value: unknown,
  input: GenerateNarrationsInput,
  source: AIOutputSource,
): NarrationGeneration | null {
  if (!isRecord(value) || !Array.isArray(value.narrations) || value.narrations.length !== 4)
    return null;
  const sources = new Map(input.sourceDocuments.map((document) => [document.id, document]));
  const staffSourceId = input.sourceDocuments.find((document) => document.priority === 'STAFF')?.id;
  const hasEvidence = sources.size > 0 || Object.keys(input.confirmedFields).length > 0;
  const seen = new Set<NarrationVariant>();
  const narrations: NarrationDraft[] = [];
  for (const candidate of value.narrations) {
    if (!isRecord(candidate)) return null;
    const variant = candidate.variant;
    if (typeof variant !== 'string' || !(variant in narrationLimits)) return null;
    const knownVariant = variant as NarrationVariant;
    if (seen.has(knownVariant)) return null;
    seen.add(knownVariant);
    const content = requiredText(candidate.content, 1_200);
    if (!content || !/[\u3400-\u9fff]/u.test(content)) return null;
    const length = narrationLength(content);
    const limits = narrationLimits[knownVariant];
    if (hasEvidence && (length < limits.min || length > limits.max)) return null;
    if (!hasEvidence && length > limits.max) return null;
    if (!Array.isArray(candidate.sourceDocumentIds) || candidate.sourceDocumentIds.length > 20)
      return null;
    const ids = candidate.sourceDocumentIds;
    if (ids.some((id): boolean => typeof id !== 'string' || !sources.has(id))) return null;
    if (new Set(ids).size !== ids.length) return null;
    if (sources.size > 0 && ids.length === 0) return null;
    if (staffSourceId && !ids.includes(staffSourceId)) return null;
    if (!Array.isArray(candidate.sourceReference) || candidate.sourceReference.length > 20)
      return null;
    const references: NarrationDraft['sourceReference'] = [];
    for (const reference of candidate.sourceReference) {
      if (!isRecord(reference) || typeof reference.sourceDocumentId !== 'string') return null;
      const quote = requiredText(reference.quote, 200);
      const document = sources.get(reference.sourceDocumentId);
      if (
        !quote ||
        !document ||
        !ids.includes(reference.sourceDocumentId) ||
        !document.text.includes(quote)
      )
        return null;
      references.push({ sourceDocumentId: reference.sourceDocumentId, quote });
    }
    if (
      ids.some((id: string) => !references.some((reference) => reference.sourceDocumentId === id))
    )
      return null;
    narrations.push({
      variant: knownVariant,
      content,
      sourceDocumentIds: ids,
      sourceReference: references,
    });
  }
  return { narrations, source };
}
