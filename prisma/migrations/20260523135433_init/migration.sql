/*
  Warnings:

  - A unique constraint covering the columns `[google_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "messages" ALTER COLUMN "message" DROP NOT NULL,
ALTER COLUMN "delete_flag" DROP NOT NULL,
ALTER COLUMN "favorite_flag" DROP NOT NULL,
ALTER COLUMN "stamp" DROP NOT NULL,
ALTER COLUMN "background" DROP NOT NULL;

-- AlterTable
ALTER TABLE "question_messages" ADD COLUMN     "image_url" VARCHAR(255),
ADD COLUMN     "stamp" VARCHAR(255),
ALTER COLUMN "content" DROP NOT NULL;

-- AlterTable
ALTER TABLE "questions" ALTER COLUMN "created_at" DROP NOT NULL,
ALTER COLUMN "delete_flag" DROP NOT NULL,
ALTER COLUMN "tag" DROP NOT NULL;

-- AlterTable
ALTER TABLE "spaces" ALTER COLUMN "created_at" DROP NOT NULL,
ALTER COLUMN "delete_flag" DROP NOT NULL,
ALTER COLUMN "favorite_flag" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tasks" ALTER COLUMN "created_at" DROP NOT NULL,
ALTER COLUMN "delete_flag" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "username" DROP NOT NULL,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "updated_at" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");
