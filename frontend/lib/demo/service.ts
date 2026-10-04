import 'server-only';
import { prisma } from '../prisma';
import { MockAIProvider } from '../ai/mock-provider';
import { DEMO_CATALOG, DEMO_MUSEUM_ID, DEMO_NOTICE, demoItem } from './catalog';

export class DemoConflict extends Error {}
const titles: Record<string, string> = {
  GENERAL: '普通游客版',
  CHILDREN: '儿童版',
  PROFESSIONAL: '专业版',
  SHORT: '30 秒短讲解',
};

export async function initializeDemo(reset = false) {
  await prisma.$transaction(async (tx) => {
    await tx.museum.upsert({
      where: { id: DEMO_MUSEUM_ID },
      update: {},
      create: { id: DEMO_MUSEUM_ID, name: '产品答辩演示馆', description: DEMO_NOTICE },
    });
    for (const item of DEMO_CATALOG) {
      const existing = await tx.museumAsset.findUnique({ where: { id: item.id } });
      if (existing && existing.museumId !== DEMO_MUSEUM_ID)
        throw new DemoConflict('演示编号冲突，请检查本地数据。');
      if (reset && existing) {
        await tx.narration.deleteMany({ where: { museumAssetId: item.id } });
        await tx.assetMetadata.deleteMany({ where: { museumAssetId: item.id } });
        await tx.sourceDocument.deleteMany({ where: { museumAssetId: item.id } });
        await tx.auditLog.deleteMany({ where: { entityType: 'MuseumAsset', entityId: item.id } });
      }
      const data = {
        name: item.name,
        category: item.category,
        material: item.material,
        dynasty: '资料中未提供',
        description: `${DEMO_NOTICE}\n${item.description}`,
        imageUrl: item.image,
        status: 'DRAFT',
        authorizationStatus: 'DEMO_ONLY',
      };
      await tx.museumAsset.upsert({
        where: { id: item.id },
        update: reset ? data : {},
        create: { id: item.id, museumId: DEMO_MUSEUM_ID, ...data },
      });
      await tx.assetMetadata.upsert({
        where: { museumAssetId_key: { museumAssetId: item.id, key: 'demoStep' } },
        update: reset ? { value: '0' } : {},
        create: { museumAssetId: item.id, key: 'demoStep', value: '0' },
      });
      await tx.sourceDocument.upsert({
        where: { id: `${item.id}-source` },
        update: {},
        create: {
          id: `${item.id}-source`,
          museumAssetId: item.id,
          title: `${item.name}演示馆藏资料`,
          fileName: `${item.name}演示资料.txt`,
          documentType: 'text',
          source: 'DEMO',
          extractedText: `${DEMO_NOTICE}\n${item.description}`,
        },
      });
    }
  });
  return demoState();
}

export async function demoState() {
  const assets = await prisma.museumAsset.findMany({
    where: { museumId: DEMO_MUSEUM_ID, id: { in: DEMO_CATALOG.map((item) => item.id) } },
    include: {
      metadata: true,
      narrations: { select: { variant: true, status: true, content: true } },
    },
  });
  return DEMO_CATALOG.map((item) => {
    const asset = assets.find((value) => value.id === item.id);
    const metadata = Object.fromEntries(
      (asset?.metadata || []).map((value) => [value.key, value.value]),
    );
    return {
      ...item,
      step: Number(metadata.demoStep || 0),
      status: asset?.status || 'DRAFT',
      visualDescription: metadata.visualDescription || '',
      narrations: asset?.narrations || [],
    };
  });
}

export async function runDemoStep(id: string, step: number, confirmed: boolean) {
  const item = demoItem(id);
  if (!item) throw new DemoConflict('请选择有效的演示文物。');
  // Dedicated presentation workflow always uses Mock, even if global real-model settings exist.
  const provider = new MockAIProvider();
  await prisma.$transaction(async (tx) => {
    const asset = await tx.museumAsset.findFirst({
      where: { id, museumId: DEMO_MUSEUM_ID },
      include: { metadata: true, sourceDocuments: true },
    });
    if (!asset) throw new DemoConflict('请先初始化演示数据。');
    const current = Number(asset.metadata.find((value) => value.key === 'demoStep')?.value || 0);
    if (step <= current) return; // A lost response can safely be retried without duplicating records.
    if (step !== current + 1) throw new DemoConflict('演示步骤已变化，请刷新后继续。');
    const log = async (action: string) =>
      tx.auditLog.create({
        data: {
          action,
          actor: step === 7 ? '答辩演示者（演示审核）' : '离线演示流程',
          entityType: 'MuseumAsset',
          entityId: id,
          details: JSON.stringify({ demo: true, step }),
        },
      });
    const metadata = async (key: string, value: string) =>
      tx.assetMetadata.upsert({
        where: { museumAssetId_key: { museumAssetId: id, key } },
        update: { value },
        create: { museumAssetId: id, key, value },
      });
    if (step === 1) await log('DEMO_ASSET_UPLOADED');
    if (step === 2) {
      const result = await provider.extractMetadata({
        sourceText: asset.sourceDocuments.map((value) => value.extractedText).join('\n'),
      });
      await metadata('documentRawOutput', result.rawOutput || '');
      await metadata('documentSummary', item.description);
    }
    if (step === 3) {
      await log('AI_ANALYSIS_STARTED');
      await tx.museumAsset.update({ where: { id }, data: { status: 'PROCESSING' } });
      const result = await provider.analyzeArtifactImage({
        imageUrl: item.image,
        context: `${DEMO_NOTICE} ${item.description}`,
      });
      await metadata('imageRawOutput', result.rawOutput || '');
      await metadata('analysisSource', result.source);
      await metadata(
        'visualDescription',
        `${DEMO_NOTICE} 预置外观描述：${item.shape}；${item.pattern}。模拟流程不进行真实识图。`,
      );
      await metadata('shapeFeatures', item.shape);
      await metadata('patternFeatures', item.pattern);
      await metadata('aiCategory', item.category);
      await metadata('aiMaterial', item.material);
      await metadata('confidence', '0.5');
    }
    if (step === 4) await metadata('aiTags', JSON.stringify(item.tags));
    if (step === 5) {
      await tx.museumAsset.update({ where: { id }, data: { status: 'REVIEW_REQUIRED' } });
      await log('AI_ANALYSIS_COMPLETED');
    }
    if (step === 6) {
      const result = await provider.generateNarrations({
        museumAssetId: id,
        assetName: item.name,
        sourceDocuments: asset.sourceDocuments.map((value) => ({
          id: value.id,
          title: value.title,
          text: value.extractedText || '',
          priority: 'DOCUMENT',
        })),
        confirmedFields: { 类别: item.category, 材质: item.material },
        visualDescription: `${item.shape}；${item.pattern}`,
      });
      if (result.narrations.length !== 4)
        throw new DemoConflict('演示讲解校验失败，请重置后重试。');
      for (const narration of result.narrations)
        await tx.narration.create({
          data: {
            museumAssetId: id,
            variant: narration.variant,
            version: 1,
            title: titles[narration.variant],
            content: narration.content,
            status: 'AI_GENERATED',
            generationSource: 'mock',
            sourceDocumentIds: JSON.stringify(narration.sourceDocumentIds),
            sourceReference: JSON.stringify(narration.sourceReference),
          },
        });
      await log('NARRATION_GENERATED');
    }
    if (step === 7) {
      if (!confirmed) throw new DemoConflict('请由演示者点击确认，模拟工作人员审核。');
      const narrations = await tx.narration.findMany({ where: { museumAssetId: id } });
      if (narrations.length !== 4) throw new DemoConflict('请先完成四种讲解生成。');
      for (const narration of narrations) {
        await tx.narration.update({ where: { id: narration.id }, data: { status: 'APPROVED' } });
        await tx.auditLog.create({
          data: {
            action: 'NARRATION_APPROVED',
            actor: '答辩演示者（演示审核）',
            entityType: 'MuseumAsset',
            entityId: id,
            details: JSON.stringify({
              demo: true,
              narrationId: narration.id,
              variant: narration.variant,
              version: narration.version,
            }),
          },
        });
      }
    }
    if (step === 8) {
      if (!(await tx.narration.count({ where: { museumAssetId: id, status: 'APPROVED' } })))
        throw new DemoConflict('请先审核讲解。');
      await tx.museumAsset.update({ where: { id }, data: { status: 'PUBLISHED' } });
      await log('ASSET_PUBLISHED');
    }
    await metadata('demoStep', String(step));
  });
  return demoState();
}
