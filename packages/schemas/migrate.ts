import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const runMigration = async () => {
    const connectionString = "REDACTED_DATABASE_URL";
    
    // Disable prefetch as it is not supported for "Transaction" pool mode
    const migrationClient = postgres(connectionString, { max: 1 });
    const db = drizzle(migrationClient);

    console.log("Iniciando migração do banco...");
    await migrate(db, { migrationsFolder: "../../infra/docker/postgres/migrations" });
    
    console.log("Migração concluída com sucesso!");
    process.exit(0);
};

runMigration().catch((err) => {
    console.error("Erro na migração:", err);
    process.exit(1);
});
