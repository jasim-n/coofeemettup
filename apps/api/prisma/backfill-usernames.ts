import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const prisma = new PrismaClient({ adapter: new PrismaPg(url) });

// Handle format enforced everywhere: lowercase letters, digits, underscore, 3-20.
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9_]/g, '');

// Give every account without a handle a deterministic, unique @username so the
// public identity works before they pick their own. Derived from email
// local-part → firstName → 'member', deduped with a numeric suffix.
async function main(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { username: null },
    select: { id: true, email: true, firstName: true, phone: true },
    orderBy: { createdAt: 'asc' },
  });
  const taken = new Set(
    (await prisma.user.findMany({ where: { username: { not: null } }, select: { username: true } }))
      .map((u) => u.username!.toLowerCase()),
  );

  let n = 0;
  for (const u of users) {
    const localPart = u.email ? u.email.split('@')[0] : '';
    let base = slug(localPart) || slug(u.firstName ?? '') || 'member';
    if (base.length < 3) base = `${base}${u.phone.slice(-4)}`; // pad short bases
    base = base.slice(0, 20);

    let handle = base;
    let i = 1;
    while (taken.has(handle)) {
      const suffix = String(i++);
      handle = `${base.slice(0, 20 - suffix.length)}${suffix}`;
    }
    taken.add(handle);
    await prisma.user.update({ where: { id: u.id }, data: { username: handle } });
    n++;
  }
  console.log(`Backfilled ${n} usernames.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
