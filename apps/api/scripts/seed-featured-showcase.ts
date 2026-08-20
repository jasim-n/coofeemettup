/**
 * Amend Featured Moments — ADD slides, never delete existing [ig] rows.
 *
 * Ensures:
 *   - Existing reel (memories) + masonry collage stay
 *   - Restores older EVENT P3 reel
 *   - Adds new reels + a small secondary collage
 *
 *   cd apps/api && npx --yes tsx scripts/seed-featured-showcase.ts
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '../generated/prisma/client';

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

type SlideSeed = {
  key: string; // stable marker inside caption after [ig]
  kind: 'VIDEO' | 'COLLAGE';
  url: string;
  collageUrls?: string[];
  posterUrl?: string;
  durationMs?: number;
  caption: string;
  layout: Prisma.InputJsonValue;
};

function publicUrl(file: string): string {
  return `/showcase/${file}`;
}

const SLIDES: SlideSeed[] = [
  // Existing — keep / re-feature if present
  {
    key: 'memories-reel',
    kind: 'VIDEO',
    url: publicUrl('minglers-memories.mp4'),
    posterUrl: publicUrl('minglers-memories.jpg'),
    durationMs: 15_000,
    caption: '[ig] While everyone was scrolling… we were making memories',
    layout: { fit: 'contain', scale: 0.92, position: 'center center' },
  },
  {
    key: 'masonry-collage',
    kind: 'COLLAGE',
    url: publicUrl('minglers-collage-01.mp4'),
    collageUrls: [
      publicUrl('minglers-collage-02.mp4'),
      publicUrl('minglers-collage-03.mp4'),
      publicUrl('minglers-collage-04.mp4'),
      publicUrl('minglers-collage-05.mp4'),
      publicUrl('minglers-collage-06.mp4'),
      publicUrl('minglers-collage-07.mp4'),
      publicUrl('minglers-collage-08.mp4'),
      publicUrl('minglers-collage-09.mp4'),
    ],
    posterUrl: publicUrl('minglers-collage-01.jpg'),
    caption: '[ig] Meetup moments — masonry collage',
    layout: {
      fit: 'cover',
      scale: 1,
      position: 'center center',
      collage: { preset: 'masonry-9' },
    },
  },
  // Old content restored
  {
    key: 'event-p3-reel',
    kind: 'VIDEO',
    url: publicUrl('minglers-event-p3.mp4'),
    posterUrl: publicUrl('minglers-event-p3.jpg'),
    durationMs: 12_000,
    caption: '[ig] EVENT P3 — table energy from the night',
    layout: { fit: 'contain', scale: 0.92, position: 'center center' },
  },
  // New content (unique clips not used in masonry collage or the memories reel)
  {
    key: 'extra-reel-1',
    kind: 'VIDEO',
    url: publicUrl('minglers-reel-extra-1.mp4'),
    posterUrl: publicUrl('minglers-reel-extra-1.jpg'),
    durationMs: 10_000,
    caption: '[ig] More from the tables — night vibes',
    layout: { fit: 'contain', scale: 0.9, position: 'center center' },
  },
  {
    key: 'extra-reel-2',
    kind: 'VIDEO',
    url: publicUrl('minglers-reel-extra-2.mp4'),
    posterUrl: publicUrl('minglers-reel-extra-2.jpg'),
    durationMs: 10_000,
    caption: '[ig] Catch-up energy between rounds',
    layout: { fit: 'contain', scale: 0.9, position: 'center top' },
  },
];

async function main() {
  const neededFiles = [
    'minglers-memories.mp4',
    'minglers-memories.jpg',
    'minglers-event-p3.mp4',
    'minglers-event-p3.jpg',
    'minglers-reel-extra-1.mp4',
    'minglers-reel-extra-1.jpg',
    'minglers-reel-extra-2.mp4',
    'minglers-reel-extra-2.jpg',
    ...Array.from({ length: 9 }, (_, i) => `minglers-collage-${String(i + 1).padStart(2, '0')}.mp4`),
    'minglers-collage-01.jpg',
  ];
  for (const f of neededFiles) {
    if (!existsSync(path.join(SHOWCASE_DIR, f))) {
      throw new Error(`Missing showcase asset: ${f}`);
    }
  }

  const tables = await prisma.table.findMany({
    where: { status: { in: ['OPEN', 'FULL', 'COMPLETED'] } },
    orderBy: { startAt: 'desc' },
    take: 8,
    select: { id: true, hostId: true, title: true },
  });
  if (tables.length === 0) {
    throw new Error('No tables found — create a few meetups first');
  }

  const existing = await prisma.tableImage.findMany({
    where: { caption: { startsWith: '[ig]' } },
    select: { id: true, url: true, caption: true, featured: true, sortOrder: true },
  });

  const maxSort = existing.reduce((m, r) => Math.max(m, r.sortOrder), -1);
  let nextSort = maxSort + 1;
  let tableIdx = 0;

  for (const slide of SLIDES) {
    const match = existing.find(
      (e) => e.url === slide.url || e.caption === slide.caption,
    );
    if (match) {
      // Amend in place — never delete; ensure featured + layout stay current
      await prisma.tableImage.update({
        where: { id: match.id },
        data: {
          featured: true,
          kind: slide.kind,
          posterUrl: slide.posterUrl ?? null,
          durationMs: slide.durationMs ?? null,
          collageUrls: slide.collageUrls ?? [],
          caption: slide.caption,
          layout: slide.layout,
        },
      });
      console.log('kept/amended →', slide.key, match.id);
      continue;
    }

    const table = tables[tableIdx % tables.length]!;
    tableIdx += 1;
    await prisma.tableImage.create({
      data: {
        tableId: table.id,
        uploadedById: table.hostId,
        kind: slide.kind,
        url: slide.url,
        collageUrls: slide.collageUrls ?? [],
        posterUrl: slide.posterUrl ?? null,
        durationMs: slide.durationMs ?? null,
        caption: slide.caption,
        featured: true,
        sortOrder: nextSort++,
        layout: slide.layout,
      },
    });
    console.log('added →', slide.key, 'on', table.title ?? table.id);
  }

  const featured = await prisma.tableImage.count({ where: { featured: true } });
  console.log('amend-featured-showcase-ok', { featured });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
