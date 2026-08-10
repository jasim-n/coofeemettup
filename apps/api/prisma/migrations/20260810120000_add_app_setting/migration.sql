-- Generic key/value app settings (admin-tunable at runtime). Additive.
-- Holds `mailProvider` = 'brevo' | 'gmail' for switching the OTP sender.
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);
