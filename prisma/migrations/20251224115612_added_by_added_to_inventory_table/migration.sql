/*
  Warnings:

  - Added the required column `addedBy` to the `Inventory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Inventory" ADD COLUMN     "addedBy" TEXT NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE "public"."Inventory" ADD CONSTRAINT "Inventory_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
