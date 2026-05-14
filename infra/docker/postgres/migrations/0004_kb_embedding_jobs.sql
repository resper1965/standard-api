CREATE TABLE IF NOT EXISTS "kb_embedding_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "assessment_id" uuid NOT NULL,
  "document_id" uuid NOT NULL,
  "chunk_id" uuid,
  "job_type" text NOT NULL,
  "status" text NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "queued_at" timestamp with time zone DEFAULT now() NOT NULL,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "error_code" text,
  "error_message_safe" text,
  "trace_id" text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  CONSTRAINT "kb_embedding_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "kb_embedding_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "kb_embedding_jobs_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "kb_embedding_jobs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "kb_embedding_jobs_chunk_id_document_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "document_chunks"("id") ON DELETE no action ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "kb_embedding_jobs_assessment_idx" ON "kb_embedding_jobs" ("tenant_id", "organization_id", "assessment_id");
CREATE INDEX IF NOT EXISTS "kb_embedding_jobs_document_idx" ON "kb_embedding_jobs" ("document_id");
CREATE INDEX IF NOT EXISTS "kb_embedding_jobs_status_idx" ON "kb_embedding_jobs" ("status");
CREATE INDEX IF NOT EXISTS "kb_embedding_jobs_trace_idx" ON "kb_embedding_jobs" ("trace_id");

CREATE TABLE IF NOT EXISTS "kb_search_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "assessment_id" uuid NOT NULL,
  "actor_id" uuid,
  "query_hash" text NOT NULL,
  "search_type" text NOT NULL,
  "filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "result_count" integer DEFAULT 0 NOT NULL,
  "trace_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "kb_search_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "kb_search_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "kb_search_logs_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "kb_search_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "kb_search_logs_assessment_idx" ON "kb_search_logs" ("tenant_id", "organization_id", "assessment_id");
CREATE INDEX IF NOT EXISTS "kb_search_logs_trace_idx" ON "kb_search_logs" ("trace_id");
CREATE INDEX IF NOT EXISTS "kb_search_logs_query_hash_idx" ON "kb_search_logs" ("query_hash");
