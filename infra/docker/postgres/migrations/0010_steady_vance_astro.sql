DROP INDEX "scf_control_metadata_control_uidx";--> statement-breakpoint
DROP INDEX "scf_controls_version_code_uidx";--> statement-breakpoint
DROP INDEX "scf_domains_version_code_uidx";--> statement-breakpoint
DROP INDEX "scf_requirements_framework_code_uidx";--> statement-breakpoint
DROP INDEX "scf_frameworks_version_framework_uidx";--> statement-breakpoint
DROP INDEX "scf_mappings_requirement_control_uidx";--> statement-breakpoint
DROP INDEX "scf_versions_version_uidx";--> statement-breakpoint
ALTER TABLE "scf_control_metadata" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "scf_control_metadata" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "scf_controls" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "scf_controls" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "scf_domains" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "scf_domains" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "scf_framework_requirements" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "scf_framework_requirements" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "scf_frameworks" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "scf_frameworks" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "scf_mappings" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "scf_mappings" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "scf_strm_relationships" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "scf_strm_relationships" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "scf_versions" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "scf_versions" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "scf_control_metadata" ADD CONSTRAINT "scf_control_metadata_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_control_metadata" ADD CONSTRAINT "scf_control_metadata_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_controls" ADD CONSTRAINT "scf_controls_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_controls" ADD CONSTRAINT "scf_controls_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_domains" ADD CONSTRAINT "scf_domains_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_domains" ADD CONSTRAINT "scf_domains_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_framework_requirements" ADD CONSTRAINT "scf_framework_requirements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_framework_requirements" ADD CONSTRAINT "scf_framework_requirements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_frameworks" ADD CONSTRAINT "scf_frameworks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_frameworks" ADD CONSTRAINT "scf_frameworks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_mappings" ADD CONSTRAINT "scf_mappings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_mappings" ADD CONSTRAINT "scf_mappings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_strm_relationships" ADD CONSTRAINT "scf_strm_relationships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_strm_relationships" ADD CONSTRAINT "scf_strm_relationships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_versions" ADD CONSTRAINT "scf_versions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_versions" ADD CONSTRAINT "scf_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "scf_control_metadata_control_uidx" ON "scf_control_metadata" USING btree ("tenant_id","scf_control_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scf_controls_version_code_uidx" ON "scf_controls" USING btree ("tenant_id","scf_version_id","control_code");--> statement-breakpoint
CREATE UNIQUE INDEX "scf_domains_version_code_uidx" ON "scf_domains" USING btree ("tenant_id","scf_version_id","domain_code");--> statement-breakpoint
CREATE UNIQUE INDEX "scf_requirements_framework_code_uidx" ON "scf_framework_requirements" USING btree ("tenant_id","scf_framework_id","requirement_code");--> statement-breakpoint
CREATE UNIQUE INDEX "scf_frameworks_version_framework_uidx" ON "scf_frameworks" USING btree ("tenant_id","scf_version_id","framework_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scf_mappings_requirement_control_uidx" ON "scf_mappings" USING btree ("tenant_id","scf_framework_requirement_id","scf_control_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scf_versions_version_uidx" ON "scf_versions" USING btree ("tenant_id","version");