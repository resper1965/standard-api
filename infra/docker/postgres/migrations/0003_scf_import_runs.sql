CREATE TABLE IF NOT EXISTS "scf_import_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "scf_version_id" uuid,
  "source_type" text NOT NULL,
  "source_filename" text,
  "source_hash" text NOT NULL,
  "status" text NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  "error_summary_safe" text,
  "import_statistics" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "trace_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "scf_import_runs_scf_version_id_scf_versions_id_fk"
    FOREIGN KEY ("scf_version_id") REFERENCES "scf_versions"("id") ON DELETE no action ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "scf_import_runs_version_idx" ON "scf_import_runs" ("scf_version_id");
CREATE INDEX IF NOT EXISTS "scf_import_runs_status_idx" ON "scf_import_runs" ("status");
CREATE INDEX IF NOT EXISTS "scf_import_runs_trace_idx" ON "scf_import_runs" ("trace_id");
