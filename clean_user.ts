import { neon } from "@neondatabase/serverless";

const sql = neon("postgresql://neondb_owner:npg_REDACTED@ep-REDACTED-endpoint.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");

async function main() {
  console.log("🔍 Verificando banco de dados...");
  
  try {
    const users = await sql`SELECT id, email, name FROM "user" WHERE email = 'resper@bekaa.eu'`;
    console.log("📝 Usuários encontrados na tabela Drizzle 'user':", users);

    if (users.length > 0) {
      console.log("🗑️  Deletando usuário resper@bekaa.eu das tabelas...");
      await sql`DELETE FROM "user" WHERE email = 'resper@bekaa.eu'`;
      console.log("✅ Usuário deletado com sucesso!");
    } else {
      console.log("❌ O usuário não foi encontrado na tabela 'user'.");
    }

  } catch (err: any) {
    console.error("Erro no Drizzle Table:", err.message);
  }

  process.exit(0);
}

main();
