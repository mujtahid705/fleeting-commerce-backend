-- CreateEnum
CREATE TYPE "public"."DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "public"."SaleDiscountScope" AS ENUM ('ALL_PRODUCTS', 'SPECIFIC_PRODUCTS');

-- AlterTable
ALTER TABLE "public"."Order"
ADD COLUMN "subtotalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "saleDiscountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "couponDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "couponCode" TEXT;

-- Backfill existing orders so subtotal mirrors the previous total
UPDATE "public"."Order"
SET "subtotalAmount" = "totalAmount"
WHERE "subtotalAmount" = 0;

-- CreateTable
CREATE TABLE "public"."Coupon" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "public"."DiscountType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "minOrderAmount" DOUBLE PRECISION,
    "maxDiscountAmount" DOUBLE PRECISION,
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SaleDiscount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "public"."DiscountType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "scope" "public"."SaleDiscountScope" NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SaleDiscountProduct" (
    "id" TEXT NOT NULL,
    "saleDiscountId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "SaleDiscountProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_tenantId_code_key" ON "public"."Coupon"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Coupon_tenantId_idx" ON "public"."Coupon"("tenantId");

-- CreateIndex
CREATE INDEX "SaleDiscount_tenantId_idx" ON "public"."SaleDiscount"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleDiscountProduct_saleDiscountId_productId_key" ON "public"."SaleDiscountProduct"("saleDiscountId", "productId");

-- CreateIndex
CREATE INDEX "SaleDiscountProduct_productId_idx" ON "public"."SaleDiscountProduct"("productId");

-- AddForeignKey
ALTER TABLE "public"."Coupon" ADD CONSTRAINT "Coupon_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SaleDiscount" ADD CONSTRAINT "SaleDiscount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SaleDiscountProduct" ADD CONSTRAINT "SaleDiscountProduct_saleDiscountId_fkey" FOREIGN KEY ("saleDiscountId") REFERENCES "public"."SaleDiscount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SaleDiscountProduct" ADD CONSTRAINT "SaleDiscountProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
