/*
  Warnings:

  - You are about to drop the column `maxThemes` on the `Plan` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Plan` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `maxCategories` to the `Plan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxSubcategoriesPerCategory` to the `Plan` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('SUBSCRIPTION_EXPIRY', 'SUBSCRIPTION_EXPIRED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'LIMIT_WARNING', 'GENERAL');

-- AlterTable
ALTER TABLE "public"."Plan" DROP COLUMN "maxThemes",
ADD COLUMN     "maxCategories" INTEGER NOT NULL,
ADD COLUMN     "maxSubcategoriesPerCategory" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."Tenant" ADD COLUMN     "hasUsedTrial" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_tenantId_idx" ON "public"."Notification"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_name_key" ON "public"."Plan"("name");

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
