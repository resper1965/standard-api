/**
 * SSL mode for a postgres.js connection, decided from the URL.
 *
 * Every script here used to hardcode `ssl: "require"`. That is right for Neon
 * and wrong for the Postgres that `docker compose` starts, which speaks no TLS
 * — so `pnpm db:seed:scf`, the command the README tells you to run right after
 * `pnpm db:migrate`, died with ECONNRESET against the database it had just
 * migrated. `migrate.ts` worked only because it passes no `ssl` option at all
 * and lets the connection string decide.
 *
 * Removing the option everywhere would have matched migrate.ts, but it would
 * also downgrade any deployment whose URL omits `sslmode` from encrypted to
 * plaintext without saying so. So the default stays `require`, and only a
 * loopback host opts out.
 */
export const sslForDatabaseUrl = (databaseUrl: string): "require" | false => {
  let host: string;
  try {
    host = new URL(databaseUrl).hostname;
  } catch {
    // Not a parseable URL — keep the encrypted default rather than guessing.
    return "require";
  }
  return host === "localhost" || host === "127.0.0.1" || host === "::1"
    ? false
    : "require";
};
