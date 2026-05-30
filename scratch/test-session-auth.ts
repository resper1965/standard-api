import { createDb } from "../apps/api-gateway/src/adapters/db";
import { createAuth } from "../packages/auth/src/auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  baUser,
  baSession,
  baAccount,
  baVerification,
  baApikey,
  baOrganization,
  baMember,
  baInvitation
} from "../packages/schemas/src/db/auth-schema";

const databaseUrl = "postgresql://neondb_owner:npg_T8MHv6EoDIGh@ep-blue-breeze-anyfua57.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const db = createDb(databaseUrl);

// Instantiate auth with useSecureCookies: false for local debug
const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: baUser,
      session: baSession,
      account: baAccount,
      verification: baVerification,
      apikey: baApikey,
      organization: baOrganization,
      member: baMember,
      invitation: baInvitation
    }
  }),
  secret: "brn+2stFfd7Gct0wqEqrn9BJtFRfeaSzsGL4Nuj1DOw=",
  baseURL: "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        fieldName: "role",
        defaultValue: "member",
        returned: true,
        input: false,
      },
      platformAdmin: {
        type: "boolean",
        fieldName: "platform_admin",
        defaultValue: false,
        returned: true,
        input: false,
      },
    },
  },
  advanced: {
    useSecureCookies: false,
  }
});

async function run() {
  const token = "yUknUbg32Hlu5Vu4GsRW6Iq7hu6MJHy2";
  const headers = new Headers({
    "cookie": `better-auth.session_token=${token}`,
  });
  const rawSession = await auth.api.getSession({
    headers
  });
  console.log("Resolved rawSession:", JSON.stringify(rawSession, null, 2));
}
run().catch(console.error);
