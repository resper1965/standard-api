import { neon } from "@neondatabase/serverless";

const sql = neon("postgresql://neondb_owner:npg_T8MHv6EoDIGh@ep-blue-breeze-anyfua57.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");

async function main() {
  console.log("🧹 Removendo tabelas duplicadas criadas erroneamente pelo schema nativo do Better Auth...");
  
  try {
    await sql`DROP TABLE IF EXISTS "user" CASCADE;`;
    await sql`DROP TABLE IF EXISTS "session" CASCADE;`;
    await sql`DROP TABLE IF EXISTS "account" CASCADE;`;
    await sql`DROP TABLE IF EXISTS "verification" CASCADE;`;
    await sql`DROP TABLE IF EXISTS "apikey" CASCADE;`;
    
    // We do NOT drop existing "users" or "organizations" or "memberships" which are critical
    // Fortunately, the native Drizzle schema used plural ("users", "organizations"). 
    // The BetterAuth defaults I added used singular ("user", "organization", "member", "invitation").
    
    // Wait, let's make sure we drop the singular ones
    await sql`DROP TABLE IF EXISTS "organization" CASCADE;`;
    await sql`DROP TABLE IF EXISTS "member" CASCADE;`;
    await sql`DROP TABLE IF EXISTS "invitation" CASCADE;`;

    console.log("✅ Tabelas erradas ('user', 'session', etc) removidas com sucesso!");
    console.log("A tabela certa original ('users') e suas relacionais seguem intactas.");
  } catch (err: any) {
    console.error("Erro ao deletar tabelas:", err.message);
  }

  process.exit(0);
}

main();
