// @ts-nocheck -- Zod v4 CI type compat
import type {
  GapFindingResponse,
  GapAnalysisVersionResponse,
} from "@standard/schemas";

// â”€â”€ Maturity Levels (CMMI-inspired 0-5 scale) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const MATURITY_LEVELS = {
  0: {
    name: "Incomplete",
    description: "Control is not implemented or fails to achieve its purpose.",
  },
  1: {
    name: "Initial",
    description:
      "Control is performed ad-hoc. Success depends on individual effort.",
  },
  2: {
    name: "Managed",
    description:
      "Control is planned, performed, and tracked. Basic processes are established.",
  },
  3: {
    name: "Defined",
    description:
      "Control follows a standardized, documented process across the organization.",
  },
  4: {
    name: "Quantitatively Managed",
    description:
      "Control performance is measured with quantitative objectives.",
  },
  5: {
    name: "Optimizing",
    description:
      "Control is continuously improved based on quantitative feedback.",
  },
} as const;

export type MaturityLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type MaturityLevelName = (typeof MATURITY_LEVELS)[MaturityLevel]["name"];

// â”€â”€ Domain Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type MaturityContext = {
  organizationId: string;
  assessmentId: string;
  actorId?: string;
  agentRunId?: string;
  traceId: string;
};

export type MaturityScore = {
  id: string;
  organizationId: string;
  assessmentId: string;
  maturityAssessmentVersionId: string;
  scfControlId: string;
  score: MaturityLevel;
  confidenceScore: number;
  rationale: string;
  evidenceCoverage: number;
};

export type MaturityAssessmentVersion = {
  id: string;
  organizationId: string;
  assessmentId: string;
  versionNumber: number;
  status:
    | "draft"
    | "under_review"
    | "approved"
    | "rejected"
    | "superseded"
    | "archived";
  approvalEventId?: string | undefined;
  createdByAgentRunId?: string | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
};

export type MaturitySummary = {
  averageScore: number;
  medianScore: number;
  minScore: number;
  maxScore: number;
  totalControls: number;
  scoredControls: number;
  levelDistribution: Record<MaturityLevel, number>;
};

// â”€â”€ Classification Input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type MaturityClassificationInput = {
  scfControlId: string;
  controlCode: string;
  controlTitle: string;
  gapStatus: GapFindingResponse["assessment_status"];
  gapType?: GapFindingResponse["gap_type"];
  evidenceStrength?:
    | "strong"
    | "partial"
    | "weak"
    | "absent"
    | "conflicting"
    | "not_checked";
  evidenceCoverage: number;
  hasDocumentation: boolean;
  hasProcess: boolean;
  hasMeasurement: boolean;
  hasContinuousImprovement: boolean;
  rubrics?: {
    level: number;
    criteriaText: string;
    remediationGuidance?: string | null;
  }[];
};

// â”€â”€ Repository Interfaces â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type MaturityVersionRepository = {
  save(version: MaturityAssessmentVersion): Promise<void>;
  update(version: MaturityAssessmentVersion): Promise<void>;
  get(
    versionId: string,
    organizationId: string,
  ): Promise<MaturityAssessmentVersion | null>;
  listByAssessment(
    assessmentId: string,
    organizationId: string,
  ): Promise<MaturityAssessmentVersion[]>;
};

export type MaturityScoreRepository = {
  saveMany(scores: MaturityScore[]): Promise<void>;
  update(score: MaturityScore): Promise<void>;
  get(scoreId: string, organizationId: string): Promise<MaturityScore | null>;
  listByVersion(
    maturityAssessmentVersionId: string,
    organizationId: string,
  ): Promise<MaturityScore[]>;
};

export type MaturityRepositories = {
  versions: MaturityVersionRepository;
  scores: MaturityScoreRepository;
};

// â”€â”€ Dependencies â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type MaturityDependencies = {
  repositories: MaturityRepositories;
  getApprovedGapAnalysis: (
    assessmentId: string,
    organizationId: string,
  ) => Promise<{
    version: GapAnalysisVersionResponse;
    findings: GapFindingResponse[];
  } | null>;
  getMaturityCriteriaForControl?: (
    controlId: string,
  ) => Promise<
    {
      level: number;
      criteriaText: string;
      remediationGuidance?: string | null;
    }[]
  >;
};

