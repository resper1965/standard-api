/**
 * Auth Smoke Tests — Organization Creation
 *
 * Testa criação de organizações via Standard Native Auth plugin.
 * Cobre regressão do bug 2026-05-25: additionalFields sem required:false
 * causava 400 em todos os campos billing/contact.
 *
 * Uso:
 *   TEST_BASE_URL=https://standard-api.bekaa.eu \
 *   TEST_USER_EMAIL=resper@bekaa.eu \
 *   TEST_USER_PASSWORD=Standard@2026! \
 *   npx tsx apps/api-gateway/tests/auth/organization.smoke.ts
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

// ── Login e obter cookie ──────────────────────────────────────────────
assert(TEST_EMAIL !== "", "TEST_USER_EMAIL não configurado");
assert(TEST_PASSWORD !== "", "TEST_USER_PASSWORD não configurado");

const loginRes = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: ORIGIN },
  body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
});

assert(loginRes.status === 200, `Login falhou com status ${loginRes.status} — testes de org abortados`);
const sessionCookie = (loginRes.headers.get("set-cookie") ?? "").split(";")[0];
assert(sessionCookie !== "", "Cookie de sessão não obtido — testes de org abortados");

console.log(`\n  → Login OK. Cookie: ${sessionCookie.substring(0, 40)}...\n`);

// ── Helpers ───────────────────────────────────────────────────────────
async function createOrg(body: Record<string, unknown>) {
  return fetch(`${BASE_URL}/api/auth/organization/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: ORIGIN,
      Cookie: sessionCookie,
    },
    body: JSON.stringify(body),
  });
}

// ── Testes ────────────────────────────────────────────────────────────

console.log("🏢 Organization Creation Tests — Regressão bug 2026-05-25\n");

await test("cria org SEM campos opcionais (regressão: bug 400 de additionalFields)", async () => {
  const slug = `test-org-minimal-${Date.now()}`;
  const res = await createOrg({ name: "Test Org Minimal", slug });

  const body = await res.json() as any;
  assert(
    res.status === 200,
    `Esperado 200, recebeu ${res.status}. Body: ${JSON.stringify(body).substring(0, 200)}`
  );
  assert(body.slug === slug, `Slug incorreto: ${body.slug}`);
  assert(!body.message?.includes("Invalid input"), `Mensagem de erro de validação: ${body.message}`);
  console.log(`     → Org criada: ${body.id ?? body.slug}`);
});

await test("cria org COM todos os campos opcionais", async () => {
  const slug = `test-org-full-${Date.now()}`;
  const res = await createOrg({
    name: "Test Org Full",
    slug,
    taxId: "12.345.678/0001-99",
    billingEmail: "billing@test-smoke.com",
    phone: "+55 11 99999-9999",
    address: "Rua Teste, 123",
    city: "São Paulo",
    state: "SP",
    country: "BR",
    postalCode: "01310-100",
    industry: "technology",
    employeeCount: "10-50",
  });

  assert(
    res.status === 200,
    `Esperado 200, recebeu ${res.status}`
  );

  // Standard Native Auth pode retornar body vazio ou JSON para criação de org
  const text = await res.text();
  const body = text ? (() => { try { return JSON.parse(text); } catch { return null; } })() : null;
  console.log(`     → slug=${slug}, taxId=${body?.taxId ?? "(não retornado no body)"}`);
});

await test("campos billing ausentes (taxId, billingEmail) não disparam erro de validação", async () => {
  // taxId e billingEmail intencionalmente omitidos — verificar que required:false funciona
  const res = await createOrg({
    name: "Test Org No Billing",
    slug: `test-no-billing-${Date.now()}`,
    // taxId: omitido
    // billingEmail: omitido
  });

  const body = await res.json() as any;
  const isValidationError =
    res.status === 400 &&
    (body.message?.includes("Invalid input") || body.code === "VALIDATION_ERROR");

  assert(
    !isValidationError,
    `Erro de validação indevido para campos opcionais: ${JSON.stringify(body).substring(0, 200)}`
  );
  console.log(`     → status=${res.status}, sem erro de validação para campos opcionais`);
});

await test("documentar comportamento de slug duplicado", async () => {
  const slug = `test-dup-slug-${Date.now()}`;

  // Criar primeira vez
  await createOrg({ name: "Org Original", slug });

  // Tentar criar com mesmo slug
  const res = await createOrg({ name: "Org Duplicada", slug });
  const body = await res.json() as any;

  // Documentar o comportamento — não impor status específico ainda
  console.log(`     → Slug duplicado: status=${res.status}, body=${JSON.stringify(body).substring(0, 100)}`);

  // Deve ser um erro — não um 200 silencioso
  assert(res.status !== 200, `Slug duplicado não gerou erro — possível problema de unicidade`);
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
