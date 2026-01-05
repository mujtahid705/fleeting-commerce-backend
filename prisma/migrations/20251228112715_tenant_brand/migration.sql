-- AlterTable
ALTER TABLE "public"."Tenant" ADD COLUMN     "address" TEXT;

-- CreateTable
CREATE TABLE "public"."TenantBrand" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "logoUrl" TEXT,
    "tagline" TEXT,
    "description" TEXT,
    "theme" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantBrand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantBrand_tenantId_key" ON "public"."TenantBrand"("tenantId");

-- AddForeignKey
ALTER TABLE "public"."TenantBrand" ADD CONSTRAINT "TenantBrand_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
