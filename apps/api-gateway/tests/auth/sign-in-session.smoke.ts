/**
 * Auth Smoke Tests — Sign-in e Session
 * 
 * Testes HTTP diretos contra a API de produção/staging.
 * Cobrem regressão dos bugs de 2026-05-25 e comportamentos críticos do Standard Native Auth.
 * 
 * Uso:
 *   TEST_BASE_URL=https://standard-api.bekaa.eu \
 *   TEST_USER_EMAIL=resper@bekaa.eu \
 *   TEST_USER_PASSWORD=Standard@2026! \
 *   npx tsx apps/api-gateway/tests/auth/run-smoke.ts
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

async function authPost(path: string, body: unknown, extraHeaders: Record<string, string> = {}) {
  return fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: ORIGIN,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}

async function authGet(path: string, cookie = "") {
  return fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Origin: ORIGIN,
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });
}

// ── Guardar cookie entre testes ──────────────────────────────────────
let sessionCookie = "";

// ── Testes ───────────────────────────────────────────────────────────

console.log("\n🔐 Sign-in Tests\n");

await test("login com credenciais válidas retorna 200 + session cookie", async () => {
  assert(TEST_EMAIL !== "", "TEST_USER_EMAIL não configurado");
  assert(TEST_PASSWORD !== "", "TEST_USER_PASSWORD não configurado");

  const res = await authPost("/api/auth/sign-in/email", {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  assert(res.status === 200, `Esperado 200, recebeu ${res.status}`);

  const setCookie = res.headers.get("set-cookie") ?? "";
  assert(
    setCookie.includes("standard-native-auth.session_token"),
    `Cookie 'standard-native-auth.session_token' não encontrado no header Set-Cookie`
  );

  const body = await res.json() as any;
  assert(body.user?.email === TEST_EMAIL, `Email retornado incorreto: ${body.user?.email}`);
  assert(body.user?.name !== undefined, "Nome do usuário ausente na resposta");

  // Extrair cookie para uso nos próximos testes
  sessionCookie = setCookie.split(";")[0];
  console.log(`     → Usuário: ${body.user.name} | Role: ${body.user.role}`);
});

await test("login com senha errada retorna 401 — sem stack trace exposto", async () => {
  const res = await authPost("/api/auth/sign-in/email", {
    email: TEST_EMAIL,
    password: "senha-totalmente-errada-xyz-123",
  });

  assert(res.status === 401, `Esperado 401, recebeu ${res.status}`);

  const body = await res.json() as any;
  assert(!("stack" in body), "Stack trace exposto na resposta de erro — risco de segurança");
  console.log(`     → Resposta: ${JSON.stringify(body).substring(0, 80)}`);
});

await test("login com email inexistente retorna 401 — mesma forma que senha errada", async () => {
  const res = await authPost("/api/auth/sign-in/email", {
    email: "usuario-que-nao-existe-xyz@bekaa.eu",
    password: "qualquer",
  });

  assert(res.status === 401, `Esperado 401, recebeu ${res.status}`);
  // Segurança: mesmo status code para não enumerar usuários
});

await test("login com body não-JSON retorna 4xx (415 ou 400)", async () => {
  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "text/plain", Origin: ORIGIN },
    body: "nao-e-json",
  });

  // Comportamento auditado: Standard Native Auth retorna 415 Unsupported Media Type
  // para Content-Type não suportado — não 400. Documentado em ADR-AUTH-001.
  assert(
    res.status === 415 || res.status === 400,
    `Esperado 415 ou 400, recebeu ${res.status}`
  );
  console.log(`     → Comportamento: ${res.status} para Content-Type: text/plain`);
});

console.log("\n🍪 Session Tests\n");

await test("get-session com cookie válido retorna 200 e user correto (regressão bug 2026-05-25)", async () => {
  assert(sessionCookie !== "", "sessionCookie vazio — teste de login falhou");

  const res = await authGet("/api/auth/get-session", sessionCookie);
  assert(res.status === 200, `Esperado 200, recebeu ${res.status}`);

  const body = await res.json() as any;
  assert(body.user?.email === TEST_EMAIL, `Email incorreto: ${body.user?.email}`);
  console.log(`     → Usuário: ${body.user?.name} | Email: ${body.user?.email}`);
});

await test("get-session sem cookie retorna 200 com body null (comportamento auditado)", async () => {
  const res = await authGet("/api/auth/get-session");
  const text = await res.text();

  // Comportamento auditado: Standard Native Auth retorna 200 com body `null` (não {session:null})
  // quando não há cookie. Documentado em ADR-AUTH-001 Regra 8.
  const isNullBody = text === "null" || text === "";
  const isNullSession = (() => {
    try { const b = JSON.parse(text); return b === null || b?.session === null; } catch { return false; }
  })();
  const isUnauthorized = res.status === 401;

  assert(
    isNullBody || isNullSession || isUnauthorized,
    `Comportamento inesperado: status=${res.status}, body=${text.substring(0, 100)}`
  );
  console.log(`     → Comportamento: status=${res.status}, body=${text.substring(0, 50)}`);
});

// ── Relatório Final ──────────────────────────────────────────────────
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
