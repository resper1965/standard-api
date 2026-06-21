import { describe, it, expect, vi } from "vitest";
import { dispatchWebhookEvent } from "../webhook-event-helper";

describe("dispatchWebhookEvent", () => {
  it("should call findSubscribers and logDelivery for each enabled endpoint", async () => {
    const mockWebhooks = {
      findSubscribers: vi.fn().mockResolvedValue([
        { id: "ep-1", enabled: true },
        { id: "ep-2", enabled: false },
      ]),
      logDelivery: vi.fn().mockResolvedValue(undefined),
    };

    await dispatchWebhookEvent(mockWebhooks as any, {
      organizationId: "org-1",
      eventType: "soa.approved",
      eventId: "evt-1",
    });

    expect(mockWebhooks.findSubscribers).toHaveBeenCalledWith(
      "org-1",
      "soa.approved",
    );
    expect(mockWebhooks.logDelivery).toHaveBeenCalledTimes(1); // only ep-1 (enabled)
    expect(mockWebhooks.logDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint_id: "ep-1",
        event_type: "soa.approved",
        status: "pending",
      }),
    );
  });

  it("should silently catch errors (best-effort)", async () => {
    const mockWebhooks = {
      findSubscribers: vi.fn().mockRejectedValue(new Error("DB down")),
      logDelivery: vi.fn(),
    };

    // Should NOT throw
    await dispatchWebhookEvent(mockWebhooks as any, {
      organizationId: "org-1",
      eventType: "soa.approved",
      eventId: "evt-1",
    });

    expect(mockWebhooks.logDelivery).not.toHaveBeenCalled();
  });

  it("should no-op when webhooks is null/undefined", async () => {
    // Should NOT throw
    await dispatchWebhookEvent(null as any, {
      organizationId: "org-1",
      eventType: "soa.approved",
      eventId: "evt-1",
    });

    await dispatchWebhookEvent(undefined as any, {
      organizationId: "org-1",
      eventType: "gap.approved",
      eventId: "evt-2",
    });
  });
});
