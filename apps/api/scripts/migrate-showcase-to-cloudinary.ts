/**
 * Upload local `apps/web/public/showcase/*` to Cloudinary and rewrite DB URLs
 * that still point at `/showcase/...` (those files are gitignored and 404 in prod).
 *
 *   cd apps/api && npx --yes tsx scripts/migrate-showcase-to-cloudinary.ts
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
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

const SHOWCASE_DIR = path.resolve(process.cwd(), '../../apps/web/public/showcase');
const MAP_PATH = path.resolve(process.cwd(), 'scripts/showcase-cloudinary-map.json');
const FOLDER = 'showcase';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error('CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET required');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

type UrlMap = Record<string, string>;

function isVideo(file: string): boolean {
  return /\.(mp4|webm|mov)$/i.test(file);
}

async function uploadFile(file: string, map: UrlMap): Promise<string> {
  if (map[file]) {
    console.log('cached', file);
    return map[file]!;
  }

  const full = path.join(SHOWCASE_DIR, file);
  const buffer = readFileSync(full);
  const resource = isVideo(file) ? 'video' : 'image';
  const publicId = file.replace(/\.[^.]+$/, '');

  const timestamp = Math.floor(Date.now() / 1000);
  // overwrite=true so re-runs replace the same public_id
  const signStr = `folder=${FOLDER}&overwrite=true&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash('sha1').update(signStr).digest('hex');

  const form = new FormData();
  form.append('file', new Blob([buffer]), file);
  form.append('api_key', apiKey!);
  form.append('timestamp', String(timestamp));
  form.append('folder', FOLDER);
  form.append('public_id', publicId);
  form.append('overwrite', 'true');
  form.append('signature', signature);

  console.log('uploading', file, `(${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resource}/upload`,
    { method: 'POST', body: form },
  );
  const data = (await res.json()) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok || !data.secure_url) {
    throw new Error(`Cloudinary upload failed for ${file}: ${JSON.stringify(data)}`);
  }
  map[file] = data.secure_url;
  console.log('  →', data.secure_url);
  return data.secure_url;
}

function rewriteLocalPath(url: string | null | undefined, map: UrlMap): string | null {
  if (!url) return null;
  if (!url.startsWith('/showcase/')) return url;
  const file = url.slice('/showcase/'.length);
  const mapped = map[file];
  if (!mapped) {
    throw new Error(`No Cloudinary URL for ${file} (referenced as ${url})`);
  }
  return mapped;
}

async function main() {
  if (!existsSync(SHOWCASE_DIR)) {
    throw new Error(`Missing showcase dir: ${SHOWCASE_DIR}`);
  }

  const map: UrlMap = existsSync(MAP_PATH)
    ? (JSON.parse(readFileSync(MAP_PATH, 'utf8')) as UrlMap)
    : {};

  const files = readdirSync(SHOWCASE_DIR).filter(
    (f) => /\.(mp4|webm|mov|jpe?g|png|webp)$/i.test(f),
  );
  if (files.length === 0) throw new Error('No showcase media files found');

  for (const file of files) {
    await uploadFile(file, map);
  }
  writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + '\n');
  console.log('wrote map', MAP_PATH, Object.keys(map).length, 'entries');

  const rows = await prisma.tableImage.findMany({
    where: {
      OR: [
        { url: { startsWith: '/showcase/' } },
        { posterUrl: { startsWith: '/showcase/' } },
      ],
    },
  });

  // Also catch collageUrls containing local paths (Prisma JSON filter is awkward — scan all featured)
  const maybeCollage = await prisma.tableImage.findMany({
    where: { kind: 'COLLAGE' },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const r of maybeCollage) {
    if (r.collageUrls.some((u) => u.startsWith('/showcase/'))) byId.set(r.id, r);
  }

  console.log('DB rows to rewrite', byId.size);
  for (const row of byId.values()) {
    const url = rewriteLocalPath(row.url, map)!;
    const posterUrl = rewriteLocalPath(row.posterUrl, map);
    const collageUrls = row.collageUrls.map((u) => rewriteLocalPath(u, map)!);
    await prisma.tableImage.update({
      where: { id: row.id },
      data: { url, posterUrl, collageUrls },
    });
    console.log('updated', row.id, row.kind);
  }

  const left = await prisma.tableImage.count({
    where: {
      OR: [
        { url: { startsWith: '/showcase/' } },
        { posterUrl: { startsWith: '/showcase/' } },
      ],
    },
  });
  console.log('remaining /showcase/ urls', left);
  console.log('migrate-showcase-to-cloudinary-ok');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
