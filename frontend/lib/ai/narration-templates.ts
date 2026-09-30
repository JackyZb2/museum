import type {
  GenerateNarrationsInput,
  NarrationDraft,
  NarrationGeneration,
  NarrationVariant,
} from './types';
import { narrationLength, narrationLimits, validateNarrationGeneration } from './validation';

const variants: NarrationVariant[] = ['GENERAL', 'CHILDREN', 'PROFESSIONAL', 'SHORT'];

const openings: Record<NarrationVariant, string> = {
  GENERAL: '这是一段面向普通游客的资料整理讲解。',
  CHILDREN: '小朋友，我们一起根据馆藏资料认识这件文物。',
  PROFESSIONAL: '以下讲解仅整理已提供且可以核对的馆藏资料。',
  SHORT: '这件文物的简短介绍如下。',
};

const safeSentences = [
  '这段文字只依据目前提供的信息，不把未记录的内容说成事实。',
  '关于精确年代、作者、出土地、历史事件与具体用途，资料中未提供相关信息时就保持空白。',
  '图片中的外观只能作为观察线索，不能替代来源资料或专业鉴定。',
  '参观时可以先看清现有记录，再把尚待研究的问题留给后续核查。',
  '如果来源记录以后补充或修订，这段讲解也应由工作人员重新审核。',
];

export function createMockNarrations(input: GenerateNarrationsInput): NarrationGeneration {
  const primary = input.sourceDocuments[0];
  const quote = primary?.text.trim().slice(0, 40) || '';
  const known = Object.entries(input.confirmedFields)
    .map(([key, value]) => `${key}：${value}`)
    .join('；');
  const narrations: NarrationDraft[] = variants.map((variant) => {
    const sourceLine = primary ? `资料《${primary.title.slice(0, 30)}》记载：“${quote}”。` : '';
    const confirmedLine = known ? `已确认字段记录：${known}。` : '';
    const visualLine = input.visualDescription ? `从外观观察，${input.visualDescription}。` : '';
    let content = `${openings[variant]}文物名称：${input.assetName}。${sourceLine}`;
    if (narrationLength(content + confirmedLine) <= narrationLimits[variant].max - 50)
      content += confirmedLine;
    if (narrationLength(content + visualLine) <= narrationLimits[variant].max - 50)
      content += visualLine;
    let index = 0;
    while (narrationLength(content) < narrationLimits[variant].min) {
      const sentence = safeSentences[index % safeSentences.length];
      content +=
        narrationLength(content + sentence) <= narrationLimits[variant].max
          ? sentence
          : '资料中未提供相关信息。';
      index++;
      if (index > 40) break;
    }
    return {
      variant,
      content,
      sourceDocumentIds: primary ? [primary.id] : [],
      sourceReference: primary ? [{ sourceDocumentId: primary.id, quote }] : [],
    };
  });
  return (
    validateNarrationGeneration({ narrations }, input, 'mock') ?? {
      narrations: [],
      source: 'fallback',
    }
  );
}

export function createLimitedNarrations(input: GenerateNarrationsInput): NarrationGeneration {
  const result: NarrationGeneration = {
    source: 'fallback',
    narrations: variants.map((variant) => {
      const name = input.assetName.slice(0, variant === 'SHORT' ? 20 : 80);
      const visual = input.visualDescription?.trim().slice(0, variant === 'SHORT' ? 20 : 60);
      const prefix = visual
        ? `《${name}》的 AI 外观观察记录为：“${visual}”，仅供人工核对。`
        : `《${name}》目前尚无可核实的外观描述。`;
      return {
        variant,
        content: `${openings[variant]}${prefix}资料中未提供相关信息。精确年代、作者、出土地、历史事件、工艺与具体用途均不能仅凭图片确定，请等待馆方补充资料并人工审核。`,
        sourceDocumentIds: [],
        sourceReference: [],
      };
    }),
  };
  return (
    validateNarrationGeneration({ narrations: result.narrations }, input, 'fallback') ?? {
      narrations: [],
      source: 'fallback',
    }
  );
}
