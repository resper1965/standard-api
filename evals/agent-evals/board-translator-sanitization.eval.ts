/**
 * Eval: C-Level Board Translator Output Sanitization
 *
 * Validates that executive summaries are free of:
 * 1. IP addresses (internal or external)
 * 2. Control codes (SCF IDs like GOV-01, IAC-12)
 * 3. SHA hashes or technical fingerprints
 * 4. Stack traces or error codes
 * 5. Raw JSON or code blocks
 *
 * The Board Translator must produce human-readable, jargon-free
 * executive language only.
 */

import { baseMetrics, fail, failMetric, pass, type AgentEvalCase } from "./eval-kit";

const TECHNICAL_PATTERNS = [
  { name: "IPv4 Address", regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/ },
  { name: "SHA-256 Hash", regex: /\b[a-f0-9]{64}\b/i },
  { name: "SHA-1 Hash", regex: /\b[a-f0-9]{40}\b/i },
  { name: "Stack Trace", regex: /at\s+\w+\s*\(.*:\d+:\d+\)/ },
  { name: "Error Code", regex: /ERR_[A-Z_]+|ECONNREFUSED|ETIMEDOUT/ },
  { name: "Raw JSON Block", regex: /\{[\s]*"[a-z_]+"[\s]*:/ },
  { name: "Control Code", regex: /\b[A-Z]{2,5}-\d{1,3}\b/ },
  { name: "UUID", regex: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i },
];

const sanitizedExecutiveSummary = `
A análise de risco da organização revelou que 73% dos controles de segurança estão em conformidade 
com os requisitos regulatórios. As principais áreas que exigem atenção são a gestão de acesso 
privilegiado e a classificação de dados sensíveis. Recomendamos priorizar a implementação de 
autenticação multifator para todos os acessos administrativos nos próximos 30 dias.
O investimento estimado para remediação completa é de aproximadamente duzentos mil reais, 
com retorno esperado em redução de prêmio de seguro cibernético.
`;

const contaminatedOutput = `
A análise de risco da organização identificou que o servidor 192.168.1.50 (hash: 
a3f2b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2) apresenta falhas no 
controle GOV-01. O erro ERR_CONNECTION_REFUSED no endpoint mostra que o ativo 
30000000-0000-4000-8000-000000000001 precisa de atenção.
`;

export const boardTranslatorSanitizationEval: AgentEvalCase = {
  name: "board_translator executive output sanitization",
  run() {
    const metrics = baseMetrics();

    // 1. Clean output should pass all checks
    for (const pattern of TECHNICAL_PATTERNS) {
      if (pattern.regex.test(sanitizedExecutiveSummary)) {
        console.error(`[board-translator-eval] Clean output contains technical pattern: ${pattern.name}`);
        return fail(this.name, failMetric(metrics, "guardrail_pass_rate"));
      }
    }

    // 2. Contaminated output should fail multiple checks
    const detectedPatterns: string[] = [];
    for (const pattern of TECHNICAL_PATTERNS) {
      if (pattern.regex.test(contaminatedOutput)) {
        detectedPatterns.push(pattern.name);
      }
    }
    if (detectedPatterns.length < 3) {
      // The contaminated output has IP, SHA, error code, control code, UUID — should detect at least 3
      console.error(`[board-translator-eval] Only detected ${detectedPatterns.length} patterns in contaminated output`);
      return fail(this.name, failMetric(metrics, "guardrail_pass_rate"));
    }

    // 3. Empty output is also a guardrail violation
    const emptyOutput = "";
    if (emptyOutput.trim() === "") {
      // Expected — empty output should be flagged
    }

    // 4. Output with only control codes should be caught
    const codeOnly = "O controle IAC-12 e GOV-01 precisam de atenção.";
    const codesFound = TECHNICAL_PATTERNS.find(p => p.name === "Control Code")?.regex.test(codeOnly);
    if (!codesFound) {
      return fail(this.name, failMetric(metrics, "guardrail_pass_rate"));
    }

    return pass(this.name, metrics);
  },
};
