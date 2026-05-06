import postgres from "postgres";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Missing DATABASE_URL");

  const sql = postgres(connectionString);
  
  // Try to find the first organization just to link the API Key
  const tenants = await sql`SELECT * FROM "tenant" LIMIT 1`;
  const organizations = await sql`SELECT * FROM "organization" LIMIT 1`;
  
  let tenantId = tenants.length > 0 ? tenants[0].id : "tenant-0000";
  let orgId = organizations.length > 0 ? organizations[0].id : "org-0000";

  // Generate actual token
  const rawSecret = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const fullToken = `standard_live_${rawSecret}`;
  const maskedKey = `standard_live_...${fullToken.slice(-4)}`;

  // Hash the token exactly like the backend does
  const encoder = new TextEncoder();
  const data = encoder.encode(fullToken);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  await sql`
    INSERT INTO "api_key" (id, tenant_id, organization_id, name, key_hash, masked_key, expires_at)
    VALUES (
      gen_random_uuid(),
      ${tenantId},
      ${orgId},
      'ROPA External Access Agent',
      ${keyHash},
      ${maskedKey},
      NULL
    )
  `;

  console.log("----");
  console.log("M2M Token Generated Successfully!");
  console.log("Token: " + fullToken);
  console.log("Organization ID: " + orgId);
  console.log("----");

  process.exit(0);
}

main().catch(console.error);

