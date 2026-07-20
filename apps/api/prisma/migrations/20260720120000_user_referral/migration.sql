-- Referrals: each user has a unique shareable code; new signups may carry one.
ALTER TABLE "User"
  ADD COLUMN "referralCode" TEXT,
  ADD COLUMN "referredByCode" TEXT;
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
