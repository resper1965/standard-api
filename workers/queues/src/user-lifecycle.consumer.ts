/**
 * @module user-lifecycle.consumer
 * @description User lifecycle event handler — simplified auth model (A7).
 *
 * Auth simplification: the domain `users` table was dropped in migration 0048.
 * baUser.id IS the domain identity in the 1:1 model (one user per org).
 *
 * This consumer now functions as a structured audit log only.
 * User provisioning is handled by the auth branch (organization-schema.ts).
 * No DB writes — queue messages are acknowledged and logged for observability.
 */

export interface UserLifecycleMessage {
  event: "user.created" | "user.updated";
  queue_type: "user_lifecycle";
  idempotency_key?: string;
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
  timestamp: string;
}

/** Mask email to prevent PII logging in console logs */
function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return "invalid-email";
  const local = parts[0]!;
  const domain = parts[1]!;
  if (local.length <= 2) {
    return `${local[0] ?? ""}***@${domain}`;
  }
  return `${local[0] ?? ""}***${local[local.length - 1] ?? ""}@${domain}`;
}

/** In-memory dedup cache for idempotency (survives within a single batch). */
const processedKeys = new Set<string>();

export async function processUserLifecycleMessage(
  body: UserLifecycleMessage,
  _env: { DATABASE_URL?: string },
): Promise<void> {
  const traceId = body.idempotency_key ?? body.timestamp ?? crypto.randomUUID();

  // Idempotency check
  if (body.idempotency_key && processedKeys.has(body.idempotency_key)) {
    console.log(
      JSON.stringify({
        level: "info",
        message: "user_lifecycle_deduplicated",
        service: "queue-worker",
        module: "user-lifecycle",
        trace_id: traceId,
        metadata: { idempotency_key: body.idempotency_key, event: body.event },
      }),
    );
    return;
  }

  // Auth simplification: no domain `users` table to write to.
  // baUser.id is the domain identity — logging only.
  console.log(
    JSON.stringify({
      level: "info",
      message: "user_lifecycle_acknowledged",
      service: "queue-worker",
      module: "user-lifecycle",
      trace_id: traceId,
      metadata: {
        event: body.event,
        ba_user_id: body.user.id,
        email: maskEmail(body.user.email),
        note: "simplified-auth/1:1-model — no domain sync required",
      },
    }),
  );

  if (body.idempotency_key) {
    processedKeys.add(body.idempotency_key);
  }
}
