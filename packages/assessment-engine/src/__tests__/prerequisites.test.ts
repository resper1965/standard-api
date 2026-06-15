// @ts-nocheck -- Zod v4 CI type compat
import { describe, it, expect } from "vitest";
import { missingPrerequisites, assertPrerequisites } from "../prerequisites";
import { AssessmentEngineError } from "../errors";
import type { AssessmentSnapshot } from "../types";

describe("prerequisites", () => {
  const createMockSnapshot = (overrides: Partial<AssessmentSnapshot> = {}): AssessmentSnapshot => ({
    id: "a1",
    organizationId: "org-1",
    state: "draft",
    documentCount: 0,
    requiredDocumentJobsComplete: false,
    scfPreAnalysisRegistered: false,
    frameworkSelected: false,
    scopeDrafted: false,
    soaDraftVersionComplete: false,
    soaApproved: false,
    soaIngested: false,
    evidenceAnalysisReady: false,
    gapAnalysisDrafted: false,
    gapAnalysisApproved: false,
    maturityAssessed: false,
    maturityApproved: false,
    poamDrafted: false,
    poamApproved: false,
    reportGenerated: false,
    reportApproved: false,
    ...overrides,
  });

  describe("missingPrerequisites", () => {
    it("should require documents for documents_uploaded", () => {
      expect(missingPrerequisites(createMockSnapshot({ documentCount: 0 }), "documents_uploaded")).toEqual(["at_least_one_document"]);
      expect(missingPrerequisites(createMockSnapshot({ documentCount: 1 }), "documents_uploaded")).toEqual([]);
    });

    it("should require document jobs for documents_ingested", () => {
      expect(missingPrerequisites(createMockSnapshot({ requiredDocumentJobsComplete: false }), "documents_ingested")).toEqual(["required_document_jobs_complete_or_skipped"]);
      expect(missingPrerequisites(createMockSnapshot({ requiredDocumentJobsComplete: true }), "documents_ingested")).toEqual([]);
    });

    it("should require pre-analysis for scf_pre_analysis_ready", () => {
      expect(missingPrerequisites(createMockSnapshot({ scfPreAnalysisRegistered: false }), "scf_pre_analysis_ready")).toEqual(["scf_pre_analysis_registered"]);
      expect(missingPrerequisites(createMockSnapshot({ scfPreAnalysisRegistered: true }), "scf_pre_analysis_ready")).toEqual([]);
    });

    it("should require framework selection for framework_selected", () => {
      expect(missingPrerequisites(createMockSnapshot({ frameworkSelected: false }), "framework_selected")).toEqual(["framework_selected"]);
      expect(missingPrerequisites(createMockSnapshot({ frameworkSelected: true }), "framework_selected")).toEqual([]);
    });

    it("should require scope for scope_drafted", () => {
      expect(missingPrerequisites(createMockSnapshot({ scopeDrafted: false }), "scope_drafted")).toEqual(["scope_drafted"]);
      expect(missingPrerequisites(createMockSnapshot({ scopeDrafted: true }), "scope_drafted")).toEqual([]);
    });

    it("should require draft version for soa states", () => {
      expect(missingPrerequisites(createMockSnapshot({ soaDraftVersionComplete: false }), "soa_drafted")).toEqual(["complete_draft_soa_version"]);
      expect(missingPrerequisites(createMockSnapshot({ soaDraftVersionComplete: true }), "soa_drafted")).toEqual([]);
      expect(missingPrerequisites(createMockSnapshot({ soaDraftVersionComplete: false }), "soa_under_review")).toEqual(["complete_draft_soa_version"]);
      expect(missingPrerequisites(createMockSnapshot({ soaDraftVersionComplete: true }), "soa_under_review")).toEqual([]);
    });

    it("should require approved soa for soa_ingested", () => {
      expect(missingPrerequisites(createMockSnapshot({ soaApproved: false }), "soa_ingested")).toEqual(["soa_approved"]);
      expect(missingPrerequisites(createMockSnapshot({ soaApproved: true }), "soa_ingested")).toEqual([]);
    });

    it("should require soa_ingested for evidence_analysis_ready", () => {
      expect(missingPrerequisites(createMockSnapshot({ soaIngested: false }), "evidence_analysis_ready")).toEqual(["soa_ingested_into_kb"]);
      expect(missingPrerequisites(createMockSnapshot({ soaIngested: true }), "evidence_analysis_ready")).toEqual([]);
    });

    it("should require multiple prerequisites for gap_analysis_drafted", () => {
      expect(missingPrerequisites(createMockSnapshot({ soaApproved: false, gapAnalysisDrafted: false }), "gap_analysis_drafted"))
        .toEqual(["soa_approved", "gap_analysis_draft_version"]);
      expect(missingPrerequisites(createMockSnapshot({ soaApproved: true, gapAnalysisDrafted: true }), "gap_analysis_drafted"))
        .toEqual([]);
    });

    it("should require multiple prerequisites for report_generated", () => {
      const snap = createMockSnapshot({ soaApproved: false, gapAnalysisApproved: false, maturityApproved: false, poamApproved: false });
      expect(missingPrerequisites(snap, "report_generated"))
        .toEqual(["soa_approved", "gap_analysis_approved", "maturity_approved", "poam_approved"]);
      
      const completeSnap = createMockSnapshot({ soaApproved: true, gapAnalysisApproved: true, maturityApproved: true, poamApproved: true });
      expect(missingPrerequisites(completeSnap, "report_generated")).toEqual([]);
    });

    it("should require report approved for closed", () => {
      expect(missingPrerequisites(createMockSnapshot({ reportGenerated: true, reportApproved: false }), "closed"))
        .toEqual(["report_generated", "report_approved_or_accepted"]);
      expect(missingPrerequisites(createMockSnapshot({ reportGenerated: true, reportApproved: true }), "closed"))
        .toEqual([]);
    });

    it("should return empty array for default states", () => {
      expect(missingPrerequisites(createMockSnapshot(), "draft")).toEqual([]);
    });
  });

  describe("assertPrerequisites", () => {
    it("should throw AssessmentEngineError when prerequisites are missing", () => {
      expect(() => {
        assertPrerequisites(createMockSnapshot({ documentCount: 0 }), "documents_uploaded");
      }).toThrow(AssessmentEngineError);
      
      try {
        assertPrerequisites(createMockSnapshot({ documentCount: 0 }), "documents_uploaded");
      } catch (e) {
        expect(e).toBeInstanceOf(AssessmentEngineError);
        expect((e as AssessmentEngineError).code).toBe("MISSING_PREREQUISITE");
      }
    });

    it("should not throw when prerequisites are met", () => {
      expect(() => {
        assertPrerequisites(createMockSnapshot({ documentCount: 1 }), "documents_uploaded");
      }).not.toThrow();
    });
  });
});

