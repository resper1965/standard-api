export const sanitizeErrorDetails = (details: unknown[]): unknown[] =>
  details.map((detail) => {
    if (!detail || typeof detail !== "object") return detail;
    const copy = { ...(detail as Record<string, unknown>) };
    delete copy.stack;
    delete copy.sql;
    delete copy.token;
    delete copy.api_key;
    delete copy.secret;
    return copy;
  });
