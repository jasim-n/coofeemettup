import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const prisma = new PrismaClient({ adapter: new PrismaPg(url) });

async function main(): Promise<void> {
  // Admin (log in with this phone; dev OTP is printed to the API console).
  const admin = await prisma.user.upsert({
    where: { phone: '+923001112222' },
    update: { role: 'ADMIN' },
    create: { phone: '+923001112222', role: 'ADMIN', firstName: 'Admin', lastInitial: 'A' },
  });

  // A few sample members for group-assignment testing.
  const sampleUsers = ['+923004445555', '+923006667777', '+923008889999'];
  for (const phone of sampleUsers) {
    await prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone, verificationStatus: 'VERIFIED' },
    });
  }

  // Cafes with real, distinct coordinates so the map shows spread-out pins.
  const cafes = [
    { id: 'seed-cafe-f7', name: 'Kohsar Coffee Co.', area: 'F-7', address: 'Kohsar Market, Islamabad', lat: 33.7296, lng: 73.0792 },
    { id: 'seed-cafe-bluearea', name: 'Blue Area Roasters', area: 'Blue Area', address: 'Jinnah Ave, Islamabad', lat: 33.7104, lng: 73.0656 },
    { id: 'seed-cafe-f6', name: 'Chai Khana F-6', area: 'F-6', address: 'Supermarket, F-6, Islamabad', lat: 33.7281, lng: 73.0851 },
    { id: 'seed-cafe-gulberg', name: 'Gulberg Grounds', area: 'Gulberg', address: 'MM Alam Rd, Lahore', lat: 31.517, lng: 74.348 },
  ];
  const capacity = 8;
  const base = Date.now();

  for (let i = 0; i < cafes.length; i++) {
    const c = cafes[i]!;
    await prisma.cafe.upsert({
      where: { id: c.id },
      update: { lat: c.lat, lng: c.lng },
      create: {
        id: c.id,
        name: c.name,
        area: c.area,
        address: c.address,
        lat: c.lat,
        lng: c.lng,
        deadHourSlots: ['Sat 15:00', 'Sun 15:00'],
        compTerms: 'One coffee/chai per attendee comped; group rate.',
      },
    });

    const startAt = new Date(base + (7 + i) * 24 * 60 * 60 * 1000);
    startAt.setHours(15, 0, 0, 0);
    const title = i === 0 ? 'Saturday Coffee — meet new people in F-7' : `Coffee meetup — ${c.area}`;
    await prisma.event.upsert({
      where: { id: `seed-event-${i + 1}` },
      // Reset to a clean OPEN demo state on re-seed.
      update: { seatsLeft: capacity, status: 'OPEN' },
      create: {
        id: `seed-event-${i + 1}`,
        cafeId: c.id,
        title,
        startAt,
        genderTrack: 'MIXED',
        area: c.area,
        capacity,
        pricePKR: 900,
        seatsLeft: capacity,
        status: 'OPEN',
      },
    });
  }

  console.log(
    `Seeded: admin=${admin.phone}, ${cafes.length} cafes + open events, ${sampleUsers.length} sample users`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
