ALTER TABLE "scf_framework_requirements" ADD COLUMN "fde_code" text;--> statement-breakpoint
CREATE INDEX "scf_requirements_fde_code_idx" ON "scf_framework_requirements" USING btree ("fde_code");