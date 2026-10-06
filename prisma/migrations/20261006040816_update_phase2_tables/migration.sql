-- AlterTable
ALTER TABLE "users" ADD COLUMN     "profile_image_url" VARCHAR(255);

-- CreateTable
CREATE TABLE "space_read_statuses" (
    "id" SERIAL NOT NULL,
    "space_id" INTEGER NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "last_read_chat_id" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "space_read_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" SERIAL NOT NULL,
    "space_id" INTEGER NOT NULL,
    "inviter_id" VARCHAR(255) NOT NULL,
    "invitee_id" VARCHAR(255) NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delete_flag" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "type" INTEGER NOT NULL,
    "related_id" INTEGER NOT NULL DEFAULT 0,
    "space_id" INTEGER NOT NULL,
    "space_type" INTEGER NOT NULL DEFAULT 0,
    "content" VARCHAR(255),
    "is_read" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delete_flag" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "task_id" INTEGER NOT NULL,
    "remind_at" TIMESTAMPTZ NOT NULL,
    "is_sent" INTEGER NOT NULL DEFAULT 0,
    "space_type" INTEGER NOT NULL DEFAULT 0,
    "content" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delete_flag" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "space_read_statuses_space_id_user_id_key" ON "space_read_statuses"("space_id", "user_id");

-- AddForeignKey
ALTER TABLE "space_read_statuses" ADD CONSTRAINT "space_read_statuses_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_read_statuses" ADD CONSTRAINT "space_read_statuses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
