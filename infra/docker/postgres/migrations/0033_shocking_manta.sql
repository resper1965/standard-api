CREATE TABLE IF NOT EXISTS "scf_assessment_objectives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"scf_version_id" uuid NOT NULL,
	"scf_control_id" uuid NOT NULL,
	"objective_code" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scf_evidence_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"scf_version_id" uuid NOT NULL,
	"scf_control_id" uuid NOT NULL,
	"request_item" text NOT NULL,
	"evidence_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scf_maturity_criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"scf_version_id" uuid NOT NULL,
	"scf_control_id" uuid NOT NULL,
	"level" integer NOT NULL,
	"criteria_text" text NOT NULL,
	"remediation_guidance" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scf_risk_control_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"scf_version_id" uuid NOT NULL,
	"scf_risk_id" uuid NOT NULL,
	"scf_control_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scf_risks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"scf_version_id" uuid NOT NULL,
	"risk_code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scf_threat_control_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"scf_version_id" uuid NOT NULL,
	"scf_threat_id" uuid NOT NULL,
	"scf_control_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scf_threats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"scf_version_id" uuid NOT NULL,
	"threat_code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
DROP TABLE IF EXISTS "apikey" CASCADE;--> statement-breakpoint

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scf_assessment_objectives_organization_id_organizations_id_fk') THEN
        ALTER TABLE "scf_assessment_objectives" ADD CONSTRAINT "scf_assessment_objectives_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scf_assessment_objectives_scf_version_id_scf_versions_id_fk') THEN
        ALTER TABLE "scf_assessment_objectives" ADD CONSTRAINT "scf_assessment_objectives_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scf_assessment_objectives_scf_control_id_scf_controls_id_fk') THEN
        ALTER TABLE "scf_assessment_objectives" ADD CONSTRAINT "scf_assessment_objectives_scf_control_id_scf_controls_id_fk" FOREIGN KEY ("scf_control_id") REFERENCES "public"."scf_controls"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scf_evidence_requests_organization_id_organizations_id_fk') THEN
        ALTER TABLE "scf_evidence_requests" ADD CONSTRAINT "scf_evidence_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scf_evidence_requests_scf_version_id_scf_versions_id_fk') THEN
        ALTER TABLE "scf_evidence_requests" ADD CONSTRAINT "scf_evidence_requests_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scf_evidence_requests_scf_control_id_scf_controls_id_fk') THEN
        ALTER TABLE "scf_evidence_requests" ADD CONSTRAINT "scf_evidence_requests_scf_control_id_scf_controls_id_fk" FOREIGN KEY ("scf_control_id") REFERENCES "public"."scf_controls"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scf_maturity_criteria_organization_id_organizations_id_fk') THEN
        ALTER TABLE "scf_maturity_criteria" ADD CONSTRAINT "scf_maturity_criteria_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scf_maturity_criteria_scf_version_id_scf_versions_id_fk') THEN
        ALTER TABLE "scf_maturity_criteria" ADD CONSTRAINT "scf_maturity_criteria_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scf_maturity_criteria_scf_control_id_scf_controls_id_fk') THEN
        ALTER TABLE "scf_maturity_criteria" ADD CONSTRAINT "scf_maturity_criteria_scf_control_id_scf_controls_id_fk" FOREIGN KEY ("scf_control_id") REFERENCES "public"."scf_controls"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scf_risk_control_mappings_organization_id_organizations_id_fk') THEN
        ALTER TABLE "scf_risk_control_mappings" ADD CONSTRAINT "scf_risk_control_mappings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scf_risk_control_mappings_scf_version_id_scf_versions_id_fk') THEN
        ALTER TABLE "scf_risk_control_mappings" ADD CONSTRAINT "scf_risk_control_mappings_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scf_risk_control_mappings_scf_risk_id_scf_risks_id_fk') THEN
        ALTER TABLE "scf_risk_control_mappings" ADD CONSTRAINT "scf_risk_control_mappings_scf_risk_id_scf_risks_id_fk" FOREIGN KEY ("scf_risk_id") REFERENCES "public"."scf_risks"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scf_risk_control_mappings_scf_control_id_scf_controls_id_fk') THEN
        ALTER TABLE "scf_risk_control_mappings" ADD CONSTRAINT "scf_risk_control_mappings_scf_control_id_scf_controls_id_fk" FOREIGN KEY ("scf_control_id") REFERENCES "public"."scf_controls"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scf_risks_organization_id_organizations_id_fk') THEN
        ALTER TABLE "scf_risks" ADD CONSTRAINT "scf_risks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scf_risks_scf_version_id_scf_versions_id_fk') THEN
        ALTER TABLE "scf_risks" ADD CONSTRAINT "scf_risks_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scf_threat_control_mappings_organization_id_organizations_id_fk') THEN
        ALTER TABLE "scf_threat_control_mappings" ADD CONSTRAINT "scf_threat_control_mappings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scf_threat_control_mappings_scf_version_id_scf_versions_id_fk') THEN
        ALTER TABLE "scf_threat_control_mappings" ADD CONSTRAINT "scf_threat_control_mappings_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scf_threat_control_mappings_scf_threat_id_scf_threats_id_fk') THEN
        ALTER TABLE "scf_threat_control_mappings" ADD CONSTRAINT "scf_threat_control_mappings_scf_threat_id_scf_threats_id_fk" FOREIGN KEY ("scf_threat_id") REFERENCES "public"."scf_threats"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scf_threat_control_mappings_scf_control_id_scf_controls_id_fk') THEN
        ALTER TABLE "scf_threat_control_mappings" ADD CONSTRAINT "scf_threat_control_mappings_scf_control_id_scf_controls_id_fk" FOREIGN KEY ("scf_control_id") REFERENCES "public"."scf_controls"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scf_threats_organization_id_organizations_id_fk') THEN
        ALTER TABLE "scf_threats" ADD CONSTRAINT "scf_threats_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scf_threats_scf_version_id_scf_versions_id_fk') THEN
        ALTER TABLE "scf_threats" ADD CONSTRAINT "scf_threats_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "scf_ao_control_idx" ON "scf_assessment_objectives" USING btree ("scf_control_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "scf_ao_version_code_uidx" ON "scf_assessment_objectives" USING btree ("scf_version_id","objective_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scf_erl_control_idx" ON "scf_evidence_requests" USING btree ("scf_control_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scf_mc_control_level_idx" ON "scf_maturity_criteria" USING btree ("scf_control_id","level");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "scf_mc_control_level_uidx" ON "scf_maturity_criteria" USING btree ("scf_control_id","level");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "scf_rc_mapping_uidx" ON "scf_risk_control_mappings" USING btree ("scf_risk_id","scf_control_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "scf_risks_version_code_uidx" ON "scf_risks" USING btree ("scf_version_id","risk_code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "scf_tc_mapping_uidx" ON "scf_threat_control_mappings" USING btree ("scf_threat_id","scf_control_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "scf_threats_version_code_uidx" ON "scf_threats" USING btree ("scf_version_id","threat_code");