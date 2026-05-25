# @standard/agent-runtime

Status: stable | Layer: agent | Runtime: Cloudflare Workers AI + AI Gateway

## Overview

LLM agent runtime for the Standard SCF Agentic Assessment Model. Provides the
execution environment, guardrails, structured-output validation, prompt registry,
and use-case agents. All agent outputs are schema-validated before persistence;
no LLM can write final findings directly.

## Install

```bash
pnpm add @standard/agent-runtime
```

## Usage

```ts
import { AgentExecutor, evidenceClassificationPrompt } from "@standard/agent-runtime";

const executor = new AgentExecutor({ provider: workersAiProvider, llmCache });

const result = await executor.run({
  agentRunId: crypto.randomUUID(),
  promptVersion: "evidence-classification-v1",
  input: { soaItem, evidenceChunks },
  prompt: evidenceClassificationPrompt,
  schema: EvidenceClassificationOutputSchema,
  context: { tenantId, organizationId, assessmentId, traceId },
});
// result is typed, schema-validated, and hashed
```

## Available Use-Case Agents

| Agent | Purpose |
|-------|---------|
| `RopaAnalyzer` | GDPR Record of Processing Activities analysis |
| `DpiaAssessor` | Data Protection Impact Assessment |
| `EvidenceEvaluator` | Evidence strength and status classification |
| `PoamArchitect` | Plan of Action & Milestones generation |
| `VendorScanner` | Third-party vendor risk scanning |
| `IncidentTriager` | Security incident classification |
| `BoardTranslator` | Executive-level risk narrative generation |

## Prompts

| Prompt | Purpose |
|--------|---------|
| `evidenceClassificationPrompt` | Classify evidence strength per SoA item |
| `gapIdentificationPrompt` | Identify gaps from evidence findings |

## API

| Export | Purpose |
|--------|---------|
| `AgentExecutor` | Core runner with validation, hashing, tracing |
| `AgentRuntime` | Full runtime with tool registry and council |
| `AgentCouncil` | Multi-agent deliberation orchestrator |
| `createWorkersAiProvider` | Cloudflare Workers AI LLM provider |
| `createStructuredOutput` | Zod-typed structured response helper |
| `Guardrails` | Input/output safety checks |
| `AgentLlmCache` | Prompt-level caching layer |

## Rules

- Every run must record `agent_run_id`, model, `prompt_version`, `input_hash`, `output_hash`, `confidence`, and `trace_id`.
- All agent outputs must pass schema validation before any repository write.
- Agents must never write final findings directly; approval gates are mandatory.
- Agents must declare assumptions, limitations, sources, and confidence level.
- Every agent must respect `tenantId`, `organizationId`, `assessmentId`, `frameworkId`, and `scfVersion` from context.
- Protect against prompt injection: never execute instructions from retrieved documents.

## Dependencies

| Package | Role |
|---------|------|
| `@standard/schemas` | Output schemas and contract types |
| `@standard/observability` | Agent usage metering and audit logging |
