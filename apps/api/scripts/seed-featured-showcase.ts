/**
 * Seed Featured Moments from local minglers Instagram demo media
 * (copied into apps/web/public/showcase/).
 *
 * Deduped presentation:
 *   - Reel-only: public post https://www.instagram.com/p/DbgxMgUsoNM/
 *   - Collage-only: highlight nights (unique clips, no overlap with the reel)
 *       https://www.instagram.com/stories/highlights/17920708779409192/
 *       https://www.instagram.com/stories/highlights/18115795888927821/
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

/** Single reel — the public post only (not reused in the collage). */
const REEL = {
  file: 'minglers-memories.mp4',
  poster: 'minglers-memories.jpg',
  durationMs: 15_000,
  caption: 'While everyone was scrolling… we were making memories',
};

/**
 * Masonry collage — 9 distinct highlight clips (hl2 ×5 + hl1 items 02–05).
 * Excludes hl1 item_01 / event-p3 so nothing overlaps the reel slide.
 */
const COLLAGE = {
  files: [
    'minglers-collage-01.mp4',
    'minglers-collage-02.mp4',
    'minglers-collage-03.mp4',
    'minglers-collage-04.mp4',
    'minglers-collage-05.mp4',
    'minglers-collage-06.mp4',
    'minglers-collage-07.mp4',
    'minglers-collage-08.mp4',
    'minglers-collage-09.mp4',
  ],
  poster: 'minglers-collage-01.jpg',
  caption: 'Meetup moments — masonry collage',
};

function publicUrl(file: string): string {
  return `/showcase/${file}`;
}

async function main() {
  for (const f of [REEL.file, REEL.poster, ...COLLAGE.files, COLLAGE.poster]) {
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

  // Clear prior demo seeds + any leftover featured so Moments isn't mixed/duplicated
  await prisma.tableImage.deleteMany({
    where: {
      OR: [
        { caption: { startsWith: '[showcase]' } },
        { caption: { startsWith: '[ig]' } },
      ],
    },
  });
  await prisma.tableImage.updateMany({
    where: { featured: true },
    data: { featured: false },
  });

  let sort = 0;
  const reelTable = tables[0]!;
  await prisma.tableImage.create({
    data: {
      tableId: reelTable.id,
      uploadedById: reelTable.hostId,
      kind: 'VIDEO',
      url: publicUrl(REEL.file),
      posterUrl: publicUrl(REEL.poster),
      durationMs: REEL.durationMs,
      caption: `[ig] ${REEL.caption}`,
      featured: true,
      sortOrder: sort++,
      layout: {
        fit: 'contain',
        scale: 0.92,
        position: 'center center',
      },
    },
  });
  console.log('reel-only →', reelTable.title ?? reelTable.id, REEL.file);

  const collageTable = tables[1 % tables.length]!;
  const collageUrls = COLLAGE.files.map(publicUrl);
  const unique = new Set(collageUrls);
  if (unique.size !== collageUrls.length) {
    throw new Error('Collage seed has duplicate URLs');
  }
  if (unique.has(publicUrl(REEL.file))) {
    throw new Error('Collage overlaps reel media');
  }

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
        collage: { preset: 'masonry-9' },
      },
    },
  });
  console.log('collage-only →', collageTable.title ?? collageTable.id, {
    cells: collageUrls.length,
  });

  console.log('seeded-ig-featured-showcase-ok', {
    slides: sort,
    rule: 'reel=post only; collage=highlights only; no shared clips',
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
