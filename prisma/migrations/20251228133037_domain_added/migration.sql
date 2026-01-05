/*
  Warnings:

  - You are about to drop the column `domain` on the `Tenant` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[domain]` on the table `TenantBrand` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Tenant_domain_key";

-- AlterTable
ALTER TABLE "public"."Tenant" DROP COLUMN "domain";

-- CreateIndex
CREATE UNIQUE INDEX "TenantBrand_domain_key" ON "public"."TenantBrand"("domain");
