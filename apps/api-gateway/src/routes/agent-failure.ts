import { ApiError } from "../errors/api-error";

/**
 * Turns a failure inside an agent-backed route into an ApiError, logging it
 * first.
 *
 * The seven routes that call a language model each carried their own copy of
 * this block. Identical apart from the label, and already drifting: one copy
 * wrapped its console.error across four lines while the others used one, and
 * the audit reported them as separate clone groups because of it. Seven copies
 * of an error path is seven chances for one of them to stop reporting the way
 * the others do.
 *
 * Declared `never` so a caller can `catch (e) { agentFailure(...) }` without
 * TypeScript losing track of the fact that the branch ends.
 */
export function agentFailure(
  route: string,
  operation: string,
  error: unknown,
): never {
  console.error(`[${route}] Failure:`, error);

  // An ApiError already carries the status and message the handler intended -
  // re-wrapping it would bury a 400 inside a 500.
  if (error instanceof ApiError) throw error;

  const detail = error instanceof Error ? error.message : String(error);
  throw new ApiError(
    "INTERNAL_ERROR",
    `${operation} failed: ${detail}`,
    500,
    error instanceof Error ? [error.message] : [],
  );
}
