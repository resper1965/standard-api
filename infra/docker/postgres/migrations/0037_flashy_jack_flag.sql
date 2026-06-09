DROP INDEX "scf_strm_mapping_uidx";--> statement-breakpoint
ALTER TABLE "scf_strm_relationships" ALTER COLUMN "scf_mapping_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "scf_strm_relationships" ADD COLUMN "scf_control_id" uuid;--> statement-breakpoint
ALTER TABLE "scf_strm_relationships" ADD COLUMN "fde_code" text;--> statement-breakpoint
ALTER TABLE "scf_strm_relationships" ADD COLUMN "fde_name" text;--> statement-breakpoint
ALTER TABLE "scf_strm_relationships" ADD CONSTRAINT "scf_strm_relationships_scf_control_id_scf_controls_id_fk" FOREIGN KEY ("scf_control_id") REFERENCES "public"."scf_controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scf_strm_control_idx" ON "scf_strm_relationships" USING btree ("scf_control_id");--> statement-breakpoint
CREATE INDEX "scf_strm_fde_code_idx" ON "scf_strm_relationships" USING btree ("fde_code");--> statement-breakpoint
CREATE UNIQUE INDEX "scf_strm_control_fde_uidx" ON "scf_strm_relationships" USING btree ("scf_control_id","fde_code");