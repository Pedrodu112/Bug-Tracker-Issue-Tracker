CREATE TYPE "issue_type" AS ENUM ('BUG', 'FEATURE', 'TASK');
CREATE TYPE "issue_priority" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA');
CREATE TYPE "issue_status" AS ENUM ('BACKLOG', 'TRIAGEM', 'EM_DESENVOLVIMENTO', 'CODE_REVIEW', 'QA', 'PRONTO_PARA_DEPLOY', 'CONCLUIDO');
CREATE TYPE "issue_action" AS ENUM ('INICIAR_TRIAGEM', 'INICIAR_DESENVOLVIMENTO', 'ENVIAR_PARA_REVISAO', 'SOLICITAR_AJUSTES', 'APROVAR_REVISAO', 'ENVIAR_PARA_QA', 'REABRIR_DESENVOLVIMENTO', 'APROVAR_QA', 'LIBERAR_DEPLOY');
CREATE TYPE "issue_role" AS ENUM ('REPORTER', 'TRIAGER', 'DEVELOPER', 'REVIEWER', 'QA', 'RELEASE_MANAGER', 'ADMIN');
CREATE TYPE "issue_notification_type" AS ENUM ('MENTION', 'STATUS_CHANGED', 'ASSIGNED');

CREATE TABLE "projects" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "issues" (
  "id" SERIAL NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "project_id" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "type" "issue_type" NOT NULL,
  "priority" "issue_priority" NOT NULL,
  "status" "issue_status" NOT NULL DEFAULT 'BACKLOG',
  "assignee" VARCHAR(80) NOT NULL,
  "acceptance_criteria" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "issue_history" (
  "id" SERIAL NOT NULL,
  "issue_id" INTEGER NOT NULL,
  "action" "issue_action" NOT NULL,
  "previous_status" "issue_status" NOT NULL,
  "new_status" "issue_status" NOT NULL,
  "actor_id" VARCHAR(80) NOT NULL,
  "actor_role" "issue_role" NOT NULL,
  "justification" TEXT NOT NULL,
  "timestamp" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" INTEGER NOT NULL,
  CONSTRAINT "issue_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "issue_notifications" (
  "id" SERIAL NOT NULL,
  "recipient_id" VARCHAR(40) NOT NULL,
  "issue_id" INTEGER NOT NULL,
  "type" "issue_notification_type" NOT NULL,
  "message" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "read" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "issue_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "issues_project_id_idx" ON "issues"("project_id");
CREATE INDEX "issues_status_priority_idx" ON "issues"("status", "priority");
CREATE UNIQUE INDEX "issue_history_issue_id_version_key" ON "issue_history"("issue_id", "version");
CREATE INDEX "issue_history_timestamp_idx" ON "issue_history"("timestamp");
CREATE INDEX "issue_history_issue_id_timestamp_idx" ON "issue_history"("issue_id", "timestamp");
CREATE INDEX "issue_notifications_recipient_id_created_at_idx" ON "issue_notifications"("recipient_id", "created_at");

ALTER TABLE "issues" ADD CONSTRAINT "issues_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "issue_history" ADD CONSTRAINT "issue_history_issue_id_fkey"
  FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "issue_notifications" ADD CONSTRAINT "issue_notifications_issue_id_fkey"
  FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enforce audit immutability at database level as well as in application code.
CREATE FUNCTION "reject_issue_history_mutation"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'issue_history is append-only; UPDATE and DELETE are forbidden';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "issue_history_append_only"
BEFORE UPDATE OR DELETE ON "issue_history"
FOR EACH ROW EXECUTE FUNCTION "reject_issue_history_mutation"();
