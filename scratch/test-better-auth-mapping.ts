import { betterAuth } from "better-auth";

async function run() {
  const auth = betterAuth({
    database: {
      getUser: async () => ({
        id: "1",
        name: "Test",
        email: "test@test.com",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: "admin",
        // Test what happens if we return camelCase vs snake_case
        platformAdmin: true,
        platform_admin: true,
      }),
      getSession: async () => ({
        id: "session-1",
        userId: "1",
        token: "token-1",
        expiresAt: new Date(Date.now() + 10000),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      createSession: async () => null,
      deleteSession: async () => null,
      updateSession: async () => null,
      updateUser: async () => null,
      deleteUser: async () => null,
      createUser: async () => null,
    } as any,
    secret: "secret-123",
    baseURL: "http://localhost:3000",
    user: {
      additionalFields: {
        platformAdmin: {
          type: "boolean",
          fieldName: "platform_admin",
          defaultValue: false,
          returned: true,
          input: false,
        },
      },
    },
  });

  const rawSession = await auth.api.getSession({
    headers: new Headers({
      "cookie": "better-auth.session_token=token-1"
    })
  });

  console.log("Resolved user fields:", rawSession?.user);
}

run().catch(console.error);
