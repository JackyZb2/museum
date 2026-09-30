import 'server-only';

import { MockAIProvider } from './mock-provider';
import { OpenAICompatibleProvider } from './openai-compatible-provider';
import type { AIProvider } from './types';

export function getAIProvider(): AIProvider {
  const apiKey = process.env.AI_API_KEY?.trim();
  const demoMode = process.env.DEMO_MODE?.trim().toLowerCase() === 'true';
  if (demoMode || !apiKey) return new MockAIProvider();

  const model = process.env.AI_MODEL?.trim() || 'gpt-4.1-mini';
  return new OpenAICompatibleProvider({
    apiKey,
    baseUrl: process.env.AI_BASE_URL?.trim() || 'https://api.openai.com/v1',
    model,
    visionModel: process.env.AI_VISION_MODEL?.trim() || model,
  });
}
