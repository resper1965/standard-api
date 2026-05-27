import { createTestClient, ids } from "./helpers";
import { expect, test } from "./test-kit";

test("GET /mcp returns discovery metadata", async () => {
  const client = createTestClient();
  const { response, body } = await client.send("/mcp");
  
  expect(response.status).toBe(200);
  expect(body.name).toBe("standard-grc");
  expect(body.protocol).toBe("2025-03-26");
  expect(body.endpoint).toBe("POST /mcp");
  expect(typeof body.tools).toBe("number");
});

test("POST /mcp initialize method returns capabilities", async () => {
  const client = createTestClient();
  const { response, body } = await client.send(
    "/mcp",
    "POST",
    {
      jsonrpc: "2.0",
      id: "test-init-01",
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "test-client", version: "1.0.0" }
      }
    },
    { "x-standard-actor-id": ids.actorId }
  );

  expect(response.status).toBe(200);
  expect(body.jsonrpc).toBe("2.0");
  expect(body.id).toBe("test-init-01");
  expect(body.result.protocolVersion).toBe("2025-03-26");
  expect(body.result.serverInfo.name).toBe("standard-grc");
});

test("POST /mcp tools/list returns register tools", async () => {
  const client = createTestClient();
  const { response, body } = await client.send(
    "/mcp",
    "POST",
    {
      jsonrpc: "2.0",
      id: "test-list-01",
      method: "tools/list"
    },
    { "x-standard-actor-id": ids.actorId }
  );

  expect(response.status).toBe(200);
  expect(body.result.tools).toBeDefined();
  expect(Array.isArray(body.result.tools)).toBe(true);
  
  // Verify key tools are exposed
  const toolNames = body.result.tools.map((t: any) => t.name);
  expect(toolNames).toContain("list-assessments");
  expect(toolNames).toContain("search-scf-controls");
  expect(toolNames).toContain("get-platform-health");
});

test("POST /mcp ping returns empty object", async () => {
  const client = createTestClient();
  const { response, body } = await client.send(
    "/mcp",
    "POST",
    {
      jsonrpc: "2.0",
      id: "test-ping-01",
      method: "ping"
    },
    { "x-standard-actor-id": ids.actorId }
  );

  expect(response.status).toBe(200);
  expect(body.result).toEqual({});
});

test("POST /mcp tools/call get-platform-health succeeds", async () => {
  const client = createTestClient();
  const { response, body } = await client.send(
    "/mcp",
    "POST",
    {
      jsonrpc: "2.0",
      id: "test-call-01",
      method: "tools/call",
      params: {
        name: "get-platform-health",
        arguments: {}
      }
    },
    { "x-standard-actor-id": ids.actorId }
  );

  expect(response.status).toBe(200);
  expect(body.result.content).toBeDefined();
  expect(body.result.content[0].type).toBe("text");
  
  const payload = JSON.parse(body.result.content[0].text);
  expect(payload.status).toBe("operational");
});
