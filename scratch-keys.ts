import { Pool } from "pg";
import { config } from "dotenv";

config({ path: "apps/api-gateway/.dev.vars" });

async function run() {
  const appDbUrl = process.env.DATABASE_URL!.replace(/^\uFEFF/, "").trim();
  const authDbUrl = process.env.AUTH_DATABASE_URL!.replace(/^\uFEFF/, "").trim();
  
  const appPool = new Pool({ connectionString: appDbUrl });
  const authPool = new Pool({ connectionString: authDbUrl });

  try {
    // Check if the user is platform admin
    const user = await authPool.query(`SELECT id, email, platform_admin FROM "user" WHERE email = 'resper@bekaa.eu'`);
    console.log("Auth User:", user.rows[0]);

    // Update organizations in the app db
    const oldUserId = '820c3125-6788-4213-bad2-4f4484b754b0';
    const newUserId = user.rows[0].id;
    
    // Update old org to the new user ID
    await appPool.query(`UPDATE organizations SET user_id = $1 WHERE id = '00000001-0000-0000-0000-000000000001'`, [newUserId]);
    console.log("Updated organization 00000001... to new user id");

    // Optional: Delete the newly auto-created organization (if no keys or data)
    await appPool.query(`DELETE FROM organizations WHERE user_id = $1 AND id != '00000001-0000-0000-0000-000000000001'`, [newUserId]);
    console.log("Deleted auto-created empty organizations");

  } catch (err) {
    console.error(err);
  } finally {
    await appPool.end();
    await authPool.end();
  }
}

run();
