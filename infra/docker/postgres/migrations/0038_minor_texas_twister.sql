ALTER TABLE "scf_framework_requirements" ADD COLUMN "is_mcr" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "scf_framework_requirements" ADD COLUMN "mcr_rationale" text;--> statement-breakpoint
CREATE INDEX "scf_requirements_mcr_idx" ON "scf_framework_requirements" USING btree ("is_mcr");