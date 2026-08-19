/**
 * Run from apps/api so Prisma deps resolve:
 *   cd apps/api && npx --yes tsx ../../e2e/seed-interest-mix-user.ts <userId>
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

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: cd apps/api && npx tsx ../../e2e/seed-interest-mix-user.ts <userId>');
  process.exit(1);
}

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const peer =
    (await prisma.user.findFirst({
      where: { id: { not: userId }, status: 'ACTIVE' },
    })) ??
    (await prisma.user.create({
      data: {
        phone: `03${String(Date.now()).slice(-9)}`,
        email: `peer-${Date.now()}@example.test`,
        username: `peer_${String(Date.now()).slice(-6)}`,
        firstName: 'Peer',
        lastName: 'Reviewer',
      },
    }));

  const cafe = await prisma.cafe.findFirst();
  if (!cafe) throw new Error('No cafe — run db seed first');
  const cafeId = cafe.id;
  const cafeName = cafe.name;

  const startAt = new Date(Date.now() - 3 * 86400000);
  const completedAt = new Date(Date.now() - 2 * 86400000);

  async function mk(category: string, asHost: boolean) {
    const hostId = asHost ? userId! : peer.id;
    const guestId = asHost ? peer.id : userId!;
    const table = await prisma.table.create({
      data: {
        hostId,
        cafeId,
        venueName: cafeName,
        title: `Seed ${category}`,
        startAt,
        seats: 4,
        seatsLeft: 2,
        category,
        status: 'COMPLETED',
        completedAt,
      },
    });
    await prisma.tableJoinRequest.create({
      data: { tableId: table.id, userId: guestId, status: 'APPROVED' },
    });
    await prisma.review.create({
      data: {
        tableId: table.id,
        reviewerId: peer.id,
        subjectId: userId!,
        role: asHost ? 'HOST' : 'GUEST',
        rating: asHost ? 5 : 4,
      },
    });
  }

  await mk('Deep Talks', true);
  await mk('Coffee & Casual', false);
  await mk('Language Exchange,Networking', false);
  console.log('seeded-ok', userId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
