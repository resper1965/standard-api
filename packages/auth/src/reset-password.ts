/**
 * @module @standard/auth/reset-password
 * @description Recuperação de acesso out-of-band — define a password de um
 * utilizador directamente na auth DB, sem depender do email de reset.
 *
 * Existe porque o fluxo "Forgot password" depende do binding `send_email`
 * (`env.EMAIL`), que não está configurado em nenhum ambiente do wrangler.toml —
 * o Better Auth devolve sucesso e o email nunca sai.
 *
 * Uso (a partir da raiz do repo):
 *   AUTH_DATABASE_URL="postgres://..." \
 *     pnpm tsx packages/auth/src/reset-password.ts <email> '<nova-password>'
 *
 * Também marca `email_verified = true`, senão o `requireEmailVerification: true`
 * bloqueia o login. Não mexe em `approved` nem em `platform_admin` — imprime-os
 * para se saber se o approval gate do middleware vai devolver 403.
 */
import { neon } from "@neondatabase/serverless";
import { hashPassword } from "@better-auth/utils/password";

const [email, password] = process.argv.slice(2);
const url = process.env.AUTH_DATABASE_URL;

// The annotation is on the variable, not just the arrow: that is what makes
// TypeScript treat a call to it as terminating the control flow, so everything
// below is narrowed instead of being littered with non-null assertions.
const die: (msg: string) => never = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

if (!email || !password) die("uso: reset-password.ts <email> <nova-password>");
if (!url) die("AUTH_DATABASE_URL não definido");

// Mesmas regras do hook `before` em auth.ts — para a password nova não ficar
// impossível de trocar depois via /change-password.
const missing = [
  [/[A-Z]/, "uppercase letter"],
  [/[a-z]/, "lowercase letter"],
  [/[0-9]/, "number"],
  [/[^A-Za-z0-9]/, "special character"],
] as const;
const errors: string[] = missing
  .filter(([re]) => !re.test(password))
  .map(([, m]) => m);
if (password.length < 12) errors.unshift("12+ characters");
if (errors.length) die(`password requer: ${errors.join(", ")}`);

const sql = neon(url);
const normalized = email.trim().toLowerCase();

const [user] = (await sql`
  SELECT id, email, email_verified, approved, platform_admin
  FROM "user" WHERE lower(email) = ${normalized}
`) as Array<{
  id: string;
  email: string;
  email_verified: boolean;
  approved: boolean;
  platform_admin: boolean;
}>;

if (!user) die(`utilizador não encontrado: ${normalized}`);

const hash = await hashPassword(password);

const updated = await sql`
  UPDATE account SET password = ${hash}, updated_at = now()
  WHERE user_id = ${user.id} AND provider_id = 'credential'
  RETURNING id
`;

if (updated.length === 0) {
  await sql`
    INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
    VALUES (${crypto.randomUUID()}, ${user.id}, 'credential', ${user.id}, ${hash}, now(), now())
  `;
  console.log("• criada credential account (não existia)");
}

await sql`UPDATE "user" SET email_verified = true, updated_at = now() WHERE id = ${user.id}`;

console.log(`✓ password definida para ${user.email}`);
console.log(`  platform_admin=${user.platform_admin} approved=${user.approved}`);
if (!user.approved && !user.platform_admin) {
  console.log(
    "  ⚠ approved=false e não é platform admin → o middleware devolve 403.",
  );
}
// ponytail: o middleware cacheia platform_admin/approved em KV por 5 min.
