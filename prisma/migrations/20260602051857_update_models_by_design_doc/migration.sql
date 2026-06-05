/*
  Warnings:

  - You are about to drop the `messages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `question_messages` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `delete_flag` on table `questions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `spaces` required. This step will fail if there are existing NULL values in that column.
  - Made the column `delete_flag` on table `spaces` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_space_id_fkey";

-- DropForeignKey
ALTER TABLE "question_messages" DROP CONSTRAINT "question_messages_question_id_fkey";

-- AlterTable
ALTER TABLE "login_management" ALTER COLUMN "current_streak" SET DEFAULT 1;

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "delete_flag" SET NOT NULL;

-- AlterTable
ALTER TABLE "spaces" ADD COLUMN     "is_archived" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "delete_flag" SET NOT NULL;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "description" VARCHAR(255),
ADD COLUMN     "is_allday" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP;

-- DropTable
DROP TABLE "messages";

-- DropTable
DROP TABLE "question_messages";

-- CreateTable
CREATE TABLE "chats" (
    "id" SERIAL NOT NULL,
    "space_id" INTEGER NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "message" VARCHAR(255),
    "image_url" VARCHAR(255),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delete_flag" INTEGER DEFAULT 0,
    "favorite_flag" INTEGER DEFAULT 0,
    "stamp" VARCHAR(255),
    "background" INTEGER DEFAULT 0,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_chats" (
    "id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "content" VARCHAR(255),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delete_flag" INTEGER NOT NULL DEFAULT 0,
    "image_url" VARCHAR(255),
    "stamp" VARCHAR(255),
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "nice_flag" INTEGER DEFAULT 0,

    CONSTRAINT "question_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal" (
    "id" VARCHAR(255) NOT NULL,
    "content" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "delete_flag" INTEGER DEFAULT 0,

    CONSTRAINT "goal_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_chats" ADD CONSTRAINT "question_chats_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal" ADD CONSTRAINT "goal_id_fkey" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
