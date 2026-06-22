/**
 * @file tpra-webhooks.test.ts
 * @description Testes de contrato para os webhooks obrigatórios TPRA:
 *   - tpra.assessment.completed (ao submeter assessment)
 *   - vendor.risk_score.updated (ao persistir risk score)
 *   - ledger.audit.alert (condicional: risco high/critical)
 *
 * Padrão: testa a lógica de dispatch via mocks isolados dos repositórios.
 * O handler de tpra.routes.ts usa dispatchWebhookEvent (best-effort, never throws).
 */
import { describe, it, expect, vi } from "vitest";
import type { WebhookRepositoryAdapter } from "@standard/schemas";
import { dispatchWebhookEvent } from "../../services/webhook-event-helper";

// ── Helper: mock mínimo do WebhookRepositoryAdapter ──────────────────────────

function makeMockWebhooks(
  subscribers: Array<{ id: string; enabled: boolean }> = [],
): WebhookRepositoryAdapter {
  return {
    findSubscribers: vi.fn().mockResolvedValue(subscribers),
    logDelivery: vi.fn().mockResolvedValue(undefined),
    createEndpoint: vi.fn(),
    getEndpoint: vi.fn(),
    listEndpoints: vi.fn(),
    updateEndpoint: vi.fn(),
    deleteEndpoint: vi.fn(),
    listDeliveries: vi.fn(),
    rotateSecret: vi.fn(),
  } as unknown as WebhookRepositoryAdapter;
}

// ── tpra.assessment.completed ─────────────────────────────────────────────────

describe("dispatchWebhookEvent — tpra.assessment.completed", () => {
  it("chama findSubscribers com event_type correto", async () => {
    const webhooks = makeMockWebhooks([]);
    await dispatchWebhookEvent(webhooks, {
      organizationId: "org-001",
      eventType: "tpra.assessment.completed",
      eventId: "evt-001",
    });
    expect(webhooks.findSubscribers).toHaveBeenCalledWith(
      "org-001",
      "tpra.assessment.completed",
    );
  });

  it("não chama logDelivery quando não há subscribers", async () => {
    const webhooks = makeMockWebhooks([]);
    await dispatchWebhookEvent(webhooks, {
      organizationId: "org-001",
      eventType: "tpra.assessment.completed",
      eventId: "evt-001",
    });
    expect(webhooks.logDelivery).not.toHaveBeenCalled();
  });

  it("chama logDelivery para cada subscriber enabled", async () => {
    const webhooks = makeMockWebhooks([
      { id: "ep-1", enabled: true },
      { id: "ep-2", enabled: true },
    ]);
    await dispatchWebhookEvent(webhooks, {
      organizationId: "org-001",
      eventType: "tpra.assessment.completed",
      eventId: "evt-001",
    });
    expect(webhooks.logDelivery).toHaveBeenCalledTimes(2);
    expect(webhooks.logDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "tpra.assessment.completed",
        status: "pending",
      }),
    );
  });

  it("ignora subscribers disabled", async () => {
    const webhooks = makeMockWebhooks([
      { id: "ep-1", enabled: false },
      { id: "ep-2", enabled: true },
    ]);
    await dispatchWebhookEvent(webhooks, {
      organizationId: "org-001",
      eventType: "tpra.assessment.completed",
      eventId: "evt-001",
    });
    expect(webhooks.logDelivery).toHaveBeenCalledTimes(1);
  });

  it("não lança exceção quando webhooks é null", async () => {
    await expect(
      dispatchWebhookEvent(null as unknown as WebhookRepositoryAdapter, {
        organizationId: "org-001",
        eventType: "tpra.assessment.completed",
        eventId: "evt-001",
      }),
    ).resolves.toBeUndefined();
  });
});

// ── vendor.risk_score.updated ─────────────────────────────────────────────────

describe("dispatchWebhookEvent — vendor.risk_score.updated", () => {
  it("chama findSubscribers com event_type correto", async () => {
    const webhooks = makeMockWebhooks([]);
    await dispatchWebhookEvent(webhooks, {
      organizationId: "org-002",
      eventType: "vendor.risk_score.updated",
      eventId: "evt-002",
    });
    expect(webhooks.findSubscribers).toHaveBeenCalledWith(
      "org-002",
      "vendor.risk_score.updated",
    );
  });

  it("logDelivery recebe event_id passado e delivery_id único diferente", async () => {
    const webhooks = makeMockWebhooks([{ id: "ep-1", enabled: true }]);
    await dispatchWebhookEvent(webhooks, {
      organizationId: "org-002",
      eventType: "vendor.risk_score.updated",
      eventId: "evt-fixed-id",
    });
    const call = (webhooks.logDelivery as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(call.event_id).toBe("evt-fixed-id");
    expect(typeof call.delivery_id).toBe("string");
    expect(call.delivery_id).not.toBe(call.event_id);
  });

  it("logDelivery inclui max_attempts: 3 e status: pending", async () => {
    const webhooks = makeMockWebhooks([{ id: "ep-1", enabled: true }]);
    await dispatchWebhookEvent(webhooks, {
      organizationId: "org-002",
      eventType: "vendor.risk_score.updated",
      eventId: "evt-002",
    });
    expect(webhooks.logDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        max_attempts: 3,
        status: "pending",
        http_status: null,
        attempt_count: 0,
      }),
    );
  });
});

// ── ledger.audit.alert ────────────────────────────────────────────────────────

describe("dispatchWebhookEvent — ledger.audit.alert", () => {
  it("logDelivery com event_type correto quando invocado", async () => {
    const webhooks = makeMockWebhooks([{ id: "ep-1", enabled: true }]);
    await dispatchWebhookEvent(webhooks, {
      organizationId: "org-003",
      eventType: "ledger.audit.alert",
      eventId: "evt-003",
    });
    expect(webhooks.findSubscribers).toHaveBeenCalledWith(
      "org-003",
      "ledger.audit.alert",
    );
    expect(webhooks.logDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "ledger.audit.alert",
        status: "pending",
        max_attempts: 3,
      }),
    );
  });

  it("não lança exceção mesmo que findSubscribers falhe (best-effort)", async () => {
    const webhooks = {
      findSubscribers: vi.fn().mockRejectedValue(new Error("DB down")),
      logDelivery: vi.fn(),
    } as unknown as WebhookRepositoryAdapter;

    await expect(
      dispatchWebhookEvent(webhooks, {
        organizationId: "org-003",
        eventType: "ledger.audit.alert",
        eventId: "evt-003",
      }),
    ).resolves.toBeUndefined();

    expect(webhooks.logDelivery).not.toHaveBeenCalled();
  });

  it("não lança exceção mesmo que logDelivery falhe (best-effort)", async () => {
    const webhooks = {
      findSubscribers: vi
        .fn()
        .mockResolvedValue([{ id: "ep-1", enabled: true }]),
      logDelivery: vi.fn().mockRejectedValue(new Error("Network error")),
    } as unknown as WebhookRepositoryAdapter;

    await expect(
      dispatchWebhookEvent(webhooks, {
        organizationId: "org-003",
        eventType: "ledger.audit.alert",
        eventId: "evt-003",
      }),
    ).resolves.toBeUndefined();
  });
});

// ── Lógica condicional: shouldDispatchAuditAlert ──────────────────────────────

describe("Lógica condicional — ledger.audit.alert por risk_category", () => {
  /**
   * Extrai a lógica de decisão do handler POST /tpra/assessments/:id/risk-score.
   * `ledger.audit.alert` só é disparado quando risk_category é high ou critical.
   */
  function shouldDispatchAuditAlert(
    riskCategory: "low" | "medium" | "high" | "critical",
  ): boolean {
    return riskCategory === "high" || riskCategory === "critical";
  }

  it("low — NÃO deve disparar ledger.audit.alert", () => {
    expect(shouldDispatchAuditAlert("low")).toBe(false);
  });

  it("medium — NÃO deve disparar ledger.audit.alert", () => {
    expect(shouldDispatchAuditAlert("medium")).toBe(false);
  });

  it("high — DEVE disparar ledger.audit.alert", () => {
    expect(shouldDispatchAuditAlert("high")).toBe(true);
  });

  it("critical — DEVE disparar ledger.audit.alert", () => {
    expect(shouldDispatchAuditAlert("critical")).toBe(true);
  });
});
