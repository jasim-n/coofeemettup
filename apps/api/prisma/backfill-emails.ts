import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const prisma = new PrismaClient({ adapter: new PrismaPg(url) });

const ADMIN_PHONE = '+923001112222';
const DOMAIN = 'coffeemeetups.dev';

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// Give every account without an email a deterministic, unique login email so
// the new email-OTP flow works. Admin gets the memorable admin@coffeemeetups.dev.
async function main(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { email: null },
    select: { id: true, phone: true, firstName: true, lastInitial: true },
    orderBy: { createdAt: 'asc' },
  });
  const taken = new Set(
    (await prisma.user.findMany({ where: { email: { not: null } }, select: { email: true } }))
      .map((u) => u.email!.toLowerCase()),
  );

  let n = 0;
  for (const u of users) {
    let email: string;
    if (u.phone === ADMIN_PHONE) {
      email = `admin@${DOMAIN}`;
    } else {
      const base = slug(`${u.firstName ?? 'member'}${u.lastInitial ?? ''}`) || 'member';
      email = `${base}@${DOMAIN}`;
      if (taken.has(email)) email = `${base}.${u.phone.slice(-4)}@${DOMAIN}`;
    }
    taken.add(email);
    await prisma.user.update({ where: { id: u.id }, data: { email } });
    n++;
  }
  console.log(`Backfilled ${n} user emails (admin => admin@${DOMAIN}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
