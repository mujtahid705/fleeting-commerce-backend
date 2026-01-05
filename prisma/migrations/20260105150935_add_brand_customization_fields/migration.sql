-- AlterTable
ALTER TABLE "public"."TenantBrand" ADD COLUMN     "browseCategories" JSONB,
ADD COLUMN     "exclusiveSection" JSONB,
ADD COLUMN     "featuredCategories" JSONB,
ADD COLUMN     "footer" JSONB,
ADD COLUMN     "hero" JSONB;
