-- User account status (for admin suspend/ban) + report workflow status. Additive.
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'ACTIONED');

ALTER TABLE "User" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Report" ADD COLUMN "status" "ReportStatus" NOT NULL DEFAULT 'OPEN';
ALTER TABLE "Report" ADD COLUMN "resolvedAt" TIMESTAMP(3);
CREATE INDEX "Report_status_idx" ON "Report"("status");
