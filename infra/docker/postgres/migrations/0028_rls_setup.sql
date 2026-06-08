-- Enable Row-Level Security (RLS) for tenant isolation
-- This forces all queries to include the 'organization_id' matched against the current transaction setting.

-- 1. assessments table
ALTER TABLE "assessments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_assessments" ON "assessments"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR
    NULLIF(current_setting('app.current_org_id', true), '') IS NULL -- Allow bypass for system jobs/platform admins if not set
  );

-- 2. documents table
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_documents" ON "documents"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR
    NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

-- 3. artifacts table (commented out as it doesn't exist or was renamed)
-- ALTER TABLE "artifacts" ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "tenant_isolation_artifacts" ON "artifacts"
--   USING (
--     organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
--     OR
--     NULLIF(current_setting('app.current_org_id', true), '') IS NULL
--   );

-- 4. gap_analysis table (commented out as it doesn't exist or was renamed)
-- ALTER TABLE "gap_analysis" ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "tenant_isolation_gap_analysis" ON "gap_analysis"
--   USING (
--     organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
--     OR
--     NULLIF(current_setting('app.current_org_id', true), '') IS NULL
--   );

-- 5. poam table (commented out as it doesn't exist or was renamed)
-- ALTER TABLE "poam" ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "tenant_isolation_poam" ON "poam"
--   USING (
--     organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
--     OR
--     NULLIF(current_setting('app.current_org_id', true), '') IS NULL
--   );
