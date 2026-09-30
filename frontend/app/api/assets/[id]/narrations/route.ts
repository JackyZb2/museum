import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { getAIProvider } from '../../../../../lib/ai';
import { createLimitedNarrations } from '../../../../../lib/ai/narration-templates';
import type {
  GenerateNarrationsInput,
  NarrationSourceReference,
  NarrationVariant,
} from '../../../../../lib/ai/types';

export const runtime = 'nodejs';
export const maxDuration = 90;
type Context = { params: Promise<{ id: string }> };

const titles: Record<NarrationVariant, string> = {
  GENERAL: '普通游客版',
  CHILDREN: '儿童版',
  PROFESSIONAL: '专业版',
  SHORT: '30 秒短讲解',
};

function parseArray(value: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  const asset = await prisma.museumAsset.findUnique({
    where: { id },
    include: {
      sourceDocuments: true,
      narrations: { orderBy: [{ createdAt: 'desc' }, { version: 'desc' }] },
    },
  });
  if (!asset) return NextResponse.json({ error: '未找到文物。' }, { status: 404 });
  const documents = new Map(asset.sourceDocuments.map((document) => [document.id, document]));
  return NextResponse.json(
    asset.narrations.map((narration) => ({
      id: narration.id,
      variant: narration.variant,
      title: titles[narration.variant as NarrationVariant] || narration.title,
      version: narration.version,
      content: narration.content,
      status: narration.status,
      isLimited: narration.isLimited,
      generationSource: narration.generationSource,
      createdAt: narration.createdAt,
      updatedAt: narration.updatedAt,
      sourceDocuments: parseArray(narration.sourceDocumentIds)
        .filter((value): value is string => typeof value === 'string')
        .map((documentId) => documents.get(documentId))
        .filter((document) => document !== undefined)
        .map((document) => ({ id: document.id, name: document.fileName || document.title })),
      sourceReference: parseArray(narration.sourceReference || '[]'),
    })),
  );
}

export async function POST(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body))
    return NextResponse.json({ error: '请求内容无效。' }, { status: 400 });
  const staffSourceText = (body as Record<string, unknown>).staffSourceText;
  const requestedVariant = (body as Record<string, unknown>).variant;
  if (typeof staffSourceText !== 'string' || staffSourceText.length > 12_000)
    return NextResponse.json({ error: '工作人员资料不能超过 12000 字。' }, { status: 400 });
  if (requestedVariant !== undefined && !Object.keys(titles).includes(String(requestedVariant)))
    return NextResponse.json({ error: '讲解类型无效。' }, { status: 400 });

  const asset = await prisma.museumAsset.findUnique({
    where: { id },
    include: { sourceDocuments: { orderBy: { createdAt: 'asc' } }, metadata: true },
  });
  if (!asset) return NextResponse.json({ error: '未找到文物。' }, { status: 404 });
  if (asset.status === 'PROCESSING')
    return NextResponse.json({ error: '文物正在分析，请稍后生成讲解。' }, { status: 409 });

  const manualText = staffSourceText.trim();
  const documents = asset.sourceDocuments
    .filter((document) => Boolean(document.extractedText?.trim()))
    .slice(0, 10)
    .map((document) => ({
      id: document.id,
      title: document.fileName || document.title,
      text: document.extractedText!.trim().slice(0, 4_000),
      priority: 'DOCUMENT' as const,
    }));
  const sourceDocuments: GenerateNarrationsInput['sourceDocuments'] = manualText
    ? [
        {
          id: '__staff_input__',
          title: '工作人员本次输入资料',
          text: manualText,
          priority: 'STAFF',
        },
        ...documents,
      ]
    : documents;
  const confirmedFields: Record<string, string> = {};
  if (asset.status === 'APPROVED' || asset.status === 'PUBLISHED') {
    for (const [key, value] of Object.entries({
      藏品编号: asset.inventoryNumber,
      类别: asset.category,
      材质: asset.material,
      朝代: asset.dynasty,
      尺寸: asset.dimensions,
      描述: asset.description,
    }))
      if (value?.trim()) confirmedFields[key] = value.trim();
  }
  const metadata = new Map(asset.metadata.map((item) => [item.key, item.value]));
  const visualDescription =
    metadata.get('analysisSource') === 'model' ? metadata.get('visualDescription') : undefined;
  const input: GenerateNarrationsInput = {
    museumAssetId: id,
    assetName: asset.name,
    sourceDocuments,
    confirmedFields,
    visualDescription,
  };
  const hasGroundedFacts = sourceDocuments.length > 0 || Object.keys(confirmedFields).length > 0;
  const provider = hasGroundedFacts ? getAIProvider() : null;
  const generated = provider
    ? await provider.generateNarrations(input)
    : createLimitedNarrations(input);
  if (generated.narrations.length !== 4) {
    return NextResponse.json(
      { error: 'AI 服务不可用或结果未通过资料与结构校验；本次未保存讲解。请检查来源资料后重试。' },
      { status: 502 },
    );
  }

  try {
    const saved = await prisma.$transaction(async (tx) => {
      let staffDocumentId: string | null = null;
      if (manualText) {
        const document = await tx.sourceDocument.create({
          data: {
            museumAssetId: id,
            title: '工作人员手动输入资料',
            documentType: 'text',
            source: 'STAFF',
            extractedText: manualText,
          },
        });
        staffDocumentId = document.id;
      }
      const existing = await tx.narration.findMany({
        where: { museumAssetId: id },
        select: { variant: true, version: true },
      });
      const versions = new Map<string, number>();
      for (const item of existing)
        versions.set(item.variant, Math.max(versions.get(item.variant) || 0, item.version));
      const created = [];
      for (const draft of generated.narrations.filter(
        (item) => !requestedVariant || item.variant === requestedVariant,
      )) {
        const version = (versions.get(draft.variant) || 0) + 1;
        const replaceId = (sourceId: string) =>
          sourceId === '__staff_input__' ? staffDocumentId! : sourceId;
        const references: NarrationSourceReference[] = draft.sourceReference.map((reference) => ({
          ...reference,
          sourceDocumentId: replaceId(reference.sourceDocumentId),
        }));
        created.push(
          await tx.narration.create({
            data: {
              museumAssetId: id,
              variant: draft.variant,
              version,
              title: titles[draft.variant],
              content: draft.content,
              status: 'AI_GENERATED',
              generationSource: generated.source,
              isLimited: !hasGroundedFacts,
              sourceDocumentIds: JSON.stringify(draft.sourceDocumentIds.map(replaceId)),
              sourceReference: JSON.stringify(references),
            },
          }),
        );
      }
      await tx.auditLog.create({
        data: {
          action: 'NARRATION_GENERATED',
          entityType: 'MuseumAsset',
          entityId: id,
          actor: provider?.name || '受限模板',
          details: JSON.stringify({
            variants: created.map(({ variant, version }) => ({ variant, version })),
            source: generated.source,
            limited: !hasGroundedFacts,
          }),
        },
      });
      return created;
    });
    return NextResponse.json({
      count: saved.length,
      limited: !hasGroundedFacts,
      source: generated.source,
    });
  } catch {
    return NextResponse.json(
      { error: '讲解保存失败；本次没有写入新版本，请重试。' },
      { status: 409 },
    );
  }
}
