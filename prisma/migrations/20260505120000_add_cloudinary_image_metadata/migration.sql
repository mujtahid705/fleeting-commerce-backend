ALTER TABLE "public"."ProductImage"
ADD COLUMN "cloudinaryPublicId" TEXT;

ALTER TABLE "public"."TenantBrand"
ADD COLUMN "logoPublicId" TEXT;
