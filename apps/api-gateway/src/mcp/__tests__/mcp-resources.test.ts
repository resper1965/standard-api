// @ts-nocheck -- Zod v4 CI type compat
import { describe, it, expect, vi } from "vitest";
import { MCP_RESOURCES, readMcpResource } from "../resources";
import { MCP_PROMPTS, getMcpPrompt } from "../prompts";

describe("MCP Resources â€” catÃ¡logo", () => {
  it("expÃµe pelo menos 4 resources", () => {
    expect(MCP_RESOURCES.length).toBeGreaterThanOrEqual(4);
  });

  it("cada resource tem uri, name e mimeType", () => {
    for (const r of MCP_RESOURCES) {
      expect(r).toHaveProperty("uri");
      expect(r).toHaveProperty("name");
      expect(r).toHaveProperty("mimeType");
      expect(typeof r.uri).toBe("string");
      expect(r.uri.startsWith("standard://")).toBe(true);
    }
  });

  it("URIs sÃ£o Ãºnicas", () => {
    const uris = MCP_RESOURCES.map((r) => r.uri);
    const unique = new Set(uris);
    expect(unique.size).toBe(uris.length);
  });

  it("readMcpResource retorna conteÃºdo para uri conhecida", async () => {
    const uri = MCP_RESOURCES[0].uri;
    const mockDeps = {
      scf: {
        versions: {
          getLatestVersion: vi
            .fn()
            .mockResolvedValue({ version_label: "2026.1.1" }),
        },
        frameworks: { listFrameworks: vi.fn().mockResolvedValue([]) },
      },
    } as any;
    const content = await readMcpResource(uri, mockDeps);
    expect(content).toBeDefined();
    expect(content.mimeType).toBe("application/json");
    expect(typeof content.text).toBe("string");
  });

  it("readMcpResource lanÃ§a erro para uri desconhecida", async () => {
    await expect(
      readMcpResource("standard://unknown/non-existent", {} as any),
    ).rejects.toThrow();
  });
});

describe("MCP Prompts â€” templates de agentes", () => {
  it("expÃµe pelo menos 3 prompts", () => {
    expect(MCP_PROMPTS.length).toBeGreaterThanOrEqual(3);
  });

  it("cada prompt tem name, description e arguments", () => {
    for (const p of MCP_PROMPTS) {
      expect(p).toHaveProperty("name");
      expect(p).toHaveProperty("description");
      expect(p).toHaveProperty("arguments");
      expect(Array.isArray(p.arguments)).toBe(true);
    }
  });

  it("nomes de prompts sÃ£o Ãºnicos", () => {
    const names = MCP_PROMPTS.map((p) => p.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it("getMcpPrompt retorna messages para prompt conhecido", () => {
    const name = MCP_PROMPTS[0].name;
    const result = getMcpPrompt(name, {
      control_code: "GOV-01",
      assessment_id: "uuid-001",
    });
    expect(result).toHaveProperty("messages");
    expect(Array.isArray(result.messages)).toBe(true);
    expect(result.messages.length).toBeGreaterThan(0);
    expect(result.messages[0]).toHaveProperty("role");
    expect(result.messages[0]).toHaveProperty("content");
  });

  it("getMcpPrompt lanÃ§a erro para prompt desconhecido", () => {
    expect(() => getMcpPrompt("prompt-inexistente", {})).toThrow();
  });
});
