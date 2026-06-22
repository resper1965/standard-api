import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Importação dinâmica para permitir reset de módulo entre testes
// O processedKeys Set é estado de módulo — resetar via vi.resetModules()
describe("processMcpToolMessage — contract", () => {
  const mockEnv = {
    AI_GATEWAY_URL: "https://gateway.ai.cloudflare.com/v1/test",
    AI_GATEWAY_TOKEN: "test-token",
    WEBHOOK_SECRET: "test-secret",
    AGENT_RUN_QUEUE: { send: vi.fn() } as any,
  };

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    // Mock fetch to return valid JSON for AI Gateway calls (real implementation calls res.json())
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ result: { response: "{}" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
  });

  it("deve processar tool evaluate-evidence sem lançar excepção", async () => {
    const { processMcpToolMessage } = await import("../mcp-tool.consumer");
    const msg = {
      queue_type: "mcp_tool_async" as const,
      job_id: "job-test-123",
      tool_name: "evaluate-evidence",
      tool_args: { control_id: "AC-1", evidence_text: "Policy document" },
      organization_id: "org-test-456",
      trace_id: "trace-test-789",
      callback_webhook_url: "https://example.com/webhook",
      timestamp: new Date().toISOString(),
    };

    // Deve não lançar excepção — stub retorna resultado, webhook tenta fetch
    // (fetch falhará em test env mas não deve causar throw pois webhook não re-throws)
    await expect(processMcpToolMessage(msg, mockEnv)).resolves.not.toThrow();
  });

  it("deve registar erro estruturado se tool_name desconhecido", async () => {
    const { processMcpToolMessage } = await import("../mcp-tool.consumer");
    const consoleSpy = vi.spyOn(console, "error");
    const msg = {
      queue_type: "mcp_tool_async" as const,
      job_id: "job-unknown",
      tool_name: "tool-inexistente",
      tool_args: {},
      organization_id: "org-test-456",
      trace_id: "trace-test",
      timestamp: new Date().toISOString(),
    };
    await processMcpToolMessage(msg as any, mockEnv);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("mcp_tool_unknown"),
    );
  });

  it("deve usar idempotency_key para dedup dentro do batch", async () => {
    const { processMcpToolMessage } = await import("../mcp-tool.consumer");
    const msg = {
      queue_type: "mcp_tool_async" as const,
      job_id: "job-dedup",
      tool_name: "evaluate-evidence",
      tool_args: {},
      organization_id: "org-test",
      trace_id: "trace-dedup",
      idempotency_key: "idem-key-001",
      timestamp: new Date().toISOString(),
    };
    // Primeira chamada — processa
    await processMcpToolMessage(msg, mockEnv);
    // Segunda chamada com mesma chave — deve ser no-op e logar deduplicated
    const consoleSpy = vi.spyOn(console, "log");
    await processMcpToolMessage(msg, mockEnv);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("mcp_tool_deduplicated"),
    );
  });
});

// ── Webhook delivery contracts ───────────────────────────────────────────────

describe("processMcpToolMessage — webhook HMAC delivery", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("webhook recebe payload com job_id, tool_name e status=completed", async () => {
    vi.resetModules();
    const webhookCalls: Array<{
      url: string;
      body: string;
      headers: Record<string, string>;
    }> = [];

    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      if (String(url).includes("example.com")) {
        webhookCalls.push({
          url,
          body: init.body as string,
          headers: init.headers as Record<string, string>,
        });
        return new Response(null, { status: 200 });
      }
      // AI Gateway stub
      return new Response(
        JSON.stringify({
          result: {
            response: JSON.stringify({
              evaluation: "sufficient",
              confidence: 0.9,
              rationale: "ok",
              recommendations: [],
            }),
          },
        }),
        { status: 200 },
      );
    });

    const { processMcpToolMessage } = await import("../mcp-tool.consumer");
    await processMcpToolMessage(
      {
        queue_type: "mcp_tool_async",
        job_id: "job-wh-001",
        tool_name: "evaluate-evidence",
        tool_args: { assessment_id: "a1", evidence_id: "e1" },
        organization_id: "org-wh",
        trace_id: "trace-wh",
        callback_webhook_url: "https://example.com/hook",
        idempotency_key: `idem-wh-contract-${Date.now()}`,
        timestamp: new Date().toISOString(),
      },
      {
        AI_GATEWAY_URL: "stub",
        AI_GATEWAY_TOKEN: "tok",
        WEBHOOK_SECRET: "test-secret-key-32chars",
      } as any,
    );

    expect(webhookCalls).toHaveLength(1);
    const payload = JSON.parse(webhookCalls[0]!.body);
    expect(payload.job_id).toBe("job-wh-001");
    expect(payload.tool_name).toBe("evaluate-evidence");
    expect(payload.status).toBe("completed");
    expect(payload.result).toBeDefined();
  });

  it("webhook inclui HMAC-SHA256 no header X-Standard-Signature", async () => {
    vi.resetModules();
    const capturedHeaders: Record<string, string>[] = [];

    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      if (String(url).includes("example.com")) {
        capturedHeaders.push(init.headers as Record<string, string>);
        return new Response(null, { status: 200 });
      }
      return new Response(JSON.stringify({ result: { response: "{}" } }), {
        status: 200,
      });
    });

    const { processMcpToolMessage } = await import("../mcp-tool.consumer");
    await processMcpToolMessage(
      {
        queue_type: "mcp_tool_async",
        job_id: "job-hmac-001",
        tool_name: "evaluate-evidence",
        tool_args: {},
        organization_id: "org-hmac",
        trace_id: "trace-hmac",
        callback_webhook_url: "https://example.com/hmac-hook",
        idempotency_key: `idem-hmac-${Date.now()}`,
        timestamp: new Date().toISOString(),
      },
      {
        AI_GATEWAY_URL: "stub",
        AI_GATEWAY_TOKEN: "tok",
        WEBHOOK_SECRET: "super-secret-key",
      } as any,
    );

    expect(capturedHeaders).toHaveLength(1);
    const sig = capturedHeaders[0]!["X-Standard-Signature"];
    expect(sig).toMatch(/^sha256=[0-9a-f]{64}$/);
  });

  it("webhook failure é non-fatal — consumer resolve sem throw", async () => {
    vi.resetModules();
    vi.stubGlobal("fetch", async (url: string) => {
      if (String(url).includes("bad-hook")) throw new Error("Network error");
      return new Response(JSON.stringify({ result: { response: "{}" } }), {
        status: 200,
      });
    });

    const { processMcpToolMessage } = await import("../mcp-tool.consumer");
    await expect(
      processMcpToolMessage(
        {
          queue_type: "mcp_tool_async",
          job_id: "job-fail-wh",
          tool_name: "architect-remediation",
          tool_args: {},
          organization_id: "org-fail",
          trace_id: "trace-fail",
          callback_webhook_url: "https://bad-hook.example.com/hook",
          idempotency_key: `idem-fail-wh-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
        {
          AI_GATEWAY_URL: "stub",
          AI_GATEWAY_TOKEN: "tok",
          WEBHOOK_SECRET: "secret",
        } as any,
      ),
    ).resolves.toBeUndefined();
  });
});

// ── Per-tool contracts ───────────────────────────────────────────────────────

describe("processMcpToolMessage — contratos por tool LLM", () => {
  afterEach(() => vi.unstubAllGlobals());

  const llmTools = [
    "evaluate-evidence",
    "architect-remediation",
    "validar-evidencia-privacidade",
    "calcular-score-risco-terceiro",
  ];

  for (const toolName of llmTools) {
    it(`${toolName} → executa sem throw com AI Gateway stub`, async () => {
      vi.resetModules();
      vi.stubGlobal(
        "fetch",
        async () =>
          new Response(JSON.stringify({ result: { response: "{}" } }), {
            status: 200,
          }),
      );
      const { processMcpToolMessage } = await import("../mcp-tool.consumer");
      await expect(
        processMcpToolMessage(
          {
            queue_type: "mcp_tool_async",
            job_id: `job-${toolName}`,
            tool_name: toolName,
            tool_args: {
              assessment_id: "a1",
              evidence_id: "e1",
              finding_id: "f1",
              evidence_text: "text",
            },
            organization_id: "org-test",
            trace_id: "trace-test",
            idempotency_key: `idem-${toolName}-${Date.now()}`,
            timestamp: new Date().toISOString(),
          },
          { AI_GATEWAY_URL: "stub", AI_GATEWAY_TOKEN: "tok" } as any,
        ),
      ).resolves.toBeUndefined();
    });
  }
});
