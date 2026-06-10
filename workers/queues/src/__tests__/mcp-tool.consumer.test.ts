import { describe, it, expect, vi, beforeEach } from "vitest";

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
    // Mock fetch to prevent real HTTP calls in test env (webhook delivery)
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 200 })),
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
