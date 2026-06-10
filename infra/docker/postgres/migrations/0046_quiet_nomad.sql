CREATE INDEX "gap_findings_roc_idx" ON "gap_findings" USING btree ("roc_determination");--> statement-breakpoint
CREATE INDEX "gap_findings_mcr_idx" ON "gap_findings" USING btree ("is_mcr_gap");