-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ORGANIZER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('WOMAN', 'MAN', 'UNDISCLOSED');

-- CreateEnum
CREATE TYPE "GenderTrack" AS ENUM ('WOMEN_ONLY', 'MEN_ONLY', 'MIXED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('URDU', 'ENGLISH', 'BOTH');

-- CreateEnum
CREATE TYPE "LifeStage" AS ENUM ('STUDENT', 'EARLY_CAREER', 'PROFESSIONAL', 'BUSINESS_OWNER', 'PARENT', 'OTHER');

-- CreateEnum
CREATE TYPE "SocialEnergy" AS ENUM ('LISTENER', 'MIX', 'INITIATOR');

-- CreateEnum
CREATE TYPE "Intent" AS ENUM ('MAKE_FRIENDS', 'MEET_OUTSIDE_BUBBLE', 'NETWORKING', 'NEW_TO_CITY', 'PRACTICE_ENGLISH');

-- CreateEnum
CREATE TYPE "BeveragePref" AS ENUM ('COFFEE', 'CHAI', 'EITHER');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'OPEN', 'FULL', 'CLOSED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('BOOKED', 'ATTENDED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "MeetAgain" AS ENUM ('ALL', 'SOME', 'NO');

-- CreateEnum
CREATE TYPE "GroupFeel" AS ENUM ('TOO_SIMILAR', 'JUST_RIGHT', 'TOO_DIFFERENT');

-- CreateEnum
CREATE TYPE "SizeFeel" AS ENUM ('TOO_SMALL', 'JUST_RIGHT', 'TOO_BIG');

-- CreateEnum
CREATE TYPE "ComeAgain" AS ENUM ('YES', 'MAYBE', 'NO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reliabilityScore" INTEGER NOT NULL DEFAULT 100,
    "firstName" TEXT,
    "lastInitial" TEXT,
    "ageBand" TEXT,
    "gender" "Gender",
    "city" TEXT,
    "areas" TEXT[],
    "language" "Language",
    "availability" TEXT[],
    "interests" TEXT[],
    "lifeStage" "LifeStage",
    "socialEnergy" "SocialEnergy",
    "intents" "Intent"[],
    "newcomerStatus" TEXT,
    "beveragePref" "BeveragePref",
    "accessibilityNeeds" TEXT,
    "photoConsent" BOOLEAN NOT NULL DEFAULT false,
    "codeOfConductAt" TIMESTAMP(3),
    "blockedUserIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cafe" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "address" TEXT,
    "deadHourSlots" TEXT[],
    "compTerms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cafe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "cafeId" TEXT NOT NULL,
    "title" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "genderTrack" "GenderTrack" NOT NULL,
    "area" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "pricePKR" INTEGER NOT NULL,
    "seatsLeft" INTEGER NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "attendanceStatus" "AttendanceStatus" NOT NULL DEFAULT 'BOOKED',
    "amountPKR" INTEGER NOT NULL,
    "paymentRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupAssignment" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userIds" TEXT[],
    "matchScore" DOUBLE PRECISION,
    "algoVersion" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "enjoyment" INTEGER NOT NULL,
    "meetAgain" "MeetAgain" NOT NULL,
    "seeAgainNames" TEXT,
    "mixFelt" "GroupFeel" NOT NULL,
    "sizeFelt" "SizeFeel" NOT NULL,
    "cafeRating" INTEGER NOT NULL,
    "comeAgain" "ComeAgain" NOT NULL,
    "inviteFriend" BOOLEAN NOT NULL,
    "nps" INTEGER NOT NULL,
    "feltUnsafe" BOOLEAN NOT NULL DEFAULT false,
    "unsafeDetails" TEXT,
    "improve" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "eventId" TEXT,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "Event_status_startAt_idx" ON "Event"("status", "startAt");

-- CreateIndex
CREATE INDEX "Event_area_genderTrack_idx" ON "Event"("area", "genderTrack");

-- CreateIndex
CREATE INDEX "Booking_eventId_paymentStatus_idx" ON "Booking"("eventId", "paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_userId_eventId_key" ON "Booking"("userId", "eventId");

-- CreateIndex
CREATE INDEX "GroupAssignment_eventId_idx" ON "GroupAssignment"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_userId_eventId_key" ON "Feedback"("userId", "eventId");

-- CreateIndex
CREATE INDEX "Report_subjectId_idx" ON "Report"("subjectId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupAssignment" ADD CONSTRAINT "GroupAssignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
