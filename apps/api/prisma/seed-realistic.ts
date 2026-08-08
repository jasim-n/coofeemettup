import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const prisma = new PrismaClient({ adapter: new PrismaPg(url) });

const ADMIN_PHONE = '+923001112222';

// ── Existing sample users (phones from auth seeds) ──────────────────────────
const SAMPLE_PHONES = ['+923004445555', '+923006667777', '+923008889999'];

// ── 16 realistic members ─────────────────────────────────────────────────────
const MEMBERS = [
  {
    id: 'u-01',
    phone: '+923150000001',
    firstName: 'Ayesha',
    lastInitial: 'K',
    gender: 'WOMAN' as const,
    ageBand: '25-34',
    city: 'Islamabad',
    areas: ['F-7', 'F-6'],
    language: 'BOTH' as const,
    interests: ['Coffee', 'Books', 'Travel', 'Design'],
    lifeStage: 'PROFESSIONAL' as const,
    socialEnergy: 'INITIATOR' as const,
    intents: ['MAKE_FRIENDS' as const, 'NETWORKING' as const],
    beveragePref: 'COFFEE' as const,
    occupation: 'Product Designer',
    reliabilityScore: 97,
    canHost: true,
  },
  {
    id: 'u-02',
    phone: '+923150000002',
    firstName: 'Bilal',
    lastInitial: 'R',
    gender: 'MAN' as const,
    ageBand: '25-34',
    city: 'Islamabad',
    areas: ['G-9', 'Blue Area'],
    language: 'BOTH' as const,
    interests: ['Startups', 'Tech', 'Coffee', 'Photography'],
    lifeStage: 'BUSINESS_OWNER' as const,
    socialEnergy: 'MIX' as const,
    intents: ['NETWORKING' as const],
    beveragePref: 'COFFEE' as const,
    occupation: 'Founder',
    reliabilityScore: 95,
    canHost: true,
  },
  {
    id: 'u-03',
    phone: '+923150000003',
    firstName: 'Fatima',
    lastInitial: 'S',
    gender: 'WOMAN' as const,
    ageBand: '18-24',
    city: 'Islamabad',
    areas: ['F-7', 'E-11'],
    language: 'BOTH' as const,
    interests: ['Books', 'Writing', 'Film', 'Languages'],
    lifeStage: 'STUDENT' as const,
    socialEnergy: 'LISTENER' as const,
    intents: ['MAKE_FRIENDS' as const, 'PRACTICE_ENGLISH' as const],
    beveragePref: 'CHAI' as const,
    occupation: 'Student',
    reliabilityScore: 88,
    canHost: true,
  },
  {
    id: 'u-04',
    phone: '+923150000004',
    firstName: 'Hamza',
    lastInitial: 'A',
    gender: 'MAN' as const,
    ageBand: '25-34',
    city: 'Islamabad',
    areas: ['DHA', 'E-11'],
    language: 'BOTH' as const,
    interests: ['Tech', 'Fitness', 'Gaming', 'Coffee'],
    lifeStage: 'EARLY_CAREER' as const,
    socialEnergy: 'INITIATOR' as const,
    intents: ['MEET_OUTSIDE_BUBBLE' as const, 'NETWORKING' as const],
    beveragePref: 'COFFEE' as const,
    occupation: 'Software Engineer',
    reliabilityScore: 100,
    canHost: true,
  },
  {
    id: 'u-05',
    phone: '+923150000005',
    firstName: 'Zara',
    lastInitial: 'M',
    gender: 'WOMAN' as const,
    ageBand: '25-34',
    city: 'Lahore',
    areas: ['DHA', 'Bahria Town'],
    language: 'BOTH' as const,
    interests: ['Travel', 'Food', 'Photography', 'Music'],
    lifeStage: 'PROFESSIONAL' as const,
    socialEnergy: 'INITIATOR' as const,
    intents: ['MAKE_FRIENDS' as const],
    beveragePref: 'EITHER' as const,
    occupation: 'Journalist',
    reliabilityScore: 92,
    canHost: true,
  },
  {
    id: 'u-06',
    phone: '+923150000006',
    firstName: 'Usman',
    lastInitial: 'T',
    gender: 'MAN' as const,
    ageBand: '35-44',
    city: 'Islamabad',
    areas: ['F-6', 'Blue Area'],
    language: 'BOTH' as const,
    interests: ['Startups', 'Networking', 'Travel', 'Coffee'],
    lifeStage: 'BUSINESS_OWNER' as const,
    socialEnergy: 'MIX' as const,
    intents: ['NETWORKING' as const, 'MEET_OUTSIDE_BUBBLE' as const],
    beveragePref: 'COFFEE' as const,
    occupation: 'Entrepreneur',
    reliabilityScore: 90,
    canHost: true,
  },
  {
    id: 'u-07',
    phone: '+923150000007',
    firstName: 'Maryam',
    lastInitial: 'N',
    gender: 'WOMAN' as const,
    ageBand: '25-34',
    city: 'Islamabad',
    areas: ['F-7', 'G-9'],
    language: 'BOTH' as const,
    interests: ['Design', 'Books', 'Coffee', 'Film'],
    lifeStage: 'PROFESSIONAL' as const,
    socialEnergy: 'MIX' as const,
    intents: ['MAKE_FRIENDS' as const],
    beveragePref: 'COFFEE' as const,
    occupation: 'UX Researcher',
    reliabilityScore: 98,
    canHost: true,
  },
  {
    id: 'u-08',
    phone: '+923150000008',
    firstName: 'Ali',
    lastInitial: 'H',
    gender: 'MAN' as const,
    ageBand: '25-34',
    city: 'Rawalpindi',
    areas: ['Bahria Town', 'DHA'],
    language: 'URDU' as const,
    interests: ['Food', 'Music', 'Fitness', 'Photography'],
    lifeStage: 'EARLY_CAREER' as const,
    socialEnergy: 'INITIATOR' as const,
    intents: ['MEET_OUTSIDE_BUBBLE' as const],
    beveragePref: 'CHAI' as const,
    occupation: 'Photographer',
    reliabilityScore: 85,
    canHost: true,
  },
  {
    id: 'u-09',
    phone: '+923150000009',
    firstName: 'Sana',
    lastInitial: 'J',
    gender: 'WOMAN' as const,
    ageBand: '18-24',
    city: 'Islamabad',
    areas: ['F-7', 'E-11'],
    language: 'BOTH' as const,
    interests: ['Writing', 'Film', 'Languages', 'Books'],
    lifeStage: 'STUDENT' as const,
    socialEnergy: 'LISTENER' as const,
    intents: ['PRACTICE_ENGLISH' as const, 'MAKE_FRIENDS' as const],
    beveragePref: 'CHAI' as const,
    occupation: 'Content Writer',
    reliabilityScore: 87,
    canHost: false,
  },
  {
    id: 'u-10',
    phone: '+923150000010',
    firstName: 'Omar',
    lastInitial: 'F',
    gender: 'MAN' as const,
    ageBand: '25-34',
    city: 'Islamabad',
    areas: ['G-9', 'Blue Area'],
    language: 'ENGLISH' as const,
    interests: ['Tech', 'Startups', 'Gaming', 'Coffee'],
    lifeStage: 'PROFESSIONAL' as const,
    socialEnergy: 'MIX' as const,
    intents: ['NETWORKING' as const],
    beveragePref: 'COFFEE' as const,
    occupation: 'Data Scientist',
    reliabilityScore: 94,
    canHost: false,
  },
  {
    id: 'u-11',
    phone: '+923150000011',
    firstName: 'Hina',
    lastInitial: 'B',
    gender: 'WOMAN' as const,
    ageBand: '35-44',
    city: 'Karachi',
    areas: ['DHA', 'Bahria Town'],
    language: 'BOTH' as const,
    interests: ['Food', 'Travel', 'Books', 'Music'],
    lifeStage: 'PARENT' as const,
    socialEnergy: 'MIX' as const,
    intents: ['MAKE_FRIENDS' as const, 'NEW_TO_CITY' as const],
    beveragePref: 'CHAI' as const,
    occupation: 'Teacher',
    reliabilityScore: 96,
    canHost: false,
  },
  {
    id: 'u-12',
    phone: '+923150000012',
    firstName: 'Saad',
    lastInitial: 'Q',
    gender: 'MAN' as const,
    ageBand: '18-24',
    city: 'Islamabad',
    areas: ['F-6', 'F-7'],
    language: 'BOTH' as const,
    interests: ['Gaming', 'Tech', 'Film', 'Coffee'],
    lifeStage: 'STUDENT' as const,
    socialEnergy: 'INITIATOR' as const,
    intents: ['MEET_OUTSIDE_BUBBLE' as const],
    beveragePref: 'COFFEE' as const,
    occupation: 'Student',
    reliabilityScore: 82,
    canHost: false,
  },
  {
    id: 'u-13',
    phone: '+923150000013',
    firstName: 'Iqra',
    lastInitial: 'W',
    gender: 'WOMAN' as const,
    ageBand: '25-34',
    city: 'Islamabad',
    areas: ['E-11', 'G-9'],
    language: 'BOTH' as const,
    interests: ['Design', 'Photography', 'Coffee', 'Travel'],
    lifeStage: 'EARLY_CAREER' as const,
    socialEnergy: 'MIX' as const,
    intents: ['NETWORKING' as const, 'MAKE_FRIENDS' as const],
    beveragePref: 'COFFEE' as const,
    occupation: 'Marketer',
    reliabilityScore: 91,
    canHost: false,
  },
  {
    id: 'u-14',
    phone: '+923150000014',
    firstName: 'Danish',
    lastInitial: 'L',
    gender: 'MAN' as const,
    ageBand: '35-44',
    city: 'Islamabad',
    areas: ['Blue Area', 'F-6'],
    language: 'BOTH' as const,
    interests: ['Startups', 'Networking', 'Tech', 'Fitness'],
    lifeStage: 'BUSINESS_OWNER' as const,
    socialEnergy: 'INITIATOR' as const,
    intents: ['NETWORKING' as const],
    beveragePref: 'COFFEE' as const,
    occupation: 'Analyst',
    reliabilityScore: 99,
    canHost: false,
  },
  {
    id: 'u-15',
    phone: '+923150000015',
    firstName: 'Nida',
    lastInitial: 'Z',
    gender: 'WOMAN' as const,
    ageBand: '25-34',
    city: 'Lahore',
    areas: ['DHA', 'Bahria Town'],
    language: 'BOTH' as const,
    interests: ['Books', 'Writing', 'Languages', 'Film'],
    lifeStage: 'PROFESSIONAL' as const,
    socialEnergy: 'LISTENER' as const,
    intents: ['MAKE_FRIENDS' as const, 'PRACTICE_ENGLISH' as const],
    beveragePref: 'EITHER' as const,
    occupation: 'Architect',
    reliabilityScore: 93,
    canHost: false,
  },
  {
    id: 'u-16',
    phone: '+923150000016',
    firstName: 'Faizan',
    lastInitial: 'G',
    gender: 'MAN' as const,
    ageBand: '25-34',
    city: 'Islamabad',
    areas: ['G-9', 'F-7'],
    language: 'BOTH' as const,
    interests: ['Tech', 'Music', 'Food', 'Coffee'],
    lifeStage: 'EARLY_CAREER' as const,
    socialEnergy: 'MIX' as const,
    intents: ['MEET_OUTSIDE_BUBBLE' as const, 'MAKE_FRIENDS' as const],
    beveragePref: 'COFFEE' as const,
    occupation: 'Software Engineer',
    reliabilityScore: 89,
    canHost: false,
  },
];

// ── 10 user-hosted tables ─────────────────────────────────────────────────────
// rt-08, rt-09, rt-10 are PAST (before 2026-08-08); rt-01..rt-07 are upcoming
const TABLES = [
  {
    id: 'rt-01',
    hostKey: 'u-01',
    title: 'Startup Coffee Morning',
    category: 'Startups',
    venueName: 'Kohsar Coffee Co. F-7',
    lat: 33.7296,
    lng: 73.0792,
    startAt: new Date('2026-08-11T07:00:00.000Z'),
    seats: 8,
    pricePKR: 300,
    imageUrl: '/tables/t02.jpg',
    description: 'Early-stage founders and side-project builders sharing ideas over morning coffee.',
    status: 'OPEN' as const,
  },
  {
    id: 'rt-02',
    hostKey: 'u-02',
    title: 'Tech & Coffee Chat',
    category: 'Coffee & chill',
    venueName: 'Blue Area Roasters',
    lat: 33.71,
    lng: 73.055,
    startAt: new Date('2026-08-14T09:30:00.000Z'),
    seats: 6,
    pricePKR: null,
    imageUrl: '/tables/t04.jpg',
    description: 'Casual tech talk over specialty coffee — no presentations, just conversation.',
    status: 'OPEN' as const,
  },
  {
    id: 'rt-03',
    hostKey: 'u-03',
    title: 'Book Lovers Meetup',
    category: 'Books',
    venueName: 'Books n Beans F-7',
    lat: 33.72,
    lng: 73.07,
    startAt: new Date('2026-08-17T13:00:00.000Z'),
    seats: 6,
    pricePKR: null,
    imageUrl: '/tables/t03.jpg',
    description: 'Bring your current read and swap recommendations. All genres welcome.',
    status: 'OPEN' as const,
  },
  {
    id: 'rt-04',
    hostKey: 'u-04',
    title: 'Deep Talks Saturday',
    category: 'Deep talks',
    venueName: 'Analog Coffee E-11',
    lat: 33.7,
    lng: 72.97,
    startAt: new Date('2026-08-22T14:00:00.000Z'),
    seats: 5,
    pricePKR: 150,
    imageUrl: '/tables/t06.jpg',
    description: 'One big question, five people, two hours. Come ready to listen.',
    status: 'OPEN' as const,
  },
  {
    id: 'rt-05',
    hostKey: 'u-05',
    title: 'Language Exchange Brunch',
    category: 'Language exchange',
    venueName: 'Mocca Coffee F-6',
    lat: 33.718,
    lng: 73.064,
    startAt: new Date('2026-08-28T10:00:00.000Z'),
    seats: 8,
    pricePKR: 99,
    imageUrl: '/tables/t05.jpg',
    description: 'Urdu ↔ English practice in a relaxed brunch setting.',
    status: 'OPEN' as const,
  },
  {
    id: 'rt-06',
    hostKey: 'u-06',
    title: 'Freelancers Networking Chai',
    category: 'Networking',
    venueName: 'Chai Khana G-9',
    lat: 33.69,
    lng: 73.03,
    startAt: new Date('2026-09-04T15:00:00.000Z'),
    seats: 10,
    pricePKR: 500,
    imageUrl: '/tables/t10.jpg',
    description: 'Freelancers, consultants, and remote workers — connect and collaborate.',
    status: 'OPEN' as const,
  },
  {
    id: 'rt-07',
    hostKey: 'u-07',
    title: 'Board Games & Chai',
    category: 'Board games',
    venueName: 'The Coffee Club',
    lat: 33.6844,
    lng: 73.0479,
    startAt: new Date('2026-09-12T15:30:00.000Z'),
    seats: 8,
    pricePKR: 200,
    imageUrl: '/tables/t12.jpg',
    description: 'Catan, Codenames, and chai. All skill levels welcome.',
    status: 'OPEN' as const,
  },
  {
    id: 'rt-08',
    hostKey: 'u-01',
    title: 'Design Thinking Coffee',
    category: 'Deep talks',
    venueName: 'Rooftop Garden',
    lat: 33.7086,
    lng: 73.05,
    startAt: new Date('2026-07-28T08:00:00.000Z'),
    seats: 6,
    pricePKR: null,
    imageUrl: '/tables/t08.jpg',
    description: 'Designers and product folks sharing process, tools, and portfolio stories.',
    status: 'COMPLETED' as const,
  },
  {
    id: 'rt-09',
    hostKey: 'u-02',
    title: 'Founder Fireside',
    category: 'Startups',
    venueName: 'Blue Area Roasters',
    lat: 33.71,
    lng: 73.055,
    startAt: new Date('2026-07-30T06:00:00.000Z'),
    seats: 8,
    pricePKR: 300,
    imageUrl: '/tables/t13.jpg',
    description: 'Honest startup stories — the wins and the hard lessons.',
    status: 'COMPLETED' as const,
  },
  {
    id: 'rt-10',
    hostKey: 'u-08',
    title: 'Photography Walk & Chai',
    category: 'Coffee & chill',
    venueName: 'Kohsar Coffee Co. F-7',
    lat: 33.7296,
    lng: 73.0792,
    startAt: new Date('2026-08-02T05:00:00.000Z'),
    seats: 6,
    pricePKR: null,
    imageUrl: '/tables/t09.jpg',
    description: 'Short walk around F-7 with cameras, ending with chai and photo sharing.',
    status: 'COMPLETED' as const,
  },
];

// Participants per table: [tableId, [memberIds...]]
// Admin (resolved at runtime) is added to rt-01, rt-02, rt-03
const TABLE_MEMBER_GUESTS: Record<string, string[]> = {
  'rt-01': ['u-03', 'u-04', 'u-09', 'u-12'],        // 4 guests → seatsLeft = 8-5 (inc admin)=3
  'rt-02': ['u-05', 'u-07', 'u-10'],                 // 3 guests → seatsLeft = 6-4 (inc admin)=2
  'rt-03': ['u-08', 'u-11', 'u-13'],                 // 3 guests → seatsLeft = 6-4 (inc admin)=2
  'rt-04': ['u-05', 'u-09', 'u-13'],                 // 3 → seatsLeft=5-3=2
  'rt-05': ['u-03', 'u-06', 'u-10', 'u-14'],        // 4 → seatsLeft=8-4=4
  'rt-06': ['u-04', 'u-07', 'u-09', 'u-12', 'u-15'],// 5 → seatsLeft=10-5=5
  'rt-07': ['u-02', 'u-10', 'u-13'],                 // 3 → seatsLeft=8-3=5
  'rt-08': ['u-02', 'u-04', 'u-07', 'u-13'],        // 4 → seatsLeft=6-4=2 (past, completed)
  'rt-09': ['u-04', 'u-06', 'u-09', 'u-14', 'u-15'],// 5 → seatsLeft=8-5=3
  'rt-10': ['u-03', 'u-09', 'u-12'],                 // 3 → seatsLeft=6-3=3
};

// Review comments pool
const GUEST_REVIEW_COMMENTS = [
  'Really thoughtful host — kept the conversation flowing without dominating.',
  'Made everyone feel welcome from the start. Would sit at their table again.',
  'Chose a great venue and set a relaxed tone. Loved it.',
  'Warm, genuine, and a great listener. Perfect host energy.',
  'Great at introductions — everyone knew each other within ten minutes.',
];
const HOST_REVIEW_COMMENTS = [
  'Lovely guest — came prepared with interesting things to say.',
  'Brought great energy and made the group feel complete.',
  'Engaged and curious throughout. A pleasure to host.',
  'Punctual and kind. Would love to have them at a future table.',
  'Added real depth to the conversation. Five stars easily.',
];

async function main(): Promise<void> {
  // ── 0. Resolve admin ────────────────────────────────────────────────────────
  const admin = await prisma.user.findUnique({ where: { phone: ADMIN_PHONE } });
  if (!admin) throw new Error(`Admin user ${ADMIN_PHONE} not found — run the auth seed first.`);
  const adminId = admin.id;

  // ── 1. Upsert 16 members ────────────────────────────────────────────────────
  for (const m of MEMBERS) {
    const { id, phone, ...profile } = m;
    await prisma.user.upsert({
      where: { id },
      update: {
        phone,
        verificationStatus: 'VERIFIED',
        photoUrl: `/avatars/${id.replace('-', '')}.jpg`,
        ...profile,
      },
      create: {
        id,
        phone,
        verificationStatus: 'VERIFIED',
        photoUrl: `/avatars/${id.replace('-', '')}.jpg`,
        ...profile,
      },
    });
  }
  console.log('✓ 16 members upserted');

  // ── 2. Update 3 existing sample users ──────────────────────────────────────
  const samplePatches = [
    { phone: SAMPLE_PHONES[0], firstName: 'Kamran', lastInitial: 'A', city: 'Islamabad', photoUrl: '/avatars/u14.jpg' },
    { phone: SAMPLE_PHONES[1], firstName: 'Lubna',  lastInitial: 'S', city: 'Lahore',    photoUrl: '/avatars/u15.jpg' },
    { phone: SAMPLE_PHONES[2], firstName: 'Rashid', lastInitial: 'M', city: 'Islamabad', photoUrl: '/avatars/u16.jpg' },
  ];
  for (const p of samplePatches) {
    await prisma.user.updateMany({
      where: { phone: p.phone },
      data: { ...p, verificationStatus: 'VERIFIED' },
    });
  }
  console.log('✓ 3 sample users updated');

  // ── 3. Build hostId map ─────────────────────────────────────────────────────
  const hostIdMap: Record<string, string> = {};
  for (const m of MEMBERS) {
    hostIdMap[m.id] = m.id; // ids are the same as db ids in our seed
  }

  // ── 4. Upsert 10 tables ─────────────────────────────────────────────────────
  // Compute seatsLeft accounting for admin guests on rt-01..rt-03
  const adminGuestTables = new Set(['rt-01', 'rt-02', 'rt-03']);

  const tableSeatsLeft: Record<string, number> = {};
  for (const t of TABLES) {
    const memberGuests = TABLE_MEMBER_GUESTS[t.id] ?? [];
    const adminGuest = adminGuestTables.has(t.id) ? 1 : 0;
    tableSeatsLeft[t.id] = t.seats - memberGuests.length - adminGuest;
  }

  for (const t of TABLES) {
    const data = {
      hostId: t.hostKey, // hostKey = 'u-NN' which is the fixed id
      title: t.title,
      category: t.category,
      venueName: t.venueName,
      lat: t.lat,
      lng: t.lng,
      startAt: t.startAt,
      seats: t.seats,
      seatsLeft: Math.max(0, tableSeatsLeft[t.id] ?? 0),
      pricePKR: t.pricePKR,
      imageUrl: t.imageUrl,
      description: t.description,
      status: t.status,
    };
    await prisma.table.upsert({
      where: { id: t.id },
      update: data,
      create: { id: t.id, ...data },
    });
  }
  console.log('✓ 10 tables upserted');

  // ── 5. Upsert join requests ─────────────────────────────────────────────────
  for (const t of TABLES) {
    const members = TABLE_MEMBER_GUESTS[t.id] ?? [];
    const isPriced = (t.pricePKR ?? 0) > 0;

    for (const userId of members) {
      await prisma.tableJoinRequest.upsert({
        where: { tableId_userId: { tableId: t.id, userId } },
        update: {
          status: 'APPROVED',
          paymentStatus: isPriced ? 'PAID' : 'PENDING',
        },
        create: {
          tableId: t.id,
          userId,
          status: 'APPROVED',
          paymentStatus: isPriced ? 'PAID' : 'PENDING',
        },
      });
    }

    // Admin guest on rt-01, rt-02, rt-03
    if (adminGuestTables.has(t.id)) {
      const isPricedTable = (t.pricePKR ?? 0) > 0;
      await prisma.tableJoinRequest.upsert({
        where: { tableId_userId: { tableId: t.id, userId: adminId } },
        update: {
          status: 'APPROVED',
          paymentStatus: isPricedTable ? 'PAID' : 'PENDING',
        },
        create: {
          tableId: t.id,
          userId: adminId,
          status: 'APPROVED',
          paymentStatus: isPricedTable ? 'PAID' : 'PENDING',
        },
      });
    }
  }
  console.log('✓ Join requests upserted');

  // ── 6. Reviews for past tables (rt-08, rt-09, rt-10) ───────────────────────
  const pastTableDefs = [
    { id: 'rt-08', hostKey: 'u-01' },
    { id: 'rt-09', hostKey: 'u-02' },
    { id: 'rt-10', hostKey: 'u-08' },
  ];

  for (const pt of pastTableDefs) {
    const guests = TABLE_MEMBER_GUESTS[pt.id] ?? [];
    let commentIdx = 0;

    for (const guestId of guests) {
      // Guest reviews host
      await prisma.review.upsert({
        where: { tableId_reviewerId_subjectId: { tableId: pt.id, reviewerId: guestId, subjectId: pt.hostKey } },
        update: {},
        create: {
          tableId: pt.id,
          reviewerId: guestId,
          subjectId: pt.hostKey,
          role: 'HOST',
          rating: commentIdx % 2 === 0 ? 5 : 4,
          comment: GUEST_REVIEW_COMMENTS[commentIdx % GUEST_REVIEW_COMMENTS.length],
        },
      });
      commentIdx++;

      // Host reviews guest
      await prisma.review.upsert({
        where: { tableId_reviewerId_subjectId: { tableId: pt.id, reviewerId: pt.hostKey, subjectId: guestId } },
        update: {},
        create: {
          tableId: pt.id,
          reviewerId: pt.hostKey,
          subjectId: guestId,
          role: 'GUEST',
          rating: 5,
          comment: HOST_REVIEW_COMMENTS[commentIdx % HOST_REVIEW_COMMENTS.length],
        },
      });
      commentIdx++;
    }
  }
  console.log('✓ Reviews upserted');

  // ── 7. Connections ──────────────────────────────────────────────────────────
  // Admin ACCEPTED with u-01..u-06
  for (const uid of ['u-01', 'u-02', 'u-03', 'u-04', 'u-05', 'u-06']) {
    await prisma.connection.upsert({
      where: { requesterId_addresseeId: { requesterId: adminId, addresseeId: uid } },
      update: { status: 'ACCEPTED' },
      create: { requesterId: adminId, addresseeId: uid, status: 'ACCEPTED' },
    });
  }

  // PENDING incoming to admin from u-07, u-08, u-09
  for (const uid of ['u-07', 'u-08', 'u-09']) {
    await prisma.connection.upsert({
      where: { requesterId_addresseeId: { requesterId: uid, addresseeId: adminId } },
      update: { status: 'PENDING' },
      create: { requesterId: uid, addresseeId: adminId, status: 'PENDING' },
    });
  }

  // ACCEPTED among members
  const memberPairs: Array<[string, string]> = [
    ['u-01', 'u-02'],
    ['u-01', 'u-03'],
    ['u-02', 'u-03'],
    ['u-04', 'u-05'],
    ['u-04', 'u-06'],
    ['u-05', 'u-06'],
    ['u-07', 'u-08'],
    ['u-09', 'u-10'],
    ['u-11', 'u-12'],
    ['u-13', 'u-14'],
  ];
  for (const [req, addr] of memberPairs) {
    await prisma.connection.upsert({
      where: { requesterId_addresseeId: { requesterId: req, addresseeId: addr } },
      update: { status: 'ACCEPTED' },
      create: { requesterId: req, addresseeId: addr, status: 'ACCEPTED' },
    });
  }
  console.log('✓ Connections upserted');

  // ── 8. Notifications for admin ──────────────────────────────────────────────
  const notifications = [
    {
      id: 'n-01',
      userId: adminId,
      type: 'table.join.request',
      title: 'Ayesha K requested to join Founders Brew',
      body: 'Review her profile and approve or decline.',
      meta: { tableId: 'rt-01' },
    },
    {
      id: 'n-02',
      userId: adminId,
      type: 'review.received',
      title: 'You got a new 5★ review',
      body: 'Bilal R left you a review from Design Thinking Coffee.',
      meta: { tableId: 'rt-08' },
    },
    {
      id: 'n-03',
      userId: adminId,
      type: 'connection.accepted',
      title: 'Bilal R accepted your connection',
      body: 'You and Bilal R are now connected.',
      meta: { userId: 'u-02' },
    },
    {
      id: 'n-04',
      userId: adminId,
      type: 'table.invite',
      title: 'Sana J invited you to Deep Talks Saturday',
      body: 'You have a pending invite — accept or decline.',
      meta: { tableId: 'rt-04' },
    },
    {
      id: 'n-05',
      userId: adminId,
      type: 'table.join.approved',
      title: "You're in: Startup Coffee Morning",
      body: 'Your request to join Startup Coffee Morning was approved.',
      meta: { tableId: 'rt-01' },
    },
  ];

  for (const n of notifications) {
    await prisma.notification.upsert({
      where: { id: n.id },
      update: n,
      create: n,
    });
  }
  console.log('✓ Notifications upserted');

  // ── 9. TableInvite: u-01 → admin for rt-04 ─────────────────────────────────
  await prisma.tableInvite.upsert({
    where: { tableId_inviteeId: { tableId: 'rt-04', inviteeId: adminId } },
    update: { status: 'PENDING' },
    create: {
      tableId: 'rt-04',
      inviterId: 'u-01',
      inviteeId: adminId,
      status: 'PENDING',
    },
  });
  console.log('✓ TableInvite upserted');

  // ── 10. DirectMessages between admin and u-01 ───────────────────────────────
  const dms = [
    {
      id: 'dm-01',
      senderId: 'u-01',
      recipientId: adminId,
      body: 'Hey! Loved the startup discussion yesterday. Would you want to co-host something next month?',
    },
    {
      id: 'dm-02',
      senderId: adminId,
      recipientId: 'u-01',
      body: 'That sounds great! I was thinking a smaller evening session — maybe 6 people max.',
    },
    {
      id: 'dm-03',
      senderId: 'u-01',
      recipientId: adminId,
      body: 'Perfect. How about the Rooftop Garden? The evening light there is beautiful.',
    },
    {
      id: 'dm-04',
      senderId: adminId,
      recipientId: 'u-01',
      body: "Agreed! Let's lock in a date. Early September works for me — I'll send a draft.",
    },
  ];

  for (const dm of dms) {
    await prisma.directMessage.upsert({
      where: { id: dm.id },
      update: dm,
      create: dm,
    });
  }
  console.log('✓ DirectMessages upserted');

  // ── Summary ──────────────────────────────────────────────────────────────────
  const counts = await Promise.all([
    prisma.user.count(),
    prisma.table.count(),
    prisma.tableJoinRequest.count(),
    prisma.review.count(),
    prisma.connection.count(),
    prisma.notification.count(),
    prisma.tableInvite.count(),
    prisma.directMessage.count(),
  ]);
  console.log(`
╔══════════════════════════════════════╗
║  seed-realistic summary              ║
╠══════════════════════════════════════╣
║  Users total           : ${String(counts[0]).padStart(5)}       ║
║  Tables total          : ${String(counts[1]).padStart(5)}       ║
║  Join requests total   : ${String(counts[2]).padStart(5)}       ║
║  Reviews total         : ${String(counts[3]).padStart(5)}       ║
║  Connections total     : ${String(counts[4]).padStart(5)}       ║
║  Notifications (admin) : ${String(counts[5]).padStart(5)}       ║
║  Table invites total   : ${String(counts[6]).padStart(5)}       ║
║  Direct messages total : ${String(counts[7]).padStart(5)}       ║
╚══════════════════════════════════════╝`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
