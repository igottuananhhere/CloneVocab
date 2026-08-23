-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'PRIVATE', 'UNLISTED');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'INAPPROPRIATE', 'COPYRIGHT', 'MISINFORMATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "username" VARCHAR(30) NOT NULL,
    "display_name" VARCHAR(60),
    "avatar_url" TEXT,
    "bio" VARCHAR(280),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_sets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000),
    "subject" VARCHAR(60),
    "language" VARCHAR(10) NOT NULL DEFAULT 'vi',
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "card_count" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "search_vector" tsvector,

    CONSTRAINT "study_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "study_set_id" UUID NOT NULL,
    "term" VARCHAR(500) NOT NULL,
    "definition" VARCHAR(2000) NOT NULL,
    "image_path" TEXT,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "flashcards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folder_study_sets" (
    "folder_id" UUID NOT NULL,
    "study_set_id" UUID NOT NULL,
    "added_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "folder_study_sets_pkey" PRIMARY KEY ("folder_id","study_set_id")
);

-- CreateTable
CREATE TABLE "saved_sets" (
    "user_id" UUID NOT NULL,
    "study_set_id" UUID NOT NULL,
    "saved_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_sets_pkey" PRIMARY KEY ("user_id","study_set_id")
);

-- CreateTable
CREATE TABLE "study_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "flashcard_id" UUID NOT NULL,
    "mastery_level" INTEGER NOT NULL DEFAULT 0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "incorrect_count" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "last_reviewed_at" TIMESTAMPTZ(6),
    "next_review_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "study_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "study_set_id" UUID NOT NULL,
    "correct_count" INTEGER NOT NULL,
    "total_count" INTEGER NOT NULL,
    "score_percent" DECIMAL(5,2) NOT NULL,
    "duration_ms" INTEGER,
    "detail" JSONB NOT NULL,
    "taken_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "study_set_id" UUID NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "pair_count" INTEGER NOT NULL,
    "played_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "study_set_id" UUID NOT NULL,
    "reporter_id" UUID,
    "reason" "ReportReason" NOT NULL,
    "note" VARCHAR(1000),
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_username_key" ON "profiles"("username");

-- CreateIndex
CREATE INDEX "study_sets_owner_id_idx" ON "study_sets"("owner_id");

-- CreateIndex
CREATE INDEX "study_sets_visibility_created_at_idx" ON "study_sets"("visibility", "created_at" DESC);

-- CreateIndex
CREATE INDEX "study_sets_subject_idx" ON "study_sets"("subject");

-- CreateIndex
CREATE INDEX "flashcards_study_set_id_position_idx" ON "flashcards"("study_set_id", "position");

-- CreateIndex
CREATE INDEX "folders_owner_id_idx" ON "folders"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "folders_owner_id_name_key" ON "folders"("owner_id", "name");

-- CreateIndex
CREATE INDEX "folder_study_sets_study_set_id_idx" ON "folder_study_sets"("study_set_id");

-- CreateIndex
CREATE INDEX "saved_sets_study_set_id_idx" ON "saved_sets"("study_set_id");

-- CreateIndex
CREATE INDEX "study_progress_user_id_next_review_at_idx" ON "study_progress"("user_id", "next_review_at");

-- CreateIndex
CREATE UNIQUE INDEX "study_progress_user_id_flashcard_id_key" ON "study_progress"("user_id", "flashcard_id");

-- CreateIndex
CREATE INDEX "test_results_user_id_taken_at_idx" ON "test_results"("user_id", "taken_at" DESC);

-- CreateIndex
CREATE INDEX "test_results_study_set_id_idx" ON "test_results"("study_set_id");

-- CreateIndex
CREATE INDEX "match_results_study_set_id_duration_ms_idx" ON "match_results"("study_set_id", "duration_ms");

-- CreateIndex
CREATE INDEX "match_results_user_id_played_at_idx" ON "match_results"("user_id", "played_at" DESC);

-- CreateIndex
CREATE INDEX "content_reports_status_created_at_idx" ON "content_reports"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "content_reports_study_set_id_idx" ON "content_reports"("study_set_id");

-- AddForeignKey
ALTER TABLE "study_sets" ADD CONSTRAINT "study_sets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_study_set_id_fkey" FOREIGN KEY ("study_set_id") REFERENCES "study_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folder_study_sets" ADD CONSTRAINT "folder_study_sets_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folder_study_sets" ADD CONSTRAINT "folder_study_sets_study_set_id_fkey" FOREIGN KEY ("study_set_id") REFERENCES "study_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_sets" ADD CONSTRAINT "saved_sets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_sets" ADD CONSTRAINT "saved_sets_study_set_id_fkey" FOREIGN KEY ("study_set_id") REFERENCES "study_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_progress" ADD CONSTRAINT "study_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_progress" ADD CONSTRAINT "study_progress_flashcard_id_fkey" FOREIGN KEY ("flashcard_id") REFERENCES "flashcards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_study_set_id_fkey" FOREIGN KEY ("study_set_id") REFERENCES "study_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_study_set_id_fkey" FOREIGN KEY ("study_set_id") REFERENCES "study_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_study_set_id_fkey" FOREIGN KEY ("study_set_id") REFERENCES "study_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
