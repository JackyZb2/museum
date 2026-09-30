import 'server-only';

import { fallbackImageAnalysis, fallbackMetadata, unavailableNarrations } from './fallbacks';
import type {
  AIProvider,
  AnalyzeArtifactImageInput,
  ArtifactImageAnalysis,
  ExtractedMetadata,
  ExtractMetadataInput,
  GenerateNarrationsInput,
  NarrationGeneration,
} from './types';
import {
  isRecord,
  parseAIJson,
  validateArtifactImageAnalysis,
  validateExtractedMetadata,
  validateNarrationGeneration,
} from './validation';
import { artifactImageSystemPrompt, artifactImageUserPrompt } from '../prompts/artifact-image';
import { metadataSystemPrompt, metadataUserPrompt } from '../prompts/metadata';
import { narrationSystemPrompt, narrationUserPrompt } from '../prompts/narration';

export type OpenAICompatibleConfig = {
  apiKey?: string;
  baseUrl: string;
  model: string;
  visionModel: string;
};

function chatContent(envelope: unknown): unknown {
  if (!isRecord(envelope) || !Array.isArray(envelope.choices)) return null;
  const firstChoice: unknown = envelope.choices[0];
  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) return null;
  return firstChoice.message.content;
}

function validImageUrl(value: string): boolean {
  if (value.length > 14_000_000) return false;
  if (/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(value)) return true;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export class OpenAICompatibleProvider implements AIProvider {
  readonly name = 'openai-compatible' as const;

  constructor(private readonly config: OpenAICompatibleConfig) {}

  private async requestJson(
    model: string,
    messages: unknown[],
  ): Promise<{ value: unknown; raw: string } | null> {
    if (!this.config.apiKey?.trim()) return null;

    try {
      const base = new URL(this.config.baseUrl);
      const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
      if (base.protocol !== 'https:' && !(base.protocol === 'http:' && isLoopback)) return null;
      if (base.username || base.password || base.search || base.hash) return null;
      const endpoint = new URL(
        `${base.pathname.replace(/\/+$/, '')}/chat/completions`,
        base.origin,
      );
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages }),
        signal: AbortSignal.timeout(30_000),
        cache: 'no-store',
      });
      if (!response.ok) return null;
      const envelope: unknown = await response.json();
      const raw = chatContent(envelope);
      return typeof raw === 'string'
        ? { value: parseAIJson(raw), raw: raw.slice(0, 20_000) }
        : null;
    } catch {
      return null;
    }
  }

  async analyzeArtifactImage(input: AnalyzeArtifactImageInput): Promise<ArtifactImageAnalysis> {
    const imageUrl = input.imageUrl.trim();
    if (!validImageUrl(imageUrl)) return fallbackImageAnalysis();

    const value = await this.requestJson(this.config.visionModel, [
      { role: 'system', content: artifactImageSystemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: artifactImageUserPrompt(input.context) },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ]);
    const validated = validateArtifactImageAnalysis(value?.value, 'model');
    return validated && value
      ? { ...validated, rawOutput: value.raw }
      : { ...fallbackImageAnalysis(), rawOutput: value?.raw };
  }

  async extractMetadata(input: ExtractMetadataInput): Promise<ExtractedMetadata> {
    if (!input.sourceText.trim()) return fallbackMetadata();

    const value = await this.requestJson(this.config.model, [
      { role: 'system', content: metadataSystemPrompt },
      { role: 'user', content: metadataUserPrompt(input.sourceText, input.context) },
    ]);
    const validated = validateExtractedMetadata(value?.value, 'model');
    return validated && value
      ? { ...validated, rawOutput: value.raw }
      : { ...fallbackMetadata(), rawOutput: value?.raw };
  }

  async generateNarrations(input: GenerateNarrationsInput): Promise<NarrationGeneration> {
    const value = await this.requestJson(this.config.model, [
      { role: 'system', content: narrationSystemPrompt },
      { role: 'user', content: narrationUserPrompt(input) },
    ]);
    return validateNarrationGeneration(value?.value, input, 'model') ?? unavailableNarrations();
  }
}
