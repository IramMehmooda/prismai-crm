/*
  Warnings:

  - A unique constraint covering the columns `[googleId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN "gmailHistoryId" TEXT;
ALTER TABLE "User" ADD COLUMN "gmailLastSyncAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "googleAccessToken" TEXT;
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;
ALTER TABLE "User" ADD COLUMN "googleRefreshToken" TEXT;
ALTER TABLE "User" ADD COLUMN "googleTokenExpiresAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "image" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
