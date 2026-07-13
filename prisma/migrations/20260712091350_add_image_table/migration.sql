/*
  Warnings:

  - Added the required column `mime_type` to the `images` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size_bytes` to the `images` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "images" ADD COLUMN     "caption" VARCHAR(255),
ADD COLUMN     "delete_flag" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mime_type" VARCHAR(100) NOT NULL,
ADD COLUMN     "size_bytes" INTEGER NOT NULL;
