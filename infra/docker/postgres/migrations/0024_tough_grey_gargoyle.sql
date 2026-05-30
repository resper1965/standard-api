ALTER TABLE "tenants" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
CREATE INDEX "tenants_parent_idx" ON "tenants" USING btree ("parent_id");