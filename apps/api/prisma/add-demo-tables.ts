import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const prisma = new PrismaClient({ adapter: new PrismaPg(url) });

// Upcoming demo tables (Aug–Sep 2026) hosted by the admin, each with a distinct
// bundled café/coffee cover image (apps/web/public/tables/*.jpg). Idempotent:
// fixed ids so re-running updates rather than duplicates.
const ADMIN_PHONE = '+923001112222';

type Row = {
  id: string;
  title: string;
  category: string;
  venueName: string;
  lat: number;
  lng: number;
  startAt: string;
  seats: number;
  seatsLeft: number;
  pricePKR: number | null;
  image: string;
  description: string;
};

const ROWS: Row[] = [
  { id: 'demo-01', title: 'Morning Espresso Club', category: 'Coffee & chill', venueName: 'Mocca Coffee, F-6', lat: 33.718, lng: 73.064, startAt: '2026-08-10T04:00:00.000Z', seats: 6, seatsLeft: 4, pricePKR: null, image: '/tables/t08.jpg', description: 'Start the day with a slow espresso and easy conversation.' },
  { id: 'demo-02', title: 'Philosophy & Coffee', category: 'Deep talks', venueName: 'Rooftop Garden', lat: 33.7086, lng: 73.05, startAt: '2026-08-12T14:30:00.000Z', seats: 6, seatsLeft: 5, pricePKR: 199, image: '/tables/t06.jpg', description: 'Big questions, small group, good coffee.' },
  { id: 'demo-03', title: 'Founders Brew', category: 'Startups', venueName: 'Blue Area Roasters', lat: 33.71, lng: 73.055, startAt: '2026-08-14T03:00:00.000Z', seats: 8, seatsLeft: 6, pricePKR: 500, image: '/tables/t04.jpg', description: 'Early-stage founders swap notes over pour-overs.' },
  { id: 'demo-04', title: 'Urdu–English Exchange', category: 'Language exchange', venueName: 'Kohsar Coffee Co., F-7', lat: 33.7296, lng: 73.0792, startAt: '2026-08-16T13:30:00.000Z', seats: 8, seatsLeft: 3, pricePKR: 99, image: '/tables/t05.jpg', description: 'Practice both languages with friendly locals.' },
  { id: 'demo-05', title: 'Fiction Book Club', category: 'Books', venueName: 'Books n Beans, F-7', lat: 33.72, lng: 73.07, startAt: '2026-08-18T14:00:00.000Z', seats: 6, seatsLeft: 4, pricePKR: null, image: '/tables/t03.jpg', description: "This month: a modern short-story collection." },
  { id: 'demo-06', title: 'Founders & Freelancers Mixer', category: 'Networking', venueName: 'The Coffee Club', lat: 33.6844, lng: 73.0479, startAt: '2026-08-20T13:00:00.000Z', seats: 10, seatsLeft: 7, pricePKR: 300, image: '/tables/t10.jpg', description: 'Meet people building things around the city.' },
  { id: 'demo-07', title: 'Sunday Slow Coffee', category: 'Coffee & chill', venueName: 'Analog Coffee, E-11', lat: 33.7, lng: 72.97, startAt: '2026-08-23T05:30:00.000Z', seats: 6, seatsLeft: 6, pricePKR: null, image: '/tables/t11.jpg', description: 'No agenda — just a relaxed Sunday brew.' },
  { id: 'demo-08', title: 'Late Night Conversations', category: 'Deep talks', venueName: 'Chai Khana, G-9', lat: 33.69, lng: 73.03, startAt: '2026-08-26T16:00:00.000Z', seats: 6, seatsLeft: 2, pricePKR: 149, image: '/tables/t01.jpg', description: 'Wind down with chai and honest talk.' },
  { id: 'demo-09', title: 'Pitch & Sip', category: 'Startups', venueName: 'Daftarkhwan, F-7', lat: 33.725, lng: 73.075, startAt: '2026-08-29T05:00:00.000Z', seats: 8, seatsLeft: 5, pricePKR: 500, image: '/tables/t13.jpg', description: 'Two-minute pitches, honest feedback, good coffee.' },
  { id: 'demo-10', title: 'Latte Art Morning', category: 'Coffee & chill', venueName: 'Mocca Coffee, F-6', lat: 33.718, lng: 73.064, startAt: '2026-09-02T04:30:00.000Z', seats: 5, seatsLeft: 4, pricePKR: 250, image: '/tables/t07.jpg', description: 'Watch (and try) some latte art over breakfast.' },
  { id: 'demo-11', title: 'Français & Coffee', category: 'Language exchange', venueName: 'Kohsar Coffee Co., F-7', lat: 33.7296, lng: 73.0792, startAt: '2026-09-05T14:00:00.000Z', seats: 6, seatsLeft: 5, pricePKR: 99, image: '/tables/t16.jpg', description: 'Beginner-friendly French practice over coffee.' },
  { id: 'demo-12', title: 'Designers Coffee', category: 'Networking', venueName: 'Blue Area Roasters', lat: 33.71, lng: 73.055, startAt: '2026-09-08T13:30:00.000Z', seats: 8, seatsLeft: 6, pricePKR: null, image: '/tables/t15.jpg', description: 'Product & UX folks trading work and coffee.' },
  { id: 'demo-13', title: 'Board Games & Brews', category: 'Board games', venueName: 'The Coffee Club', lat: 33.6844, lng: 73.0479, startAt: '2026-09-12T13:00:00.000Z', seats: 8, seatsLeft: 7, pricePKR: 200, image: '/tables/t12.jpg', description: 'Catan, Codenames and cappuccinos.' },
  { id: 'demo-14', title: 'Weekend Wind-down', category: 'Coffee & chill', venueName: 'Rooftop Garden', lat: 33.7086, lng: 73.05, startAt: '2026-09-18T14:30:00.000Z', seats: 6, seatsLeft: 4, pricePKR: null, image: '/tables/t09.jpg', description: 'Close out the week with a calm evening coffee.' },
];

async function main(): Promise<void> {
  const admin = await prisma.user.update({
    where: { phone: ADMIN_PHONE },
    data: { canHost: true, photoUrl: '/avatars/admin.jpg' },
  });
  for (const r of ROWS) {
    const data = {
      hostId: admin.id,
      title: r.title,
      category: r.category,
      venueName: r.venueName,
      lat: r.lat,
      lng: r.lng,
      startAt: new Date(r.startAt),
      seats: r.seats,
      seatsLeft: r.seatsLeft,
      pricePKR: r.pricePKR,
      imageUrl: r.image,
      description: r.description,
      status: 'OPEN' as const,
    };
    await prisma.table.upsert({ where: { id: r.id }, update: data, create: { id: r.id, ...data } });
  }
  console.log(`Seeded ${ROWS.length} demo tables; admin photo set (${admin.phone}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
