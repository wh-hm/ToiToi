/*
  Warnings:

  - You are about to drop the column `content` on the `question_chats` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "question_chats" DROP COLUMN "content",
ADD COLUMN     "message" VARCHAR(255);
