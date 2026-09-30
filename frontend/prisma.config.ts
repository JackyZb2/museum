import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

process.env.PRISMA_DATABASE_URL ??= 'file:./museumai-core.db';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('PRISMA_DATABASE_URL'),
  },
});
