/**
 * @module ai-disclosure.test
 * @description Keeps docs/legal/AI-PROCESSING.md true.
 *
 * That document tells customers, their DPOs and their auditors exactly which
 * endpoints send content to an external language model. It is the kind of
 * document that is worse than nothing when stale: a client who is told their
 * ROPA text stays inside the platform, and finds otherwise, has been misled in
 * writing.
 *
 * The API's OpenAPI spec sat three months out of date before it was generated
 * and checked in CI. This is the same failure mode, with a legal consequence
 * instead of an integration one, so it gets the same treatment.
 *
 * A route that instantiates an LLM use case and is not listed here fails the
 * build, naming itself.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "./test-kit";

const here = dirname(fileURLToPath(import.meta.url));

/** Use cases in packages/agent-runtime that take an LlmProvider. */
const LLM_USE_CASES = [
  "BoardTranslatorUseCase",
  "CLevelTranslatorUseCase",
  "DpiaAssessorUseCase",
  "EvidenceEvaluatorUseCase",
  "IncidentTriagerUseCase",
  "PoamArchitectUseCase",
  "RopaAnalyzerUseCase",
  "VendorScannerUseCase",
];

/** Mirrors docs/legal/AI-PROCESSING.md §2. Adding a line here means adding it there. */
const DISCLOSED = [
  "/api/v1/executive/translate-risk",
  "/api/v1/gap/evaluate-evidence",
  "/api/v1/gap/evaluate-evidence/batch",
  "/api/v1/poam/architect-remediation",
  "/api/v1/privacy/analyze-ropa",
  "/api/v1/privacy/assess-dpia",
  "/api/v1/privacy/scan-vendor-contract",
  "/api/v1/privacy/scan-vendor-contract/batch",
  "/api/v1/soc/triage-incident",
];

const ROUTE_PATH = /^\s*path:\s*"([^"]+)"/;

const instantiatesModel = (line: string): boolean =>
  LLM_USE_CASES.some((useCase) => line.includes(`new ${useCase}(`));

/** Route paths in one file that sit above an LLM use case instantiation. */
function modelCallsIn(source: string): string[] {
  const found: string[] = [];
  let currentPath: string | null = null;

  for (const line of source.split("\n")) {
    const declared = line.match(ROUTE_PATH)?.[1];
    if (declared) currentPath = declared;
    if (currentPath && instantiatesModel(line)) found.push(currentPath);
  }

  return found;
}

/**
 * Static analysis rather than importing the routes: the use case is
 * instantiated inside the handler, at request time, so nothing is observable
 * from the route table alone.
 */
function routesCallingAModel(): string[] {
  const dir = join(here, "..", "src", "routes");
  const files = readdirSync(dir).filter((f) => f.endsWith(".routes.ts"));
  const found = files.flatMap((f) =>
    modelCallsIn(readFileSync(join(dir, f), "utf8")),
  );

  return [...new Set(found)].sort();
}

test("AI disclosure: every route that calls a model is documented", () => {
  const actual = routesCallingAModel();
  const undisclosed = actual.filter((route) => !DISCLOSED.includes(route));

  // A route reaching a language model without appearing in AI-PROCESSING.md
  // means a customer was told something untrue about where their data goes.
  expect(undisclosed).toEqual([]);
});

test("AI disclosure: nothing is documented that no longer calls a model", () => {
  const actual = routesCallingAModel();
  const stale = DISCLOSED.filter((route) => !actual.includes(route));

  // Over-disclosure is the milder failure, but it still misrepresents the
  // product and would survive unnoticed.
  expect(stale).toEqual([]);
});

test("AI disclosure: the rule-based extractor reaches no model", () => {
  const source = readFileSync(
    join(
      here,
      "..",
      "..",
      "..",
      "packages",
      "privacy",
      "src",
      "services",
      "privacy-ai.service.ts",
    ),
    "utf8",
  );

  // §3 of the document states plainly that this one sends nothing outside.
  const callsModel =
    LLM_USE_CASES.some((u) => source.includes(u)) ||
    source.includes("LlmProvider");

  expect(callsModel).toBe(false);
});
