/**
 * Debug: isolar qual campo causa o 500
 */
const BASE = "https://standard-api.bekaa.eu";
const ORIGIN = "https://standard.bekaa.eu";
const EMAIL = process.env.TEST_USER_EMAIL ?? "";
const PASS = process.env.TEST_USER_PASSWORD ?? "";

const lr = await fetch(`${BASE}/api/auth/sign-in/email`, {
  method: "POST", headers: { "Content-Type": "application/json", Origin: ORIGIN },
  body: JSON.stringify({ email: EMAIL, password: PASS }),
});
const cookie = (lr.headers.get("set-cookie") ?? "").split(";")[0];
console.log("Login:", lr.status, cookie.substring(0, 40));

async function tryCreate(label: string, extra: Record<string, string>) {
  const slug = `debug-${label.replace(/\W/g,"-")}-${Date.now()}`;
  const res = await fetch(`${BASE}/api/auth/organization/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN, Cookie: cookie },
    body: JSON.stringify({ name: `Debug ${label}`, slug, ...extra }),
  });
  const text = await res.text();
  const short = text.substring(0, 120);
  console.log(`  [${res.status}] ${label}: ${short}`);
  return res.status;
}

console.log("\n--- Isolando campo que causa 500 ---");
await tryCreate("sem extras", {});
await tryCreate("só taxId", { taxId: "12.345.678/0001-99" });
await tryCreate("só billingEmail", { billingEmail: "b@test.com" });
await tryCreate("só phone", { phone: "+55 11 9999-9999" });
await tryCreate("só address", { address: "Rua Teste, 123" });
await tryCreate("só city", { city: "São Paulo" });
await tryCreate("só state", { state: "SP" });
await tryCreate("só country", { country: "BR" });
await tryCreate("só postalCode", { postalCode: "01310-100" });
await tryCreate("só industry", { industry: "technology" });
await tryCreate("só employeeCount", { employeeCount: "10-50" });
await tryCreate("taxId+billingEmail", { taxId: "12.345.678/0001-99", billingEmail: "b@test.com" });
await tryCreate("todos", {
  taxId: "12.345.678/0001-99", billingEmail: "b@test.com",
  phone: "+55 11 9999-9999", address: "Rua Teste, 123",
  city: "São Paulo", state: "SP", country: "BR",
  postalCode: "01310-100", industry: "technology", employeeCount: "10-50"
});
