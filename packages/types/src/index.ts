// Shared contract types for web + mobile clients.
// Enum string values mirror the API's Prisma enums exactly (structurally compatible).

export const Role = {
  USER: 'USER',
  ORGANIZER: 'ORGANIZER',
  ADMIN: 'ADMIN',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const Gender = {
  WOMAN: 'WOMAN',
  MAN: 'MAN',
  UNDISCLOSED: 'UNDISCLOSED',
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const GenderTrack = {
  WOMEN_ONLY: 'WOMEN_ONLY',
  MEN_ONLY: 'MEN_ONLY',
  MIXED: 'MIXED',
} as const;
export type GenderTrack = (typeof GenderTrack)[keyof typeof GenderTrack];

export const VerificationStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
} as const;
export type VerificationStatus =
  (typeof VerificationStatus)[keyof typeof VerificationStatus];

export const Language = {
  URDU: 'URDU',
  ENGLISH: 'ENGLISH',
  BOTH: 'BOTH',
} as const;
export type Language = (typeof Language)[keyof typeof Language];

export const LifeStage = {
  STUDENT: 'STUDENT',
  EARLY_CAREER: 'EARLY_CAREER',
  PROFESSIONAL: 'PROFESSIONAL',
  BUSINESS_OWNER: 'BUSINESS_OWNER',
  PARENT: 'PARENT',
  OTHER: 'OTHER',
} as const;
export type LifeStage = (typeof LifeStage)[keyof typeof LifeStage];

export const SocialEnergy = {
  LISTENER: 'LISTENER',
  MIX: 'MIX',
  INITIATOR: 'INITIATOR',
} as const;
export type SocialEnergy = (typeof SocialEnergy)[keyof typeof SocialEnergy];

export const Intent = {
  MAKE_FRIENDS: 'MAKE_FRIENDS',
  MEET_OUTSIDE_BUBBLE: 'MEET_OUTSIDE_BUBBLE',
  NETWORKING: 'NETWORKING',
  NEW_TO_CITY: 'NEW_TO_CITY',
  PRACTICE_ENGLISH: 'PRACTICE_ENGLISH',
} as const;
export type Intent = (typeof Intent)[keyof typeof Intent];

export const BeveragePref = {
  COFFEE: 'COFFEE',
  CHAI: 'CHAI',
  EITHER: 'EITHER',
} as const;
export type BeveragePref = (typeof BeveragePref)[keyof typeof BeveragePref];

export const EventStatus = {
  DRAFT: 'DRAFT',
  OPEN: 'OPEN',
  FULL: 'FULL',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
} as const;
export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];

export const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  REFUNDED: 'REFUNDED',
  FAILED: 'FAILED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const AttendanceStatus = {
  BOOKED: 'BOOKED',
  ATTENDED: 'ATTENDED',
  NO_SHOW: 'NO_SHOW',
} as const;
export type AttendanceStatus =
  (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

export const BookingStatus = {
  ACTIVE: 'ACTIVE',
  WAITLISTED: 'WAITLISTED',
  CANCELLED: 'CANCELLED',
} as const;
export type BookingStatus =
  (typeof BookingStatus)[keyof typeof BookingStatus];

export interface PublicUser {
  id: string;
  phone: string;
  role: Role;
  verificationStatus: VerificationStatus;
  reliabilityScore: number;
  firstName: string | null;
  lastInitial: string | null;
  ageBand: string | null;
  gender: Gender | null;
  city: string | null;
  areas: string[];
  language: Language | null;
  availability: string[];
  interests: string[];
  lifeStage: LifeStage | null;
  socialEnergy: SocialEnergy | null;
  intents: Intent[];
  newcomerStatus: string | null;
  beveragePref: BeveragePref | null;
  accessibilityNeeds: string | null;
  photoConsent: boolean;
  codeOfConductAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: PublicUser;
  csrfToken: string;
  /** Bearer token — only returned to native (mobile) clients. */
  token?: string;
}

export interface Cafe {
  id: string;
  name: string;
  area: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  deadHourSlots: string[];
  compTerms: string | null;
  _count?: { events: number };
}

export interface CreateCafeInput {
  name: string;
  area: string;
  address?: string;
  lat?: number;
  lng?: number;
  deadHourSlots?: string[];
  compTerms?: string;
}

export type UpdateCafeInput = Partial<CreateCafeInput>;

export interface EventDto {
  id: string;
  cafeId: string;
  title: string | null;
  startAt: string;
  genderTrack: GenderTrack;
  area: string;
  capacity: number;
  pricePKR: number;
  seatsLeft: number;
  status: EventStatus;
  cafe?: Cafe;
  _count?: { bookings: number };
}

export interface BookingDto {
  id: string;
  userId: string;
  eventId: string;
  paymentStatus: PaymentStatus;
  attendanceStatus: AttendanceStatus;
  status: BookingStatus;
  amountPKR: number;
  paymentRef: string | null;
  cancelledAt: string | null;
  waitlistedAt: string | null;
  createdAt: string;
  event?: EventDto;
}

export interface BookingWithUser extends BookingDto {
  user: PublicUser;
}

export interface GroupDto {
  id: string;
  eventId: string;
  userIds: string[];
  matchScore: number | null;
  algoVersion: string;
  createdAt: string;
}

export interface CreateEventInput {
  cafeId: string;
  title?: string;
  startAt: string;
  genderTrack: GenderTrack;
  area: string;
  capacity: number;
  pricePKR: number;
}

export interface UpdateProfileInput {
  firstName?: string;
  lastInitial?: string;
  ageBand?: string;
  gender?: Gender;
  city?: string;
  areas?: string[];
  language?: Language;
  availability?: string[];
  interests?: string[];
  lifeStage?: LifeStage;
  socialEnergy?: SocialEnergy;
  intents?: Intent[];
  newcomerStatus?: string;
  beveragePref?: BeveragePref;
  accessibilityNeeds?: string;
  photoConsent?: boolean;
  agreeCodeOfConduct?: boolean;
}

export const MeetAgain = { ALL: 'ALL', SOME: 'SOME', NO: 'NO' } as const;
export type MeetAgain = (typeof MeetAgain)[keyof typeof MeetAgain];

export const GroupFeel = {
  TOO_SIMILAR: 'TOO_SIMILAR',
  JUST_RIGHT: 'JUST_RIGHT',
  TOO_DIFFERENT: 'TOO_DIFFERENT',
} as const;
export type GroupFeel = (typeof GroupFeel)[keyof typeof GroupFeel];

export const SizeFeel = {
  TOO_SMALL: 'TOO_SMALL',
  JUST_RIGHT: 'JUST_RIGHT',
  TOO_BIG: 'TOO_BIG',
} as const;
export type SizeFeel = (typeof SizeFeel)[keyof typeof SizeFeel];

export const ComeAgain = { YES: 'YES', MAYBE: 'MAYBE', NO: 'NO' } as const;
export type ComeAgain = (typeof ComeAgain)[keyof typeof ComeAgain];

export interface SubmitFeedbackInput {
  enjoyment: number;
  meetAgain: MeetAgain;
  seeAgainNames?: string;
  mixFelt: GroupFeel;
  sizeFelt: SizeFeel;
  cafeRating: number;
  comeAgain: ComeAgain;
  inviteFriend: boolean;
  nps: number;
  feltUnsafe?: boolean;
  unsafeDetails?: string;
  improve?: string;
}

export interface FeedbackDto extends SubmitFeedbackInput {
  id: string;
  userId: string;
  eventId: string;
  createdAt: string;
}

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string | null;
  meta: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  items: NotificationDto[];
  unread: number;
}

export type GoNoGoVerdict = 'GO' | 'NO_GO' | 'INSUFFICIENT_DATA';

export interface DashboardMetrics {
  events: {
    total: number;
    open: number;
    full: number;
    completed: number;
    cancelled: number;
  };
  bookings: { active: number; waitlisted: number; cancelled: number };
  attendance: { attended: number; noShow: number; showRatePct: number };
  feedback: {
    count: number;
    avgEnjoyment: number;
    avgNps: number;
    avgCafeRating: number;
    pctComeAgainYes: number;
    pctInviteFriendYes: number;
    pctMeetAgainAllSome: number;
    feltUnsafe: number;
  };
  goNoGo: {
    verdict: GoNoGoVerdict;
    eventsHeld: number;
    firstTimers: number;
    repeaters: number;
    repeatRatePct: number;
    referralSignal: boolean;
    threshold: { repeatRatePct: number; minEvents: number };
  };
}

export interface AuditEntry {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export interface PendingVerification {
  id: string;
  phone: string;
  firstName: string | null;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  firstName: string | null;
  lastInitial: string | null;
  interests: string[];
}

export interface MyGroup {
  members: GroupMember[];
}

export interface ReportDto {
  id: string;
  reporterId: string;
  subjectId: string;
  eventId: string | null;
  reason: string;
  createdAt: string;
  reporter?: PublicUser;
  subject?: PublicUser;
}

export interface GroupSuggestion {
  userIds: string[];
  score: number;
  oddOneOut: string[];
  energyMix: Record<string, number>;
  newcomerCount: number;
}

export interface MatchResult {
  groups: GroupSuggestion[];
  unassigned: string[];
}

export interface MatchGenerateResult {
  created: number;
  unassigned: string[];
  groups: GroupSuggestion[];
}
