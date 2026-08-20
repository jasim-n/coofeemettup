/**
 * Seed Instagram-style showcase media (stock cafe reels + photo collages).
 * Does NOT scrape Instagram — uses free stock URLs for a product demo.
 *
 *   cd apps/api && npx --yes tsx scripts/seed-featured-showcase.ts
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  const file = readFileSync(envPath, 'utf8');
  for (const line of file.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const key = m[1]!;
    let val = m[2]!.trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

/** Cafe / meetup vibe stock reels (Pexels CDN — free to use). */
const REELS = [
  {
    url: 'https://videos.pexels.com/video-files/5532770/5532770-sd_540_960_25fps.mp4',
    poster:
      'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800',
    durationMs: 12_000,
    caption: 'Latte art slow pour — table vibes',
  },
  {
    url: 'https://videos.pexels.com/video-files/4253494/4253494-sd_640_360_30fps.mp4',
    poster:
      'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=800',
    durationMs: 15_000,
    caption: 'Busy cafe energy between conversations',
  },
  {
    url: 'https://videos.pexels.com/video-files/3045163/3045163-sd_640_360_25fps.mp4',
    poster:
      'https://images.pexels.com/photos/683039/pexels-photo-683039.jpeg?auto=compress&cs=tinysrgb&w=800',
    durationMs: 10_000,
    caption: 'Friends catching up over coffee',
  },
];

const COLLAGE_SETS = [
  [
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
    'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&q=80',
    'https://images.unsplash.com/photo-1442512595331-e89e7384261f?w=800&q=80',
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80',
  ],
  [
    'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800&q=80',
    'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=800&q=80',
    'https://images.unsplash.com/photo-1497935582031-863fbf3f2e7c?w=800&q=80',
  ],
];

async function main() {
  const tables = await prisma.table.findMany({
    where: { status: { in: ['OPEN', 'FULL', 'COMPLETED'] } },
    orderBy: { startAt: 'desc' },
    take: 6,
    select: { id: true, hostId: true, title: true },
  });
  if (tables.length === 0) {
    throw new Error('No tables found — create a few meetups first');
  }

  // Clear previous showcase seed markers
  await prisma.tableImage.deleteMany({
    where: { caption: { startsWith: '[showcase]' } },
  });

  let sort = 0;
  for (let i = 0; i < REELS.length; i++) {
    const table = tables[i % tables.length]!;
    const reel = REELS[i]!;
    await prisma.tableImage.create({
      data: {
        tableId: table.id,
        uploadedById: table.hostId,
        kind: 'VIDEO',
        url: reel.url,
        posterUrl: reel.poster,
        durationMs: reel.durationMs,
        caption: `[showcase] ${reel.caption}`,
        featured: true,
        sortOrder: sort++,
      },
    });
    console.log('reel →', table.title ?? table.id);
  }

  for (let i = 0; i < COLLAGE_SETS.length; i++) {
    const table = tables[(i + 2) % tables.length]!;
    const urls = COLLAGE_SETS[i]!;
    await prisma.tableImage.create({
      data: {
        tableId: table.id,
        uploadedById: table.hostId,
        kind: 'COLLAGE',
        url: urls[0]!,
        collageUrls: urls.slice(1),
        posterUrl: urls[0],
        caption: '[showcase] Meetup moments collage',
        featured: true,
        sortOrder: sort++,
      },
    });
    console.log('collage →', table.title ?? table.id);
  }

  // One classic photo slide for mix
  const photoTable = tables[0]!;
  await prisma.tableImage.create({
    data: {
      tableId: photoTable.id,
      uploadedById: photoTable.hostId,
      kind: 'IMAGE',
      url: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=1200&q=80',
      caption: '[showcase] Morning light at the table',
      featured: true,
      sortOrder: sort++,
    },
  });

  console.log('seeded-featured-showcase-ok', { slides: sort });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
