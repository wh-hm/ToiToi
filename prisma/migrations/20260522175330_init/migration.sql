-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(255) NOT NULL,
    "google_id" VARCHAR(255) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delete_flag" INTEGER NOT NULL DEFAULT 0,
    "email" VARCHAR(255) NOT NULL,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spaces" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delete_flag" INTEGER NOT NULL DEFAULT 0,
    "space_type" INTEGER NOT NULL DEFAULT 0,
    "favorite_flag" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" SERIAL NOT NULL,
    "space_id" INTEGER NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "image_url" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delete_flag" INTEGER NOT NULL DEFAULT 0,
    "favorite_flag" INTEGER NOT NULL DEFAULT 0,
    "stamp" VARCHAR(255) NOT NULL,
    "background" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "due_date" DATE NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATE NOT NULL,
    "delete_flag" INTEGER NOT NULL DEFAULT 0,
    "space_id" INTEGER NOT NULL,
    "tag" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" SERIAL NOT NULL,
    "space_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "is_resolved" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delete_flag" INTEGER NOT NULL DEFAULT 0,
    "user_id" VARCHAR(255) NOT NULL,
    "question" VARCHAR(255) NOT NULL,
    "tag" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_messages" (
    "id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delete_flag" INTEGER NOT NULL DEFAULT 0,
    "space_id" INTEGER NOT NULL,

    CONSTRAINT "question_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_management" (
    "user_id" VARCHAR(255) NOT NULL,
    "last_login_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_login_days" INTEGER NOT NULL DEFAULT 1,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "delete_flag" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "login_management_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_messages" ADD CONSTRAINT "question_messages_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_management" ADD CONSTRAINT "login_management_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
