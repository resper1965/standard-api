/**
 * MCP Integration Tests â€” resources/list, resources/read, prompts/list, prompts/get
 *
 * Testa o dispatcher JSON-RPC do mcp.routes.ts via chamadas directas aos handlers.
 * Usa in-memory deps (sem Neon DB, sem KV).
 */
import { describe, it, expect } from "vitest";
import { MCP_RESOURCES, readMcpResource } from "../../mcp/resources";
import { MCP_PROMPTS, getMcpPrompt } from "../../mcp/prompts";
import { computeRawScore, categoriseRisk } from "../tpra-score-service";

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const makeScfDeps = () =>
  ({
    scf: {
      versions: {
        getLatestVersion: async () => ({
          version_label: "2026.1.1",
          id: "ver-001",
        }),
      },
      frameworks: {
        listFrameworks: async () => [
          {
            id: "fw-001",
            frameworkCode: "NIST_CSF_2",
            frameworkName: "NIST CSF 2.0",
          },
          {
            id: "fw-002",
            frameworkCode: "ISO_27001",
            frameworkName: "ISO/IEC 27001:2022",
          },
        ],
      },
    },
  }) as any;

// â”€â”€ resources/list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("MCP resources/list â€” catÃ¡logo", () => {
  it("retorna exactamente 4 resources", () => {
    expect(MCP_RESOURCES).toHaveLength(4);
  });

  it("todos tÃªm uri standard://*", () => {
    for (const r of MCP_RESOURCES) {
      expect(r.uri).toMatch(/^standard:\/\//);
    }
  });

  it("todos tÃªm mimeType application/json", () => {
    for (const r of MCP_RESOURCES) {
      expect(r.mimeType).toBe("application/json");
    }
  });

  it("URIs sÃ£o Ãºnicas", () => {
    const uris = MCP_RESOURCES.map((r) => r.uri);
    expect(new Set(uris).size).toBe(uris.length);
  });

  it("contÃ©m os 4 resources esperados", () => {
    const uris = MCP_RESOURCES.map((r) => r.uri);
    expect(uris).toContain("standard://scf/controls-catalog");
    expect(uris).toContain("standard://scf/frameworks-catalog");
    expect(uris).toContain("standard://scf/strm-operators");
    expect(uris).toContain("standard://assessment/lifecycle-states");
  });
});

// â”€â”€ resources/read â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("MCP resources/read â€” conteÃºdo", () => {
  it("standard://scf/controls-catalog â†’ inclui scf_version", async () => {
    const deps = makeScfDeps();
    const result = await readMcpResource(
      "standard://scf/controls-catalog",
      deps,
    );
    expect(result.mimeType).toBe("application/json");
    const parsed = JSON.parse(result.text!);
    expect(parsed).toHaveProperty("scf_version");
    expect(parsed.scf_version).toBe("2026.1.1");
    expect(parsed).toHaveProperty("total_controls");
  });

  it("standard://scf/frameworks-catalog â†’ lista frameworks do SCF core", async () => {
    const deps = makeScfDeps();
    const result = await readMcpResource(
      "standard://scf/frameworks-catalog",
      deps,
    );
    const parsed = JSON.parse(result.text!);
    expect(parsed.total).toBe(2);
    expect(parsed.frameworks).toHaveLength(2);
    expect(parsed.frameworks[0]).toHaveProperty("code");
  });

  it("standard://scf/strm-operators â†’ 5 operadores canÃ³nicos", async () => {
    const deps = makeScfDeps();
    const result = await readMcpResource("standard://scf/strm-operators", deps);
    const parsed = JSON.parse(result.text!);
    expect(parsed.reference).toBe("NIST IR 8477");
    expect(parsed.operators).toHaveLength(5);
    const ids = parsed.operators.map((o: any) => o.id);
    expect(ids).toContain("equal");
    expect(ids).toContain("intersects");
    expect(ids).toContain("no_relation");
  });

  it("standard://assessment/lifecycle-states â†’ approval gates definidos", async () => {
    const deps = makeScfDeps();
    const result = await readMcpResource(
      "standard://assessment/lifecycle-states",
      deps,
    );
    const parsed = JSON.parse(result.text!);
    expect(parsed.states).toContain("soa_approved");
    expect(parsed.states).toContain("gap_analysis_approved");
    expect(parsed.approval_gates).toHaveLength(4);
  });

  it("URI desconhecida â†’ lanÃ§a Error", async () => {
    const deps = makeScfDeps();
    await expect(
      readMcpResource("standard://unknown/resource", deps),
    ).rejects.toThrow("not found");
  });
});

// â”€â”€ prompts/list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("MCP prompts/list â€” catÃ¡logo", () => {
  it("retorna exactamente 3 prompts", () => {
    expect(MCP_PROMPTS).toHaveLength(3);
  });

  it("contÃ©m os agentes funcionais core", () => {
    const names = MCP_PROMPTS.map((p) => p.name);
    expect(names).toContain("scf-control-analyst");
    expect(names).toContain("gap-analyst");
    expect(names).toContain("maturity-assessor");
  });

  it("todos tÃªm arguments tipados com required flag", () => {
    for (const p of MCP_PROMPTS) {
      expect(Array.isArray(p.arguments)).toBe(true);
      for (const arg of p.arguments) {
        expect(typeof arg.required).toBe("boolean");
        expect(typeof arg.name).toBe("string");
      }
    }
  });
});

// â”€â”€ prompts/get â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("MCP prompts/get â€” geraÃ§Ã£o de messages", () => {
  it("scf-control-analyst â†’ mensagem system com regras inviolÃ¡veis", () => {
    const result = getMcpPrompt("scf-control-analyst", {
      control_code: "GOV-01",
      assessment_id: "assess-uuid-001",
    });
    expect(result.messages).toHaveLength(2);
    const system = result.messages[0];
    expect(system?.role).toBe("system");
    expect(system?.content.text).toContain("Nunca crie mappings oficiais");
    expect(system?.content.text).toContain("assessment_id=assess-uuid-001");
  });

  it("gap-analyst â†’ mensagem user interpola assessment_id e framework", () => {
    const result = getMcpPrompt("gap-analyst", {
      assessment_id: "assess-uuid-002",
      framework_code: "ISO_27001",
    });
    const userMsg = result.messages[1];
    expect(userMsg?.content.text).toContain("assess-uuid-002");
    expect(userMsg?.content.text).toContain("ISO_27001");
  });

  it("maturity-assessor â†’ respeita controle especÃ­fico quando fornecido", () => {
    const result = getMcpPrompt("maturity-assessor", {
      assessment_id: "assess-uuid-003",
      control_code: "CRY-01",
    });
    const userMsg = result.messages[1];
    expect(userMsg?.content.text).toContain("CRY-01");
  });

  it("maturity-assessor sem control_code â†’ avalia todos os controles", () => {
    const result = getMcpPrompt("maturity-assessor", {
      assessment_id: "assess-uuid-004",
    });
    const userMsg = result.messages[1];
    expect(userMsg?.content.text).toContain("todos os controles");
  });

  it("prompt desconhecido â†’ lanÃ§a Error", () => {
    expect(() => getMcpPrompt("prompt-inexistente", {})).toThrow("not found");
  });
});

// â”€â”€ TPRA in-memory integration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("TPRA computeRawScore + categoriseRisk â€” integraÃ§Ã£o", () => {
  it("respostas todas 1.0 â†’ score 100 â†’ category low", () => {
    const score = computeRawScore({ A: 1, B: 1, C: 1, D: 1 });
    expect(score).toBe(100);
    expect(categoriseRisk(score)).toBe("low");
  });

  it("respostas todas 0.0 â†’ score 0 â†’ category critical", () => {
    const score = computeRawScore({ A: 0, B: 0 });
    expect(score).toBe(0);
    expect(categoriseRisk(score)).toBe("critical");
  });

  it("resposta mista â†’ score 50 â†’ category high", () => {
    const score = computeRawScore({ A: 1, B: 0 });
    expect(score).toBe(50);
    expect(categoriseRisk(score)).toBe("high");
  });

  it("clampeia valores acima de 1.0", () => {
    const score = computeRawScore({ A: 999, B: 0.5 });
    // (1.0 + 0.5) / 2 = 0.75 â†’ 75
    expect(score).toBe(75);
  });

  it("respostas vazias â†’ score 0", () => {
    expect(computeRawScore({})).toBe(0);
  });
});
