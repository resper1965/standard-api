import { z } from "zod";
import {
  AgentRuntimeContextSchema,
  type AgentToolName,
  type FunctionalAgentId
} from "@aegis/schemas";

export type FunctionalAgentContract = {
  agent_id: FunctionalAgentId;
  display_name: string;
  responsibility: string;
  allowed_tools: AgentToolName[];
  forbidden_actions: string[];
  requires_human_approval_for: string[];
};

export type AgentToolContract = {
  tool_name: AgentToolName;
  description: string;
  risk_level: "low" | "medium" | "high";
  input_schema: z.ZodType;
};

const TenantScopedInputSchema = AgentRuntimeContextSchema.extend({
  query: z.string().min(1).optional(),
  top_k: z.number().int().min(1).max(20).optional(),
  artifact_type: z.string().min(1).optional(),
  artifact_version_id: z.string().uuid().optional(),
  gate: z.string().min(1).optional()
});

export const AGENT_TOOL_CONTRACTS: AgentToolContract[] = [
  {
    tool_name: "assessment_state_read",
    description: "Read the current tenant-scoped assessment state.",
    risk_level: "low",
    input_schema: TenantScopedInputSchema
  },
  {
    tool_name: "artifact_version_read",
    description: "Read an approved or draft artifact version within the assessment context.",
    risk_level: "low",
    input_schema: TenantScopedInputSchema
  },
  {
    tool_name: "scf_control_lookup",
    description: "Read structured SCF controls from the normative SCF data layer.",
    risk_level: "low",
    input_schema: TenantScopedInputSchema
  },
  {
    tool_name: "scf_mapping_lookup",
    description: "Read official SCF mappings when they exist in the structured SCF data layer.",
    risk_level: "low",
    input_schema: TenantScopedInputSchema
  },
  {
    tool_name: "kb_evidence_search",
    description: "Retrieve candidate customer evidence from the KB without making compliance decisions.",
    risk_level: "medium",
    input_schema: TenantScopedInputSchema.extend({
      query: z.string().min(1),
      top_k: z.number().int().min(1).max(20).default(5)
    })
  },
  {
    tool_name: "artifact_draft_create",
    description: "Create a draft artifact that still requires schema validation and review.",
    risk_level: "high",
    input_schema: TenantScopedInputSchema
  },
  {
    tool_name: "validation_result_write",
    description: "Write validation findings for a draft output without approving it.",
    risk_level: "medium",
    input_schema: TenantScopedInputSchema
  },
  {
    tool_name: "approval_event_create",
    description: "Reserved human approval tool; functional agents cannot use it directly.",
    risk_level: "high",
    input_schema: TenantScopedInputSchema.extend({
      gate: z.string().min(1)
    })
  }
];

export const FUNCTIONAL_AGENT_CONTRACTS: FunctionalAgentContract[] = [
  {
    agent_id: "knowledge_steward",
    display_name: "Aegis Knowledge Steward",
    responsibility: "Organize KB evidence and metadata without deciding compliance.",
    allowed_tools: ["assessment_state_read", "artifact_version_read", "kb_evidence_search", "validation_result_write"],
    forbidden_actions: ["Decide compliance final", "Create approval events", "Create official SCF mappings"],
    requires_human_approval_for: ["KB ingestion acceptance when used in final artifacts"]
  },
  {
    agent_id: "scf_control_analyst",
    display_name: "Aegis SCF Control Analyst",
    responsibility: "Analyze SCF controls and structured control context.",
    allowed_tools: ["assessment_state_read", "scf_control_lookup", "scf_mapping_lookup", "artifact_version_read"],
    forbidden_actions: ["Invent official mappings", "Write final findings"],
    requires_human_approval_for: ["Control interpretation used in final reports"]
  },
  {
    agent_id: "framework_mapper",
    display_name: "Aegis Framework Mapper",
    responsibility: "Read official mappings and identify missing mapping coverage.",
    allowed_tools: ["assessment_state_read", "scf_control_lookup", "scf_mapping_lookup", "validation_result_write"],
    forbidden_actions: ["Create official mappings", "Invent crosswalks"],
    requires_human_approval_for: ["Derived or consultative mapping notes"]
  },
  {
    agent_id: "scope_soa_architect",
    display_name: "Aegis Scope & SoA Architect",
    responsibility: "Draft scope and SoA artifacts for human review.",
    allowed_tools: ["assessment_state_read", "artifact_version_read", "scf_control_lookup", "scf_mapping_lookup", "artifact_draft_create", "validation_result_write"],
    forbidden_actions: ["Approve SoA", "Bypass SoA review"],
    requires_human_approval_for: ["SoA approval"]
  },
  {
    agent_id: "evidence_analyst",
    display_name: "Aegis Evidence Analyst",
    responsibility: "Classify evidence strength and limitations.",
    allowed_tools: ["assessment_state_read", "artifact_version_read", "kb_evidence_search", "validation_result_write"],
    forbidden_actions: ["Treat absence of evidence as absence of implementation", "Write final findings"],
    requires_human_approval_for: ["Evidence conclusions in final Gap Analysis"]
  },
  {
    agent_id: "gap_analyst",
    display_name: "Aegis Gap Analyst",
    responsibility: "Draft gap findings from approved SoA and evidence analysis.",
    allowed_tools: ["assessment_state_read", "artifact_version_read", "kb_evidence_search", "artifact_draft_create", "validation_result_write"],
    forbidden_actions: ["Approve Gap Analysis", "Write final Gap Analysis without validation"],
    requires_human_approval_for: ["Final Gap Analysis approval"]
  },
  {
    agent_id: "maturity_assessor",
    display_name: "Aegis Maturity Assessor",
    responsibility: "Suggest maturity scores with rationale and confidence.",
    allowed_tools: ["assessment_state_read", "artifact_version_read", "kb_evidence_search", "artifact_draft_create", "validation_result_write"],
    forbidden_actions: ["Approve maturity assessment", "Hide limitations"],
    requires_human_approval_for: ["Maturity Assessment approval"]
  },
  {
    agent_id: "poam_planner",
    display_name: "Aegis POA&M Planner",
    responsibility: "Draft remediation plans from approved gaps.",
    allowed_tools: ["assessment_state_read", "artifact_version_read", "artifact_draft_create", "validation_result_write"],
    forbidden_actions: ["Approve POA&M", "Publish remediation commitments without review"],
    requires_human_approval_for: ["POA&M approval"]
  },
  {
    agent_id: "report_writer",
    display_name: "Aegis Assessment Report Writer",
    responsibility: "Compose reports from approved artifacts without changing findings.",
    allowed_tools: ["assessment_state_read", "artifact_version_read", "artifact_draft_create", "validation_result_write"],
    forbidden_actions: ["Alter approved findings", "Approve reports"],
    requires_human_approval_for: ["Report approval and publication"]
  }
];
