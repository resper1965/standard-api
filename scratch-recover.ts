import { createAuth } from "./packages/auth/src/auth"; 
import { Pool, neonConfig } from "@neondatabase/serverless";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

config({ path: "apps/api-gateway/.dev.vars" });

async function run() {
  process.env.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || "AABBCCDDEEFF11223344556677889900AABBCCDDEEFF11223344556677889900";
  const dbUrl = (process.env.AUTH_DATABASE_URL || process.env.DATABASE_URL)!.replace(/^\uFEFF/, "").trim();
  const pool = new Pool({ connectionString: dbUrl });
  const db = drizzle(pool);

  const env = {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: "http://localhost:8787",
    email: {
      sendEmail: async () => {},
    }
  } as any;

  const auth = createAuth(env, db as any);

  try {
    // try sign up
    await auth.api.signUpEmail({
      body: {
        name: "Rui Esperanca",
        email: "resper@bekaa.eu",
        password: "Standard2026!@#",
      }
    });
    console.log("User created with password: Standard2026!@#");
    
    // update to platform_admin and approved
    await pool.query(`UPDATE "user" SET platform_admin = true, approved = true WHERE email = 'resper@bekaa.eu'`);
    console.log("User updated to platform_admin and approved!");
  } catch (err: any) {
    if (err.message?.includes("already exists") || err.status === 400 || err.body?.code === "USER_ALREADY_EXISTS" || err.body?.code === "user_already_exists") {
      console.log("User already exists, deleting...");
      const users = await pool.query(`SELECT id FROM "user" WHERE email = 'resper@bekaa.eu'`);
      if (users.rowCount && users.rowCount > 0) {
        const userId = users.rows[0].id;
        await pool.query(`DELETE FROM account WHERE user_id = $1`, [userId]);
        await pool.query(`DELETE FROM session WHERE user_id = $1`, [userId]);
        await pool.query(`DELETE FROM "user" WHERE id = $1`, [userId]);
        
        console.log("Deleted old user.");
        
        await auth.api.signUpEmail({
          body: {
            name: "Rui Esperanca",
            email: "resper@bekaa.eu",
            password: "Standard2026!@#",
          }
        });
        console.log("Created new user with password: Standard2026!@#");
        
        await pool.query(`UPDATE "user" SET platform_admin = true, approved = true WHERE email = 'resper@bekaa.eu'`);
        console.log("User updated to platform_admin and approved!");
      }
    } else {
      console.error(err);
    }
  }
}

run().finally(() => process.exit(0)).catch(console.error);
