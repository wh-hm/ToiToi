/*
  Warnings:

  - You are about to drop the column `image_url` on the `chats` table. All the data in the column will be lost.
  - You are about to drop the column `image_url` on the `question_chats` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "chats" DROP COLUMN "image_url",
ADD COLUMN     "image_id" INTEGER;

-- AlterTable
ALTER TABLE "question_chats" DROP COLUMN "image_url",
ADD COLUMN     "image_id" INTEGER;

-- AlterTable
ALTER TABLE "tasks" ALTER COLUMN "due_date" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "images" (
    "id" SERIAL NOT NULL,
    "storage_key" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_chats" ADD CONSTRAINT "question_chats_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;
