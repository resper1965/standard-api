-- Custom migration to align scf_versions columns with Drizzle schema and resolve desyncs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scf_ingestion_mode') THEN
    CREATE TYPE "public"."scf_ingestion_mode" AS ENUM('scf_official_xlsx', 'oscal_json', 'synthetic', 'manual');
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "scf_versions" ADD COLUMN IF NOT EXISTS "provenance_hash" text;
--> statement-breakpoint
ALTER TABLE "scf_versions" ADD COLUMN IF NOT EXISTS "ingestion_mode" "public"."scf_ingestion_mode" DEFAULT 'scf_official_xlsx' NOT NULL;
