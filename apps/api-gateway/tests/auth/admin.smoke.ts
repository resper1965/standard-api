/**
 * Auth Smoke Tests — Admin Plugin Audit
 *
 * Auditoria ativa dos endpoints do plugin admin do Better Auth.
 * Documenta comportamentos reais para o ADR-AUTH-001.
 *
 * Uso:
 *   TEST_BASE_URL=https://standard-api.bekaa.eu \
 *   TEST_USER_EMAIL=resper@bekaa.eu \
 *   TEST_USER_PASSWORD=Standard@2026! \
 *   npx tsx apps/api-gateway/tests/auth/admin.smoke.ts
 */

const BASE_URL = process.env.TEST_BASE_URL ?? "https://standard-api.bekaa.eu";
const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "";
const ORIGIN = process.env.TEST_ORIGIN ?? "https://standard.bekaa.eu";

type TestResult = { name: string; passed: boolean; error?: string };
const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  ✅ ${name}`);
  } catch (e: any) {
    results.push({ name, passed: false, error: e.message });
    console.error(`  ❌ ${name}\n     ${e.message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function authFetch(path: string, method = "GET", cookie = "", body?: unknown) {
  return fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: ORIGIN,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

// ── Login (admin) ─────────────────────────────────────────────────────
assert(TEST_EMAIL !== "", "TEST_USER_EMAIL não configurado");
assert(TEST_PASSWORD !== "", "TEST_USER_PASSWORD não configurado");

const loginRes = await authFetch("/api/auth/sign-in/email", "POST", "", {
  email: TEST_EMAIL,
  password: TEST_PASSWORD,
});
assert(loginRes.status === 200, `Login falhou: ${loginRes.status}`);
const loginBody = await loginRes.json() as any;
const adminCookie = (loginRes.headers.get("set-cookie") ?? "").split(";")[0];
console.log(`\n  → Login OK. User role: ${loginBody.user?.role}\n`);

// ── Testes de Auditoria ───────────────────────────────────────────────

console.log("🔧 Admin Plugin Audit\n");

await test("GET /api/auth/admin/list-users com role admin — documentar comportamento", async () => {
  const res = await authFetch("/api/auth/admin/list-users", "GET", adminCookie);
  const text = await res.text();
  const body = text ? (() => { try { return JSON.parse(text); } catch { return null; } })() : null;

  // Auditoria — documentar resultado para ADR
  console.log(`     → status=${res.status}`);
  if (body) console.log(`     → body keys: ${Object.keys(body).join(", ")}`);

  // Deve responder de alguma forma — não 502 ou crash
  assert(res.status < 500, `Endpoint crashou com ${res.status}`);

  if (res.status === 200) {
    console.log(`     → ✅ DOCUMENTADO: admin/list-users acessível para role admin`);
  } else if (res.status === 403) {
    console.log(`     → ✅ DOCUMENTADO: admin/list-users requer permissão especial (403)`);
  } else if (res.status === 404) {
    console.log(`     → ℹ️  DOCUMENTADO: endpoint não existe nesta versão (404)`);
  } else {
    console.log(`     → ℹ️  DOCUMENTADO: status inesperado ${res.status}`);
  }
});

await test("admin endpoints sem autenticação retornam 4xx", async () => {
  const res = await authFetch("/api/auth/admin/list-users", "GET"); // sem cookie
  console.log(`     → sem cookie: status=${res.status}`);
  assert(res.status >= 400, `Endpoint sem auth retornou ${res.status} — possível falha de segurança`);
});

await test("GET /api/auth/admin/list-sessions — documentar disponibilidade", async () => {
  const res = await authFetch("/api/auth/admin/list-sessions", "GET", adminCookie);
  const text = await res.text();
  console.log(`     → status=${res.status}, body=${text.substring(0, 80)}`);
  assert(res.status < 500, `Endpoint crashou com ${res.status}`);
});

await test("documentar cookie name e atributos do session_token", async () => {
  const setCookieHeader = loginRes.headers.get("set-cookie") ?? "";
  console.log(`     → Set-Cookie completo: ${setCookieHeader.substring(0, 150)}`);

  const isSecure = setCookieHeader.includes("Secure");
  const isHttpOnly = setCookieHeader.includes("HttpOnly");
  const hasSameSite = setCookieHeader.includes("SameSite");
  const cookieName = setCookieHeader.split("=")[0];

  console.log(`     → Cookie name: ${cookieName}`);
  console.log(`     → Secure: ${isSecure} | HttpOnly: ${isHttpOnly} | SameSite: ${hasSameSite}`);

  // Em produção, deve ser Secure
  assert(isSecure, "Cookie não tem flag Secure — risco de segurança em produção");
  assert(isHttpOnly, "Cookie não tem flag HttpOnly — vulnerável a XSS");
});

await test("documentar expiração do cookie session_token", async () => {
  const setCookieHeader = loginRes.headers.get("set-cookie") ?? "";
  const maxAgeMatch = setCookieHeader.match(/Max-Age=(\d+)/i);
  const expiresMatch = setCookieHeader.match(/Expires=([^;]+)/i);

  if (maxAgeMatch) {
    const seconds = parseInt(maxAgeMatch[1]);
    const days = Math.round(seconds / 86400);
    console.log(`     → Max-Age: ${seconds}s (≈${days} dias)`);
  } else if (expiresMatch) {
    console.log(`     → Expires: ${expiresMatch[1]}`);
  } else {
    console.log(`     → ℹ️  Sem Max-Age ou Expires — session cookie (expira ao fechar browser)`);
  }
  // Apenas documentar — não impor valor específico
  assert(true, "");
});

// ── Relatório Final ───────────────────────────────────────────────────
const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;

console.log(`\n${"─".repeat(50)}`);
console.log(`📊 Resultado: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log("\nFalhas:");
  results.filter(r => !r.passed).forEach(r => console.log(`  ❌ ${r.name}: ${r.error}`));
  process.exit(1);
} else {
  console.log("✅ Todos os testes passaram");
}
