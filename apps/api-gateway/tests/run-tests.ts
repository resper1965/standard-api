import "./health.test";
import "./assessments.test";
import "./lifecycle.test";
import "./approvals.test";
import "./documents.test";
import "./document-reprocessing-verify.test";
import "./kb.test";
import "./scf.test";
import "./soa.test";
import "./gap-analysis.test";
import "./poam.test";
import "./reporting.test";
import "./agent-runtime.test";
import "./workflow.test";
import "./api-security.test";
import "./observability.test";
import "./auth.test";
import "./rate-limit.test";
import "./intelligence.test";
import "./organizations-mgmt.test";
import "./mcp.test";
import "./critical.test"; // adversarial: tenant isolation, concurrency, security, contracts
import "./m2m-rbac-integration.test"; // regression: M2M wildcard key + RBAC + SecurityEvent logging
import "./llm-provider-validation.test"; // regression: mock LLM fallback + evidence evaluation
import { runTests } from "./test-kit";

await runTests();
