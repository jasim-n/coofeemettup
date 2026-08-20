/**
 * Seed Featured Moments from local minglers Instagram demo media
 * (copied into apps/web/public/showcase/).
 *
 * Sources (downloaded with the user's Chrome Default Instagram session):
 *   - https://www.instagram.com/p/DbgxMgUsoNM/
 *   - https://www.instagram.com/stories/highlights/17920708779409192/
 *   - https://www.instagram.com/stories/highlights/18115795888927821/ (video collage)
 *
 *   cd apps/api && npx --yes tsx scripts/seed-featured-showcase.ts
 */
import { readFileSync, existsSync } from 'node:fs';
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

const SHOWCASE_DIR = path.resolve(process.cwd(), '../../apps/web/public/showcase');

const REELS = [
  {
    file: 'minglers-memories.mp4',
    poster: 'minglers-memories.jpg',
    durationMs: 15_000,
    caption: 'While everyone was scrolling… we were making memories',
  },
  {
    file: 'minglers-event-p3.mp4',
    poster: 'minglers-event-p3.jpg',
    durationMs: 12_000,
    caption: 'EVENT P3 — table energy from the night',
  },
];

const COLLAGE = {
  files: [
    'minglers-collage-01.mp4',
    'minglers-collage-02.mp4',
    'minglers-collage-03.mp4',
    'minglers-collage-04.mp4',
  ],
  poster: 'minglers-collage-01.jpg',
  caption: 'Meetup moments — video collage',
};

function publicUrl(file: string): string {
  return `/showcase/${file}`;
}

async function main() {
  for (const f of [
    ...REELS.flatMap((r) => [r.file, r.poster]),
    ...COLLAGE.files,
    COLLAGE.poster,
  ]) {
    if (!existsSync(path.join(SHOWCASE_DIR, f))) {
      throw new Error(`Missing showcase asset: ${f} (expected under ${SHOWCASE_DIR})`);
    }
  }

  const tables = await prisma.table.findMany({
    where: { status: { in: ['OPEN', 'FULL', 'COMPLETED'] } },
    orderBy: { startAt: 'desc' },
    take: 6,
    select: { id: true, hostId: true, title: true },
  });
  if (tables.length === 0) {
    throw new Error('No tables found — create a few meetups first');
  }

  await prisma.tableImage.deleteMany({
    where: {
      OR: [
        { caption: { startsWith: '[showcase]' } },
        { caption: { startsWith: '[ig]' } },
      ],
    },
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
        url: publicUrl(reel.file),
        posterUrl: publicUrl(reel.poster),
        durationMs: reel.durationMs,
        caption: `[ig] ${reel.caption}`,
        featured: true,
        sortOrder: sort++,
        layout: {
          fit: 'contain',
          scale: 0.92,
          position: 'center center',
        },
      },
    });
    console.log('reel →', table.title ?? table.id, reel.file);
  }

  const collageTable = tables[2 % tables.length]!;
  const collageUrls = COLLAGE.files.map(publicUrl);
  await prisma.tableImage.create({
    data: {
      tableId: collageTable.id,
      uploadedById: collageTable.hostId,
      kind: 'COLLAGE',
      url: collageUrls[0]!,
      collageUrls: collageUrls.slice(1),
      posterUrl: publicUrl(COLLAGE.poster),
      caption: `[ig] ${COLLAGE.caption}`,
      featured: true,
      sortOrder: sort++,
      layout: {
        fit: 'cover',
        scale: 1,
        position: 'center center',
        collage: { preset: 'hero-left' },
      },
    },
  });
  console.log('video collage →', collageTable.title ?? collageTable.id);

  console.log('seeded-ig-featured-showcase-ok', { slides: sort });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
