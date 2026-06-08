/**
 * @module user-lifecycle.consumer
 * @description Processes user lifecycle events from Better Auth databaseHooks.
 * Provisions domain `users` rows and syncs email/name changes.
 *
 * Features:
 * - Idempotent: uses upsert by email + idempotency_key dedup
 * - Observable: structured logging with trace propagation
 * - Resilient: graceful error handling, no throws (queue retries on failure)
 */
import { eq } from "drizzle-orm";
import { users } from "@standard/schemas";

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
    const first = local[0] || "";
    return `${first}***@${domain}`;
  }
  const first = local[0] || "";
  const last = local[local.length - 1] || "";
  return `${first}***${last}@${domain}`;
}

/** In-memory dedup cache for idempotency (survives within a single batch). */
const processedKeys = new Set<string>();

export async function processUserLifecycleMessage(
  body: UserLifecycleMessage,
  env: { DATABASE_URL?: string },
): Promise<void> {
  const startTime = Date.now();
  const traceId = body.idempotency_key ?? body.timestamp ?? crypto.randomUUID();

  if (!env.DATABASE_URL) {
    console.warn(
      JSON.stringify({
        level: "warn",
        message: "user_lifecycle_skipped",
        service: "queue-worker",
        module: "user-lifecycle",
        trace_id: traceId,
        metadata: { reason: "DATABASE_URL not set" },
      }),
    );
    return;
  }

  // Idempotency check: skip if we've already processed this key in this batch
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

  // Dynamic import to avoid top-level side effects
  const { neon } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-http");
  const sql = neon(env.DATABASE_URL);
  const db = drizzle({ client: sql });

  const { event, user } = body;
  const email = user.email;
  const displayName = user.name || "User";

  try {
    if (event === "user.created") {
      // Upsert: create domain user if not exists
      const [existing] = await db
        .select({
          id: users.id,
          identityProviderSubject: users.identityProviderSubject,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existing) {
        // Link identityProviderSubject if not already linked
        if (existing.identityProviderSubject !== user.id) {
          await db
            .update(users)
            .set({ identityProviderSubject: user.id })
            .where(eq(users.id, existing.id));

          console.log(
            JSON.stringify({
              level: "info",
              message: "user_lifecycle_linked",
              service: "queue-worker",
              module: "user-lifecycle",
              trace_id: traceId,
              metadata: {
                ba_user_id: user.id,
                domain_user_id: existing.id,
                email: maskEmail(email),
                duration_ms: Date.now() - startTime,
              },
            }),
          );
          // Audit trail: structured log for observability pipeline capture
          console.log(
            JSON.stringify({
              level: "info",
              message: "audit.system.user.linked",
              service: "queue-worker",
              module: "audit",
              trace_id: traceId,
              metadata: {
                action: "domain_user_linked",
                actor: "system:queue-worker",
                ba_user_id: user.id,
                domain_user_id: existing.id,
                email: maskEmail(email),
                source: "user_lifecycle_queue",
              },
            }),
          );
        } else {
          console.log(
            JSON.stringify({
              level: "info",
              message: "user_lifecycle_already_linked",
              service: "queue-worker",
              module: "user-lifecycle",
              trace_id: traceId,
              metadata: {
                ba_user_id: user.id,
                domain_user_id: existing.id,
                email: maskEmail(email),
              },
            }),
          );
        }
      } else {
        const [inserted] = await db
          .insert(users)
          .values({
            email,
            displayName,
            identityProvider: "standard-native-auth",
            identityProviderSubject: user.id,
          })
          .returning({ id: users.id });

        console.log(
          JSON.stringify({
            level: "info",
            message: "user_lifecycle_provisioned",
            service: "queue-worker",
            module: "user-lifecycle",
            trace_id: traceId,
            metadata: {
              ba_user_id: user.id,
              domain_user_id: inserted?.id,
              email: maskEmail(email),
              duration_ms: Date.now() - startTime,
            },
          }),
        );
        // Audit trail
        console.log(
          JSON.stringify({
            level: "info",
            message: "audit.system.user.provisioned",
            service: "queue-worker",
            module: "audit",
            trace_id: traceId,
            metadata: {
              action: "domain_user_provisioned",
              actor: "system:queue-worker",
              ba_user_id: user.id,
              domain_user_id: inserted?.id,
              email: maskEmail(email),
              source: "user_lifecycle_queue",
            },
          }),
        );
      }
    } else if (event === "user.updated") {
      // Sync email and displayName
      await db
        .update(users)
        .set({
          email,
          displayName,
          updatedAt: new Date(),
        })
        .where(eq(users.identityProviderSubject, user.id));

      console.log(
        JSON.stringify({
          level: "info",
          message: "user_lifecycle_synced",
          service: "queue-worker",
          module: "user-lifecycle",
          trace_id: traceId,
          metadata: {
            ba_user_id: user.id,
            email: maskEmail(email),
            event: "user.updated",
            duration_ms: Date.now() - startTime,
          },
        }),
      );
      // Audit trail
      console.log(
        JSON.stringify({
          level: "info",
          message: "audit.system.user.synced",
          service: "queue-worker",
          module: "audit",
          trace_id: traceId,
          metadata: {
            action: "domain_user_synced",
            actor: "system:queue-worker",
            ba_user_id: user.id,
            email: maskEmail(email),
            source: "user_lifecycle_queue",
          },
        }),
      );
    }

    // Mark as processed for in-batch dedup
    if (body.idempotency_key) {
      processedKeys.add(body.idempotency_key);
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "user_lifecycle_failed",
        service: "queue-worker",
        module: "user-lifecycle",
        trace_id: traceId,
        metadata: {
          ba_user_id: user.id,
          email: maskEmail(email),
          event,
          error: err instanceof Error ? err.message : String(err),
          duration_ms: Date.now() - startTime,
        },
      }),
    );
    // Re-throw to trigger queue retry
    throw err;
  }
}
