-- Add optional CNIC image path to User (manual verification review).
ALTER TABLE "User" ADD COLUMN "cnicImagePath" TEXT;
