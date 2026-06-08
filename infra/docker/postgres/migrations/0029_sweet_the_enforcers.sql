DROP INDEX "organizations_user_uidx";--> statement-breakpoint
CREATE INDEX "organizations_user_idx" ON "organizations" USING btree ("user_id");