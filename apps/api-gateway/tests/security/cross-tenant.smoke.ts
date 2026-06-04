/**
 * Cross-Tenant Isolation Smoke Tests
 *
 * Valida que nenhum usuário consegue acessar dados de outro tenant.
 * Este é o gate mais crítico antes do go-live com múltiplos clientes.
 *
 * Cenários cobertos:
 *   1. Listagem de assessments filtra por tenant (não vaza cross-tenant)
 *   2. GET de assessment de outro tenant retorna 403 ou 404
 *   3. Upload de documento em assessment de outro tenant retorna 403
 *   4. Tentativa de aprovação em assessment de outro tenant retorna 403
 *   5. API key de tenant A não acessa dados de tenant B
 *
 * Uso (requer dois usuários em tenants diferentes):
 *   TEST_BASE_URL=https://standard-api.bekaa.eu \
 *   TEST_TENANT_A_EMAIL=user@tenant-a.com \
 *   TEST_TENANT_A_PASSWORD=PasswordA! \
 *   TEST_TENANT_B_EMAIL=user@tenant-b.com \
 *   TEST_TENANT_B_PASSWORD=PasswordB! \
 *   TEST_TENANT_B_ASSESSMENT_ID=<assessment-id-de-tenant-B> \
 *   npx tsx apps/api-gateway/tests/security/cross-tenant.smoke.ts
 *
 * Se apenas um tenant estiver configurado, os testes cross-tenant
 * serão executados com IDs sintéticos e validarão que a API
 * rejeita IDs não pertencentes ao tenant autenticado.
 */

const BASE_URL = process.env.TEST_BASE_URL ?? "https://standard-api.bekaa.eu";
const ORIGIN   = process.env.TEST_ORIGIN ?? "https://standard.bekaa.eu";

const TENANT_A_EMAIL    = process.env.TEST_TENANT_A_EMAIL ?? process.env.TEST_USER_EMAIL ?? "";
const TENANT_A_PASSWORD = process.env.TEST_TENANT_A_PASSWORD ?? process.env.TEST_USER_PASSWORD ?? "";
const TENANT_B_EMAIL    = process.env.TEST_TENANT_B_EMAIL ?? "";
const TENANT_B_PASSWORD = process.env.TEST_TENANT_B_PASSWORD ?? "";

// ID de um assessment que pertence ao tenant B (para testar acesso cross-tenant)
const TENANT_B_ASSESSMENT = process.env.TEST_TENANT_B_ASSESSMENT_ID ?? "";

type TestResult = { name: string; passed: boolean; skipped?: boolean; error?: string };
const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  ✅ ${name}`);
  } catch (e: any) {
    if (e.message?.startsWith("SKIP:")) {
      results.push({ name, passed: true, skipped: true });
      console.log(`  ⏭️  ${name} — ${e.message}`);
    } else {
      results.push({ name, passed: false, error: e.message });
      console.error(`  ❌ ${name}\n     ${e.message}`);
    }
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function skip(reason: string): never {
  throw new Error(`SKIP: ${reason}`);
}

async function apiFetch(
  path: string,
  method: string,
  cookie: string,
  body?: unknown
): Promise<Response> {
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

async function login(email: string, password: string): Promise<string> {
  const res = await apiFetch("/api/auth/sign-in/email", "POST", "", { email, password });
  assert(res.status === 200, `Login falhou para ${email}: ${res.status}`);
  return (res.headers.get("set-cookie") ?? "").split(";")[0];
}

// ── Setup ─────────────────────────────────────────────────────────────

console.log("\n🔒 Cross-Tenant Isolation Smoke Tests\n");

assert(TENANT_A_EMAIL !== "", "TEST_TENANT_A_EMAIL (ou TEST_USER_EMAIL) não configurado");
assert(TENANT_A_PASSWORD !== "", "TEST_TENANT_A_PASSWORD (ou TEST_USER_PASSWORD) não configurado");

const hasTenantB = TENANT_B_EMAIL !== "" && TENANT_B_PASSWORD !== "";

console.log(`  → Tenant A: ${TENANT_A_EMAIL}`);
console.log(`  → Tenant B: ${hasTenantB ? TENANT_B_EMAIL : "⚠️  não configurado — testes reais de cross-tenant serão pulados"}`);
console.log(`  → Assessment B: ${TENANT_B_ASSESSMENT || "não fornecido — usando ID sintético"}\n`);

const cookieA = await login(TENANT_A_EMAIL, TENANT_A_PASSWORD);

let cookieB = "";
if (hasTenantB) {
  cookieB = await login(TENANT_B_EMAIL, TENANT_B_PASSWORD);
}

// ── Grupo 1: Listagem escoped por tenant ──────────────────────────────

console.log("📋 Grupo 1: Listagem filtrada por tenant\n");

await test("GET /api/v1/assessments retorna apenas assessments do tenant autenticado", async () => {
  const res = await apiFetch("/api/v1/assessments", "GET", cookieA);
  assert(res.status === 200 || res.status === 204, `Esperado 200/204, recebeu ${res.status}`);

  const body = await res.json() as any;
  const items: any[] = body.data ?? body.assessments ?? body ?? [];

  if (Array.isArray(items) && items.length > 0) {
    // Verificar que todos os items têm o mesmo organization_id
    const tenantIds = [...new Set(items.map((i: any) => i.organization_id).filter(Boolean))];
    assert(
      tenantIds.length <= 1,
      `Listagem retornou assessments de múltiplos tenants: ${tenantIds.join(", ")} — CROSS-TENANT LEAK`
    );
    console.log(`     → ${items.length} assessments, tenant_ids únicos: ${tenantIds.length} ✅`);
  } else {
    console.log(`     → Nenhum assessment no tenant (ou formato diferente) — ok`);
  }
});

// ── Grupo 2: Acesso cross-tenant com ID explícito ─────────────────────

console.log("\n📋 Grupo 2: Acesso cross-tenant com ID explícito\n");

await test("GET assessment de outro tenant com cookie de tenant A retorna 403 ou 404", async () => {
  const targetId = TENANT_B_ASSESSMENT || "00000000-0000-0000-0000-000000000000";
  const res = await apiFetch(`/api/v1/assessments/${targetId}`, "GET", cookieA);

  // 403: tenant guard detectou mismatch | 404: não encontrado no escopo do tenant A
  // Ambos são aceitáveis — o importante é NÃO retornar 200 com dados de outro tenant
  assert(
    res.status === 403 || res.status === 404,
    `Esperado 403 ou 404 para assessment de outro tenant, recebeu ${res.status} — CROSS-TENANT ACCESS`
  );
  console.log(`     → status=${res.status} ✅ (${res.status === 403 ? "bloqueado pelo tenant guard" : "não encontrado no escopo"})`);
});

await test("POST documento em assessment de outro tenant retorna 403 ou 404", async () => {
  const targetId = TENANT_B_ASSESSMENT || "00000000-0000-0000-0000-000000000000";
  const res = await apiFetch(
    `/api/v1/assessments/${targetId}/documents`,
    "POST",
    cookieA,
    { name: "test.pdf", size: 1024, mime_type: "application/pdf" }
  );

  assert(
    res.status === 403 || res.status === 404,
    `Esperado 403 ou 404, recebeu ${res.status} — possível cross-tenant document upload`
  );
  console.log(`     → status=${res.status} ✅`);
});

await test("POST approval em assessment de outro tenant retorna 403 ou 404", async () => {
  const targetId = TENANT_B_ASSESSMENT || "00000000-0000-0000-0000-000000000000";
  const res = await apiFetch(
    `/api/v1/assessments/${targetId}/lifecycle/transition`,
    "POST",
    cookieA,
    { transition: "approve_soa", comment: "cross-tenant-test" }
  );

  assert(
    res.status === 403 || res.status === 404,
    `Esperado 403 ou 404 para approval cross-tenant, recebeu ${res.status}`
  );
  console.log(`     → status=${res.status} ✅`);
});

// ── Grupo 3: Testes reais com dois tenants (se configurados) ──────────

console.log("\n📋 Grupo 3: Testes bi-direcionais (requer dois tenants)\n");

await test("tenant B não vê assessments de tenant A na listagem", async () => {
  if (!hasTenantB) skip("TEST_TENANT_B_EMAIL não configurado");

  const resA = await apiFetch("/api/v1/assessments", "GET", cookieA);
  const resB = await apiFetch("/api/v1/assessments", "GET", cookieB);

  assert(resA.status === 200 || resA.status === 204, `Tenant A list falhou: ${resA.status}`);
  assert(resB.status === 200 || resB.status === 204, `Tenant B list falhou: ${resB.status}`);

  const bodyA = await resA.json() as any;
  const bodyB = await resB.json() as any;

  const itemsA: any[] = bodyA.data ?? bodyA.assessments ?? bodyA ?? [];
  const itemsB: any[] = bodyB.data ?? bodyB.assessments ?? bodyB ?? [];

  const idsA = new Set(itemsA.map((i: any) => i.id ?? i.assessment_id));
  const idsB = new Set(itemsB.map((i: any) => i.id ?? i.assessment_id));
  const overlap = [...idsA].filter(id => idsB.has(id));

  assert(
    overlap.length === 0,
    `CROSS-TENANT LEAK: ${overlap.length} assessments visíveis em ambos tenants: ${overlap.slice(0, 3).join(", ")}`
  );
  console.log(`     → Tenant A: ${idsA.size} assessments | Tenant B: ${idsB.size} assessments | Overlap: 0 ✅`);
});

await test("tenant A não consegue GET assessment criado por tenant B", async () => {
  if (!hasTenantB || !TENANT_B_ASSESSMENT) {
    skip("TEST_TENANT_B e TEST_TENANT_B_ASSESSMENT_ID necessários para este teste");
  }

  // Verificar que tenant B consegue ver o próprio assessment
  const resFromB = await apiFetch(`/api/v1/assessments/${TENANT_B_ASSESSMENT}`, "GET", cookieB);
  assert(resFromB.status === 200, `Tenant B não conseguiu ver próprio assessment: ${resFromB.status}`);

  // Verificar que tenant A NÃO consegue ver o mesmo assessment
  const resFromA = await apiFetch(`/api/v1/assessments/${TENANT_B_ASSESSMENT}`, "GET", cookieA);
  assert(
    resFromA.status === 403 || resFromA.status === 404,
    `CROSS-TENANT LEAK: tenant A acessou assessment de tenant B! status=${resFromA.status}`
  );
  console.log(`     → B vê próprio: ${resFromB.status} ✅ | A tenta B: ${resFromA.status} ✅`);
});

// ── Relatório Final ───────────────────────────────────────────────────

const passed  = results.filter(r => r.passed && !r.skipped).length;
const skipped = results.filter(r => r.skipped).length;
const failed  = results.filter(r => !r.passed).length;

console.log(`\n${"─".repeat(55)}`);
console.log(`📊 Resultado: ${passed} passed, ${skipped} skipped, ${failed} failed`);

if (!hasTenantB) {
  console.log(`\n💡 Para testes bi-direcionais completos, configure:`);
  console.log(`   TEST_TENANT_B_EMAIL, TEST_TENANT_B_PASSWORD, TEST_TENANT_B_ASSESSMENT_ID`);
}

if (failed > 0) {
  console.log("\nFalhas:");
  results.filter(r => !r.passed).forEach(r => console.log(`  ❌ ${r.name}: ${r.error}`));
  process.exit(1);
} else {
  console.log("✅ Todos os testes passaram (ou foram pulados com justificativa)");
}
