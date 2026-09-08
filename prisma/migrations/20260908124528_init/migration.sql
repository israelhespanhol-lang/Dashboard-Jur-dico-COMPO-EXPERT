-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'JURIDICO', 'GESTOR', 'LEITURA');

-- CreateEnum
CREATE TYPE "public"."ActionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'DISMISSED', 'WAITING');

-- CreateEnum
CREATE TYPE "public"."AlertSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."AlertStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "public"."ReviewClassification" AS ENUM ('OK', 'WAITING_COURT', 'ACTION_REQUIRED', 'UNDER_REVIEW', 'MANUAL_CHECK');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'LEITURA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."processes" (
    "id" TEXT NOT NULL,
    "process_number" TEXT NOT NULL,
    "process_number_normalized" TEXT NOT NULL,
    "client_id" TEXT,
    "debtor_name" TEXT,
    "court" TEXT,
    "court_alias" TEXT,
    "jurisdiction_degree" TEXT,
    "judicial_body" TEXT,
    "process_class" TEXT,
    "subject" TEXT,
    "case_value" DECIMAL(65,30),
    "current_status" TEXT,
    "electronic_system" TEXT,
    "secrecy" BOOLEAN NOT NULL DEFAULT false,
    "priority" BOOLEAN NOT NULL DEFAULT false,
    "origin" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "imported_last_movement" TEXT,
    "imported_status" TEXT,
    "imported_date" TIMESTAMP(3),
    "last_sync_at" TIMESTAMP(3),
    "last_external_movement_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."movements" (
    "id" TEXT NOT NULL,
    "process_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "external_id" TEXT,
    "movement_code" TEXT,
    "movement_name" TEXT,
    "movement_description" TEXT,
    "movement_date" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "raw_payload" JSONB,
    "content_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."communications" (
    "id" TEXT NOT NULL,
    "process_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "external_id" TEXT,
    "type" TEXT,
    "available_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "acknowledged_at" TIMESTAMP(3),
    "description" TEXT,
    "full_text" TEXT,
    "raw_payload" JSONB,
    "content_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."internal_actions" (
    "id" TEXT NOT NULL,
    "process_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "description" TEXT,
    "responsible_user_id" TEXT,
    "status" "public"."ActionStatus" NOT NULL DEFAULT 'PENDING',
    "performed_at" TIMESTAMP(3),
    "protocol_number" TEXT,
    "evidence_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."alerts" (
    "id" TEXT NOT NULL,
    "process_id" TEXT NOT NULL,
    "severity" "public"."AlertSeverity" NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source_movement_id" TEXT,
    "status" "public"."AlertStatus" NOT NULL DEFAULT 'OPEN',
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."process_reviews" (
    "id" TEXT NOT NULL,
    "process_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "classification" "public"."ReviewClassification" NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "process_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sync_runs" (
    "id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "provider" TEXT NOT NULL,
    "total_processes" INTEGER NOT NULL DEFAULT 0,
    "successful" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "new_movements" INTEGER NOT NULL DEFAULT 0,
    "new_alerts" INTEGER NOT NULL DEFAULT 0,
    "error_summary" TEXT,

    CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "processes_process_number_normalized_key" ON "public"."processes"("process_number_normalized");

-- CreateIndex
CREATE INDEX "processes_court_alias_idx" ON "public"."processes"("court_alias");

-- CreateIndex
CREATE INDEX "processes_active_current_status_idx" ON "public"."processes"("active", "current_status");

-- CreateIndex
CREATE INDEX "movements_process_id_movement_date_idx" ON "public"."movements"("process_id", "movement_date");

-- CreateIndex
CREATE UNIQUE INDEX "movements_provider_external_id_key" ON "public"."movements"("provider", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "movements_process_id_content_hash_key" ON "public"."movements"("process_id", "content_hash");

-- CreateIndex
CREATE UNIQUE INDEX "communications_provider_external_id_key" ON "public"."communications"("provider", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "communications_process_id_content_hash_key" ON "public"."communications"("process_id", "content_hash");

-- CreateIndex
CREATE INDEX "internal_actions_process_id_status_idx" ON "public"."internal_actions"("process_id", "status");

-- CreateIndex
CREATE INDEX "alerts_status_severity_idx" ON "public"."alerts"("status", "severity");

-- CreateIndex
CREATE INDEX "sync_runs_provider_started_at_idx" ON "public"."sync_runs"("provider", "started_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_created_at_idx" ON "public"."audit_logs"("entity", "entity_id", "created_at");

-- AddForeignKey
ALTER TABLE "public"."processes" ADD CONSTRAINT "processes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movements" ADD CONSTRAINT "movements_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."communications" ADD CONSTRAINT "communications_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."internal_actions" ADD CONSTRAINT "internal_actions_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."internal_actions" ADD CONSTRAINT "internal_actions_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alerts" ADD CONSTRAINT "alerts_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."process_reviews" ADD CONSTRAINT "process_reviews_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."process_reviews" ADD CONSTRAINT "process_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
