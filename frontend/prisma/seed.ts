import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.museum.upsert({
    where: { id: 'museum-main' },
    update: {},
    create: {
      id: 'museum-main',
      name: '博物馆工作区',
      description: 'MuseumAI Studio 基础工作区',
    },
  });
  console.info('基础种子数据已就绪：博物馆工作区');
}

main()
  .catch((error: unknown) => {
    console.error('种子数据初始化失败', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
