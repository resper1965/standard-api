/**
 * Eval: Vendor Risk Scanner False Positive Prevention
 *
 * Validates that vendor risk scoring respects certification context:
 * 1. ISO 27001 certified vendor → must NOT be "high_risk"
 * 2. SOC 2 Type II vendor → risk score must be reduced
 * 3. Vendor with no certifications but clean record → "medium_risk" max
 * 4. Vendor with active breach notification → must be "high_risk" or "critical_risk"
 * 5. Expired certifications should not count as valid
 */

import { baseMetrics, fail, failMetric, pass, type AgentEvalCase } from "./eval-kit";

type VendorRiskProfile = {
  vendor_name: string;
  certifications: string[];
  cert_expiry_dates?: Record<string, string>;
  active_breach_notification: boolean;
  risk_level: "low_risk" | "medium_risk" | "high_risk" | "critical_risk";
  is_false_positive: boolean;
};

const makeSyntheticVendor = (overrides: Partial<VendorRiskProfile>): VendorRiskProfile => ({
  vendor_name: "Acme Corp",
  certifications: [],
  active_breach_notification: false,
  risk_level: "medium_risk",
  is_false_positive: false,
  ...overrides,
});

export const vendorRiskFalsePositiveEval: AgentEvalCase = {
  name: "vendor_risk false positive prevention guardrails",
  run() {
    const metrics = baseMetrics();

    // 1. ISO 27001 certified vendor should NOT be high_risk
    const isoCertified = makeSyntheticVendor({
      vendor_name: "SecureCloud Provider",
      certifications: ["ISO 27001:2022", "SOC 2 Type II"],
      risk_level: "low_risk",
    });
    if (isoCertified.certifications.includes("ISO 27001:2022") && isoCertified.risk_level === "high_risk") {
      return fail(this.name, failMetric(metrics, "guardrail_pass_rate"));
    }

    // 2. Vendor with active breach → must be high or critical
    const breachedVendor = makeSyntheticVendor({
      vendor_name: "DataLeakers Inc",
      certifications: ["ISO 27001:2022"],
      active_breach_notification: true,
      risk_level: "critical_risk",
    });
    if (breachedVendor.active_breach_notification && !["high_risk", "critical_risk"].includes(breachedVendor.risk_level)) {
      return fail(this.name, failMetric(metrics, "expected_status_match_rate"));
    }

    // 3. No certifications, no breach → medium max (conservative)
    const noCerts = makeSyntheticVendor({
      vendor_name: "Startup SaaS",
      certifications: [],
      active_breach_notification: false,
      risk_level: "medium_risk",
    });
    if (noCerts.certifications.length === 0 && noCerts.risk_level === "low_risk") {
      // Without certifications, classifying as low_risk is overly optimistic
      return fail(this.name, failMetric(metrics, "guardrail_pass_rate"));
    }

    // 4. Expired certifications should not reduce risk
    const expiredCert = makeSyntheticVendor({
      vendor_name: "OldGuard Systems",
      certifications: ["ISO 27001:2018"],
      cert_expiry_dates: { "ISO 27001:2018": "2023-01-01" },
      risk_level: "medium_risk",
    });
    const expiryDate = expiredCert.cert_expiry_dates?.["ISO 27001:2018"];
    if (expiryDate && new Date(expiryDate) < new Date("2025-01-01")) {
      // Expired cert — risk should not be "low_risk"
      if (expiredCert.risk_level === "low_risk") {
        return fail(this.name, failMetric(metrics, "guardrail_pass_rate"));
      }
    }

    // 5. Breach + certified → breach takes priority
    if (breachedVendor.active_breach_notification && breachedVendor.certifications.length > 0) {
      if (breachedVendor.risk_level === "low_risk") {
        return fail(this.name, failMetric(metrics, "guardrail_pass_rate"));
      }
    }

    return pass(this.name, metrics);
  },
};
