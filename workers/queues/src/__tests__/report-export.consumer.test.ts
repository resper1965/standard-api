/**
 * @module report-export.consumer.test
 * @description Tests for report export queue consumer.
 * Validates: schema validation, R2 persistence, tenant-scoped keys, structured logging.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("processReportExportMessage", () => {
  const SYNTHETIC_ORG = "org-00000000-0000-4000-8000-000000000001";
  const SYNTHETIC_ASSESSMENT = "assess-00000000-0000-4000-8000-000000000002";
  const SYNTHETIC_REPORT_VERSION = "rv-00000000-0000-4000-8000-000000000003";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── Schema Validation ──

  it("rejects message missing organization_id", async () => {
    const { ReportExportMessageSchema } = await import("../report-export.consumer");

    const result = ReportExportMessageSchema.safeParse({
      queue_type: "report_export",
      report_version_id: SYNTHETIC_REPORT_VERSION,
      assessment_id: SYNTHETIC_ASSESSMENT,
      format: "json",
      trace_id: "trace-1",
      timestamp: new Date().toISOString(),
    });

    expect(result.success).toBe(false);
  });

  it("rejects message missing report_version_id", async () => {
    const { ReportExportMessageSchema } = await import("../report-export.consumer");

    const result = ReportExportMessageSchema.safeParse({
      queue_type: "report_export",
      organization_id: SYNTHETIC_ORG,
      assessment_id: SYNTHETIC_ASSESSMENT,
      format: "json",
      trace_id: "trace-1",
      timestamp: new Date().toISOString(),
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid message with all required fields", async () => {
    const { ReportExportMessageSchema } = await import("../report-export.consumer");

    const result = ReportExportMessageSchema.safeParse({
      queue_type: "report_export",
      report_version_id: SYNTHETIC_REPORT_VERSION,
      assessment_id: SYNTHETIC_ASSESSMENT,
      organization_id: SYNTHETIC_ORG,
      format: "json",
      trace_id: "trace-1",
      timestamp: new Date().toISOString(),
    });

    expect(result.success).toBe(true);
  });

  it("defaults format to json when not provided", async () => {
    const { ReportExportMessageSchema } = await import("../report-export.consumer");

    const result = ReportExportMessageSchema.safeParse({
      queue_type: "report_export",
      report_version_id: SYNTHETIC_REPORT_VERSION,
      assessment_id: SYNTHETIC_ASSESSMENT,
      organization_id: SYNTHETIC_ORG,
      trace_id: "trace-1",
      timestamp: new Date().toISOString(),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.format).toBe("json");
    }
  });

  // ── R2 Persistence ──

  it("writes rendered report to R2 bucket with tenant-scoped key", async () => {
    const { processReportExportMessage } = await import("../report-export.consumer");

    const putCalls: Array<{ key: string; body: unknown; options: unknown }> = [];
    const mockBucket = {
      put: vi.fn(async (key: string, body: unknown, options: unknown) => {
        putCalls.push({ key, body, options });
      }),
    } as any;

    await processReportExportMessage(
      {
        queue_type: "report_export" as const,
        report_version_id: SYNTHETIC_REPORT_VERSION,
        assessment_id: SYNTHETIC_ASSESSMENT,
        organization_id: SYNTHETIC_ORG,
        format: "json",
        trace_id: "trace-r2",
        timestamp: new Date().toISOString(),
      },
      { STANDARD_REPORTS_BUCKET: mockBucket },
    );

    expect(putCalls).toHaveLength(1);
    const call = putCalls[0]!;
    // Tenant-scoped key
    expect(call.key).toContain(SYNTHETIC_ORG);
    expect(call.key).toContain(SYNTHETIC_ASSESSMENT);
    expect(call.key).toContain(SYNTHETIC_REPORT_VERSION);
    expect(call.key).toMatch(/\.json$/);
  });

  it("uses .md extension for markdown format", async () => {
    const { processReportExportMessage } = await import("../report-export.consumer");

    const putCalls: Array<{ key: string }> = [];
    const mockBucket = {
      put: vi.fn(async (key: string) => {
        putCalls.push({ key });
      }),
    } as any;

    await processReportExportMessage(
      {
        queue_type: "report_export" as const,
        report_version_id: SYNTHETIC_REPORT_VERSION,
        assessment_id: SYNTHETIC_ASSESSMENT,
        organization_id: SYNTHETIC_ORG,
        format: "markdown",
        trace_id: "trace-md",
        timestamp: new Date().toISOString(),
      },
      { STANDARD_REPORTS_BUCKET: mockBucket },
    );

    expect(putCalls[0]!.key).toMatch(/\.md$/);
  });

  it("includes organization metadata in R2 customMetadata", async () => {
    const { processReportExportMessage } = await import("../report-export.consumer");

    const putCalls: Array<{ options: any }> = [];
    const mockBucket = {
      put: vi.fn(async (_key: string, _body: unknown, options: any) => {
        putCalls.push({ options });
      }),
    } as any;

    await processReportExportMessage(
      {
        queue_type: "report_export" as const,
        report_version_id: SYNTHETIC_REPORT_VERSION,
        assessment_id: SYNTHETIC_ASSESSMENT,
        organization_id: SYNTHETIC_ORG,
        format: "json",
        trace_id: "trace-meta",
        timestamp: new Date().toISOString(),
      },
      { STANDARD_REPORTS_BUCKET: mockBucket },
    );

    const meta = putCalls[0]!.options.customMetadata;
    expect(meta.organization_id).toBe(SYNTHETIC_ORG);
    expect(meta.assessment_id).toBe(SYNTHETIC_ASSESSMENT);
    expect(meta.report_version_id).toBe(SYNTHETIC_REPORT_VERSION);
    expect(meta.trace_id).toBe("trace-meta");
  });

  // ── Error Handling ──

  it("throws on missing R2 bucket binding", async () => {
    const { processReportExportMessage } = await import("../report-export.consumer");

    await expect(
      processReportExportMessage(
        {
          queue_type: "report_export" as const,
          report_version_id: SYNTHETIC_REPORT_VERSION,
          assessment_id: SYNTHETIC_ASSESSMENT,
          organization_id: SYNTHETIC_ORG,
          format: "json",
          trace_id: "trace-no-bucket",
          timestamp: new Date().toISOString(),
        },
        {},
      ),
    ).rejects.toThrow(/STANDARD_REPORTS_BUCKET/);
  });

  // ── Structured Logging ──

  it("logs structured completion event with trace_id", async () => {
    const { processReportExportMessage } = await import("../report-export.consumer");

    const consoleSpy = vi.spyOn(console, "log");
    const mockBucket = { put: vi.fn() } as any;

    await processReportExportMessage(
      {
        queue_type: "report_export" as const,
        report_version_id: SYNTHETIC_REPORT_VERSION,
        assessment_id: SYNTHETIC_ASSESSMENT,
        organization_id: SYNTHETIC_ORG,
        format: "json",
        trace_id: "trace-log-test",
        timestamp: new Date().toISOString(),
      },
      { STANDARD_REPORTS_BUCKET: mockBucket },
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("report_export_completed"),
    );
    // Verify structured JSON log
    const logCall = consoleSpy.mock.calls.find((c) =>
      String(c[0]).includes("report_export_completed"),
    );
    expect(logCall).toBeDefined();
    const parsed = JSON.parse(String(logCall![0]));
    expect(parsed.trace_id).toBe("trace-log-test");
    expect(parsed.metadata.format).toBe("json");
  });
});
