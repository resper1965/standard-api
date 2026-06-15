// @ts-nocheck -- Zod v4 CI type compat
import type { EvidenceClassificationResult, GapAnalysisContext, KbSearchResult, SoaItemResponse } from "../types";

const hasConflictSignal = (results: KbSearchResult[]): boolean =>
  results.some((result) => /conflict|conflicting|exception|not implemented|nÃ£o implementad/i.test(result.snippet));

export class EvidenceClassificationService {
  async classifyCandidateEvidence(_soaItem: SoaItemResponse, kbResults: KbSearchResult[], _context: GapAnalysisContext): Promise<EvidenceClassificationResult> {
    if (kbResults.length === 0) {
      return {
        evidence_strength: "absent",
        evidence_status: "not_evidenced",
        evidence_summary: "No candidate evidence was found in the KB search.",
        evidence_limitations: ["Absence of evidence is not evidence of non-implementation."],
        confidence_score: 0
      };
    }

    if (hasConflictSignal(kbResults)) {
      return {
        evidence_strength: "conflicting",
        evidence_status: "conflicting",
        evidence_summary: "Candidate evidence contains conflicting or explicit negative signals.",
        evidence_limitations: ["Requires human validation before a final conclusion."],
        confidence_score: 0.55
      };
    }

    const bestScore = Math.max(...kbResults.map((result) => result.score));
    if (bestScore >= 0.85 && kbResults.length >= 2) {
      return {
        evidence_strength: "strong",
        evidence_status: "candidate",
        evidence_summary: `${kbResults.length} candidate evidence source(s) found with strong retrieval scores.`,
        evidence_limitations: ["Vector similarity is not a compliance conclusion."],
        confidence_score: 0.82
      };
    }
    if (bestScore >= 0.55) {
      return {
        evidence_strength: "partial",
        evidence_status: "candidate",
        evidence_summary: `${kbResults.length} candidate evidence source(s) found with partial coverage.`,
        evidence_limitations: ["Coverage is partial and requires review."],
        confidence_score: 0.68
      };
    }
    return {
      evidence_strength: "weak",
      evidence_status: "insufficient",
      evidence_summary: "Candidate evidence is weak and insufficient for a conclusion.",
      evidence_limitations: ["Low retrieval score; requires validation."],
      confidence_score: 0.35
    };
  }

  determineEvidenceStrength(kbResults: KbSearchResult[]): EvidenceClassificationResult["evidence_strength"] {
    if (kbResults.length === 0) return "absent";
    if (hasConflictSignal(kbResults)) return "conflicting";
    const bestScore = Math.max(...kbResults.map((result) => result.score));
    if (bestScore >= 0.85 && kbResults.length >= 2) return "strong";
    if (bestScore >= 0.55) return "partial";
    return "weak";
  }

  detectConflictingEvidence(kbResults: KbSearchResult[]): boolean {
    return hasConflictSignal(kbResults);
  }

  summarizeEvidence(kbResults: KbSearchResult[]): string {
    return kbResults.length === 0 ? "No candidate evidence found." : `${kbResults.length} candidate evidence source(s) found.`;
  }
}

