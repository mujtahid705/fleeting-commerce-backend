/*
  Warnings:

  - A unique constraint covering the columns `[name,tenantId]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug,tenantId]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,categoryId]` on the table `SubCategory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug,categoryId]` on the table `SubCategory` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Category_name_key";

-- DropIndex
DROP INDEX "public"."Category_slug_key";

-- DropIndex
DROP INDEX "public"."SubCategory_slug_key";

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_tenantId_key" ON "public"."Category"("name", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_tenantId_key" ON "public"."Category"("slug", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SubCategory_name_categoryId_key" ON "public"."SubCategory"("name", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "SubCategory_slug_categoryId_key" ON "public"."SubCategory"("slug", "categoryId");
