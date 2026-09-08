import { SYNTHETIC_FRAMEWORK_ID } from "@standard/scf-core";
import { createTestClient, ids } from "./helpers";
import { expect, test } from "./test-kit";

// ADR-001, the same contract the dashboard and intelligence endpoints adopted:
// absence is reported as absence, never as a number standing in for it.
//
// This endpoint computes its own percentage from status counts and used to
// return 0 when nothing had been assessed — rendered as "Critical compliance
// gaps (0%). Framework readiness is insufficient." A framework the STRM bundle
// does not cover now legitimately grades nothing, so that 0 would have put this
// route in direct contradiction with the dashboard, which declines to score it,
// in front of the same customer.
test("GET /assessments/:id/projection/:frameworkId não publica 0% quando nada é avaliável", async () => {
  const client = createTestClient();
  const created = await client.createAssessment();

  const projection = await client.send(
    `/api/v1/assessments/${created.assessmentId}/projection/${SYNTHETIC_FRAMEWORK_ID}`,
    "GET",
    undefined,
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );

  expect(projection.response.status).toBe(200);

  const summary = projection.body.data.summary as {
    total_requirements: number;
    compliant: number;
    partially_compliant: number;
    non_compliant: number;
    compliance_percentage: number | null;
    compliance_percentage_reason: string | null;
  };

  // Nothing has been assessed on a freshly created assessment.
  expect(summary.compliant + summary.partially_compliant + summary.non_compliant).toBe(0);
  expect(summary.compliance_percentage).toBe(null);
  expect(summary.compliance_percentage_reason).toBe("nothing_assessable");

  // The prose must not claim a posture either — this is the half a reader
  // actually sees, and "Critical compliance gaps (0%)" was the wrong claim.
  const interpretation = projection.body.data.interpretation as string;
  expect(interpretation.includes("Critical compliance gaps")).toBe(false);
  expect(interpretation.includes("no compliance figure can be produced")).toBe(
    true,
  );
});
