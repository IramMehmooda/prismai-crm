-- Gmail push state and per-user notification preferences
ALTER TABLE "User" ADD COLUMN "gmailWatchExpiration" DATETIME;
ALTER TABLE "User" ADD COLUMN "gmailPushEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "gmailNotifyCustomerEmails" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "gmailNotifyTeamEmails" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "gmailNotifyOnlyMyPipeline" BOOLEAN NOT NULL DEFAULT true;