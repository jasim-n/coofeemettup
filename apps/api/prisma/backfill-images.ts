import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const prisma = new PrismaClient({ adapter: new PrismaPg(url) });

// Category → pool of bundled cover images (apps/web/public/tables/*.jpg).
// Tables missing an imageUrl get a category-appropriate cover, rotating through
// the pool so same-category tables don't all look identical.
const POOL: Record<string, string[]> = {
  'Coffee & chill': ['t08', 't11', 't07', 't02'],
  'Deep talks': ['t06', 't03', 't15', 't01'],
  Startups: ['t04', 't13', 't09'],
  'Language exchange': ['t05', 't16', 't01'],
  Books: ['t03', 't14', 't02'],
  Networking: ['t10', 't15', 't05'],
  'Board games': ['t12', 't13'],
};
const DEFAULT = ['t09', 't01', 't08', 't04'];

async function main(): Promise<void> {
  const rows = await prisma.table.findMany({
    where: { imageUrl: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, category: true },
  });
  const counter: Record<string, number> = {};
  for (const t of rows) {
    const pool = POOL[t.category] ?? DEFAULT;
    const i = counter[t.category] ?? 0;
    counter[t.category] = i + 1;
    await prisma.table.update({
      where: { id: t.id },
      data: { imageUrl: `/tables/${pool[i % pool.length]}.jpg` },
    });
  }
  console.log(`Backfilled ${rows.length} tables with cover images.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
