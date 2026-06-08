# Plano de Integração Completa do Secure Controls Framework (SCF)

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Completar a arquitetura "GRC Brain" da Aegis API implementando a ingestão integral do SCF (AOs, ERL, Maturity Criteria, Risks e Threats), servindo esses dados via API/SDK/MCP e construindo os engines de maturidade SCR-CMM e análise de risco dinâmica.

**Architecture:** Implementação baseada em camadas no monorepo (schemas do Drizzle, XLSX importer isomórfico, services do packages/scf-core, rotas de API, SDK client, MCP Server tools e Council Agents). A arquitetura é stateless, rodando em Cloudflare Workers com banco Neon PostgreSQL transacional.

**Tech Stack:** TypeScript, Drizzle ORM, PostgreSQL (Neon), Hono (api-gateway), SheetJS (xlsx), Vercel AI SDK, MCP SDK.

---

## Introdução e Contexto Arquitetural

A Aegis API (Standard) foi desenhada como uma plataforma de assessments de segurança com base no SCF. Hoje, a fundação está sólida: o state machine de 27 estados está pronto e os imports básicos funcionam. No entanto, a plataforma extrai apenas metade do potencial dos dados fornecidos trimestralmente pelo SCF Council. 

Este plano detalha como evoluir o sistema de um avaliador de gaps básico para um **Mecanismo de Inteligência de Conformidade e Risco Computável**, consumindo Assessment Objectives, Evidence Request Lists, rubricas SCR-CMM de maturidade por controle, catálogos de riscos e ameaças, e a taxonomia de relacionamentos STRM (NIST IR 8477).

---

## Fase 1: Expansão do Schema e Ingestão de Dados SCF

Esta fase implementa a extração e persistência das tabelas adicionais do XLSX oficial do SCF.

### Entregáveis da Fase 1:
- [ ] Schema do Drizzle expandido com novas tabelas de referência e junção.
- [ ] Migrations drizzle geradas e aplicadas localmente.
- [ ] Parser do SheetJS atualizado para mapear as abas extras.
- [ ] Serviço de importação (`scf-import.service.ts`) processando todo o dataset.
- [ ] Testes unitários do importador passando com fixture sintética estendida.

---

### Task 1: Schema do Banco de Dados (Drizzle)

**Files:**
- Modify: [schema.ts](file:///c:/Users/resper/OneDrive/Área de Trabalho/aegis-api/packages/schemas/src/db/schema.ts)
- Create migration: `packages/schemas/migrations/`

**Passo 1: Definir as novas tabelas e relacionamentos no schema**

Adicionar ao `packages/schemas/src/db/schema.ts` as seguintes definições de tabelas:

```typescript
// ── SCF Assessment Objectives ────────────────────────────────────────────────
export const scfAssessmentObjectives = pgTable("scf_assessment_objectives", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  scfVersionId: uuid("scf_version_id").notNull().references(() => scfVersions.id),
  scfControlId: uuid("scf_control_id").notNull().references(() => scfControls.id),
  objectiveCode: text("objective_code").notNull(), // e.g. GOV-01.1a
  text: text("text").notNull(),
  ...timestamps()
}, (table) => [
  index("scf_ao_control_idx").on(table.scfControlId),
  uniqueIndex("scf_ao_version_code_uidx").on(table.scfVersionId, table.objectiveCode)
]);

// ── SCF Evidence Request List (ERL) ──────────────────────────────────────────
export const scfEvidenceRequests = pgTable("scf_evidence_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  scfVersionId: uuid("scf_version_id").notNull().references(() => scfVersions.id),
  scfControlId: uuid("scf_control_id").notNull().references(() => scfControls.id),
  requestItem: text("request_item").notNull(),
  evidenceType: text("evidence_type"), // e.g. policy, log, config
  ...timestamps()
}, (table) => [
  index("scf_erl_control_idx").on(table.scfControlId)
]);

// ── SCF SCR-CMM Maturity Rubrics ─────────────────────────────────────────────
export const scfMaturityCriteria = pgTable("scf_maturity_criteria", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  scfVersionId: uuid("scf_version_id").notNull().references(() => scfVersions.id),
  scfControlId: uuid("scf_control_id").notNull().references(() => scfControls.id),
  level: integer("level").notNull(), // 0-5
  criteriaText: text("criteria_text").notNull(),
  remediationGuidance: text("remediation_guidance"),
  ...timestamps()
}, (table) => [
  index("scf_mc_control_level_idx").on(table.scfControlId, table.level),
  uniqueIndex("scf_mc_control_level_uidx").on(table.scfControlId, table.level)
]);

// ── SCF Risk Catalog ──────────────────────────────────────────────────────────
export const scfRisks = pgTable("scf_risks", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  scfVersionId: uuid("scf_version_id").notNull().references(() => scfVersions.id),
  riskCode: text("risk_code").notNull(), // C|P-RMM code
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  ...timestamps()
}, (table) => [
  uniqueIndex("scf_risks_version_code_uidx").on(table.scfVersionId, table.riskCode)
]);

export const scfRiskControlMappings = pgTable("scf_risk_control_mappings", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  scfVersionId: uuid("scf_version_id").notNull().references(() => scfVersions.id),
  scfRiskId: uuid("scf_risk_id").notNull().references(() => scfRisks.id),
  scfControlId: uuid("scf_control_id").notNull().references(() => scfControls.id),
  ...timestamps()
}, (table) => [
  uniqueIndex("scf_rc_mapping_uidx").on(table.scfRiskId, table.scfControlId)
]);

// ── SCF Threat Catalog ────────────────────────────────────────────────────────
export const scfThreats = pgTable("scf_threats", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  scfVersionId: uuid("scf_version_id").notNull().references(() => scfVersions.id),
  threatCode: text("threat_code").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  ...timestamps()
}, (table) => [
  uniqueIndex("scf_threats_version_code_uidx").on(table.scfVersionId, table.threatCode)
]);

export const scfThreatControlMappings = pgTable("scf_threat_control_mappings", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  scfVersionId: uuid("scf_version_id").notNull().references(() => scfVersions.id),
  scfThreatId: uuid("scf_threat_id").notNull().references(() => scfThreats.id),
  scfControlId: uuid("scf_control_id").notNull().references(() => scfControls.id),
  ...timestamps()
}, (table) => [
  uniqueIndex("scf_tc_mapping_uidx").on(table.scfThreatId, table.scfControlId)
]);
```

**Passo 2: Gerar a migration do Drizzle**

Run: `pnpm db:generate`
Expected: Nova migration SQL criada em `packages/schemas/migrations/` contendo as novas tabelas e FKs.

**Passo 3: Aplicar migration no banco local**

Run: `pnpm db:migrate` (garantir Docker postgres rodando via `docker compose -f infra/docker/docker-compose.yml up -d`)
Expected: Sucesso na execução e criação das tabelas no banco PostgreSQL.

**Passo 4: Commit**

```bash
git add packages/schemas/src/db/schema.ts packages/schemas/migrations/
git commit -m "db: add scf metadata, risk, threat, and maturity schema tables"
```

---

### Task 2: Atualização do Parser XLSX e Ingestão de Abas Extras

**Files:**
- Modify: [xlsx-tab-parser.ts](file:///c:/Users/resper/OneDrive/Área de Trabalho/aegis-api/packages/scf-core/src/importers/xlsx-tab-parser.ts)
- Modify: [xlsx-importer.ts](file:///c:/Users/resper/OneDrive/Área de Trabalho/aegis-api/packages/scf-core/src/importers/xlsx-importer.ts)
- Modify: [types.ts](file:///c:/Users/resper/OneDrive/Área de Trabalho/aegis-api/packages/scf-core/src/types.ts)

**Step 1: Atualizar tipos em `scf-core/src/types.ts`**

Adicionar as novas interfaces de dados que serão retornadas no `ScfDataset`:

```typescript
export interface ScfAssessmentObjective {
  id: string;
  scf_version_id: string;
  scf_control_id: string;
  objective_code: string;
  text: string;
}

export interface ScfEvidenceRequest {
  id: string;
  scf_version_id: string;
  scf_control_id: string;
  request_item: string;
  evidence_type?: string;
}

export interface ScfMaturityCriteria {
  id: string;
  scf_version_id: string;
  scf_control_id: string;
  level: number;
  criteria_text: string;
  remediation_guidance?: string;
}

export interface ScfRisk {
  id: string;
  scf_version_id: string;
  risk_code: string;
  title: string;
  description?: string;
  category?: string;
}

export interface ScfRiskControlMapping {
  id: string;
  scf_version_id: string;
  scf_risk_id: string;
  scf_control_id: string;
}

export interface ScfThreat {
  id: string;
  scf_version_id: string;
  threat_code: string;
  title: string;
  description?: string;
  category?: string;
}

export interface ScfThreatControlMapping {
  id: string;
  scf_version_id: string;
  scf_threat_id: string;
  scf_control_id: string;
}

// Estender ScfDataset no types.ts para incluir estas coleções.
```

**Step 2: Estender o `classifyTab` e regras do `xlsx-tab-parser.ts`**

Mudar as definições de classificação de abas para suportar:
- `assessment objectives`
- `evidence request`
- `maturity criteria` (colunas ou abas)
- `risk catalog`
- `threat catalog`

Atualizar o helper `classifyTab` para detectar estas abas caso existam de forma isolada, além de extrair suas colunas quando integradas à planilha de controles.

**Step 3: Modificar `xlsx-importer.ts` para extrair os dados**

1. Em `parseControlsTab`, extrair a coluna de Maturity Criteria (geralmente estruturada como L1, L2, L3, L4, L5 na planilha ou referenciada externamente).
2. Adicionar métodos dedicados:
   - `parseAssessmentObjectivesTab(rows, versionId, controlByCode)`
   - `parseEvidenceRequestsTab(rows, versionId, controlByCode)`
   - `parseRisksTab(rows, versionId, controlByCode)`
   - `parseThreatsTab(rows, versionId, controlByCode)`
3. Consolidar os dados retornados no `dataset`.

**Step 4: Executar os testes unitários de importação**

Run: `pnpm --filter @standard/scf-core test`
Expected: Passar com sucesso e verificar as estatísticas de importação contendo contagem maior que zero para os novos campos.

**Step 5: Commit**

```bash
git commit -am "feat(scf-core): extend xlsx importer to parse risks, threats, AOs, ERL and maturity criteria"
```

---

## Fase 2: APIs de Mapeamento, STRM e MCP Tools

Esta fase expõe as informações complexas do SCF de forma programática.

### Entregáveis da Fase 2:
- [ ] Endpoints de STRM e cobertura multi-framework expostos no `api-gateway`.
- [ ] Métodos correspondentes criados no `@standard/sdk`.
- [ ] MCP Server tools expostas no API gateway e no standalone MCP Server.
- [ ] Testes de contrato de API passando.

---

### Task 3: Implementação dos Endpoints de STRM & Mappings

**Files:**
- Modify: [scf.routes.ts](file:///c:/Users/resper/OneDrive/Área de Trabalho/aegis-api/apps/api-gateway/src/routes/scf.routes.ts)
- Modify: [scf-mapping.service.ts](file:///c:/Users/resper/OneDrive/Área de Trabalho/aegis-api/packages/scf-core/src/services/scf-mapping.service.ts)

**Step 1: Implementar o cálculo de STRM no Service**

Em `packages/scf-core/src/services/scf-mapping.service.ts`, adicionar método para comparação de frameworks com base no NIST IR 8477:

```typescript
export class ScfMappingService {
  // ... existente
  
  async compareFrameworks(
    sourceFrameworkId: string,
    targetFrameworkId: string,
    scfVersionId: string
  ) {
    // 1. Obter mapeamentos do framework A para controles SCF
    // 2. Obter mapeamentos do framework B para controles SCF
    // 3. Cruzar dados usando a tabela scfStrmRelationships para obter a força de mapeamento real (Subset Of, Equal, Intersects)
    // 4. Retornar score quantitativo de cobertura e gaps estimados
  }
}
```

**Step 2: Adicionar rotas na API**

Adicionar as rotas no `apps/api-gateway/src/routes/scf.routes.ts`:

- `GET /api/v1/scf/strm/compare` — Compara dois frameworks.
- `GET /api/v1/scf/strm/coverage` — Retorna cobertura percentual agregada.
- `GET /api/v1/scf/controls/:controlId/objectives` — Retorna os Assessment Objectives do controle.
- `GET /api/v1/scf/controls/:controlId/evidence-requests` — Retorna a lista de evidências necessárias (ERL).

**Step 3: Testar rotas via HTTP client**

Criar um teste simples ou curl local.
Run: `pnpm dev:api` e fazer requisição para `/api/v1/scf/strm/compare?source=...&target=...`
Expected: HTTP 200 contendo JSON estruturado com metadados do STRM.

**Step 4: Commit**

```bash
git commit -am "feat(api-gateway): add STRM comparison, AOs, and ERL endpoints"
```

---

### Task 4: SDK namespaces e MCP Tools

**Files:**
- Modify: [sdk/src/index.ts](file:///c:/Users/resper/OneDrive/Área de Trabalho/aegis-api/packages/sdk/src/index.ts)
- Modify: [api-gateway/src/mcp/tools/scf-extended.tools.ts](file:///c:/Users/resper/OneDrive/Área de Trabalho/aegis-api/apps/api-gateway/src/mcp/tools/scf-extended.tools.ts)

**Step 1: Estender o SDK Client**

Adicionar no `packages/sdk/src/index.ts` o namespace `client.scf.strm`:

```typescript
export class ScfStrmResource {
  constructor(private client: HttpClient) {}

  async compare(sourceFramework: string, targetFramework: string, version = "latest") {
    return this.client.get(`/api/v1/scf/strm/compare`, {
      params: { source: sourceFramework, target: targetFramework, version }
    });
  }

  async getCoverage(frameworkId: string, version = "latest") {
    return this.client.get(`/api/v1/scf/frameworks/${frameworkId}/coverage`, {
      params: { version }
    });
  }
}
```

**Step 2: Expor novas MCP Tools**

No arquivo `apps/api-gateway/src/mcp/tools/scf-extended.tools.ts`, criar as ferramentas:
- `calculate_framework_coverage`
- `find_framework_overlaps`
- `get_evidence_requirements`

```typescript
export const getEvidenceRequirementsTool = {
  name: "get_evidence_requirements",
  description: "Retrieve the Evidence Request List (ERL) / required artifacts for a given SCF control code.",
  inputSchema: {
    type: "object",
    properties: {
      controlCode: { type: "string", description: "The SCF control identifier (e.g. GOV-01)" },
      version: { type: "string", description: "Optional SCF version label (defaults to latest)" }
    },
    required: ["controlCode"]
  },
  handler: async (args: { controlCode: string, version?: string }, ctx: any) => {
    // Chamar serviço e retornar formatado
  }
};
```

**Step 3: Testar MCP Server compilado**

Verificar se o MCP responde corretamente via console ou test script.
Expected: MCP server inicializa e as novas ferramentas aparecem no schema retornado.

**Step 4: Commit**

```bash
git commit -am "feat(sdk,mcp): add STRM methods and evidence requirement tools to SDK and MCP"
```

---

## Fase 3: SCR-CMM Maturity Scoring Engine Real

Esta fase substitui a classificação simplificada por uma classificação orientada a rubricas do SCF por controle.

### Entregáveis da Fase 3:
- [ ] Ingestão de critérios de maturidade L0-L5 no `scf-core`.
- [ ] Implementação de lógica de comparação semântica e exata no `packages/maturity`.
- [ ] Endpoints `/assessments/:id/maturity` enriquecidos com target-vs-actual e heatmap.
- [ ] Agent runtime com a role `maturity-assessor` atualizada para verificar evidências contra rubricas L0-L5.

---

### Task 5: Implementação de Lógica de Scoring Baseada em Rubricas

**Files:**
- Modify: [maturity-classification.service.ts](file:///c:/Users/resper/OneDrive/Área de Trabalho/aegis-api/packages/maturity/src/services/maturity-classification.service.ts)
- Modify: [maturity-draft.service.ts](file:///c:/Users/resper/OneDrive/Área de Trabalho/aegis-api/packages/maturity/src/services/maturity-draft.service.ts)

**Step 1: Atualizar `classifyMaturity` para receber as rubricas oficiais**

Modificar a interface de entrada e lógica para ler os critérios cadastrados para o controle:

```typescript
export interface MaturityClassificationInputWithRubrics extends MaturityClassificationInput {
  rubrics: { level: number; criteriaText: string }[];
}

export const classifyMaturityWithRubrics = (
  input: MaturityClassificationInputWithRubrics
): ClassificationResult => {
  // 1. Executar classificação básica de corte (se gap não met -> 0, etc.)
  // 2. Para níveis 1-5, comparar as propriedades de evidência coletadas pelos agentes
  //    (hasDocumentation, hasProcess, etc.) com o texto descritivo na rubrica correspondente
  // 3. Retornar o score (0-5) suportado pelas rubricas do SCF
}
```

**Step 2: Atualizar Agent `maturity-assessor` para usar o engine**

Atualizar a prompt do agente `maturity-assessor` em `packages/agent-runtime/` para instruí-lo a analisar os documentos na KB com foco na rubrica exata fornecida pelo SCF para aquele controle (e.g. rubrica L3 de GOV-03 exige "comitê formalmente instituído").

**Step 3: Testar cálculo de maturidade**

Rodar testes de avaliação do agente.
Run: `pnpm --filter @standard/maturity test`
Expected: Testes passando e demonstrando a transição de maturidade correta baseada no nível de evidência e rubricas do banco.

**Step 4: Commit**

```bash
git commit -am "feat(maturity): calculate SCR-CMM scores using official SCF control rubrics"
```

---

## Fase 4: Risk & Threat Exposure Assessment Engine

Esta fase liga falhas e conformidades a riscos de negócios reais e ameaças catalogadas no SCF.

### Entregáveis da Fase 4:
- [ ] Banco de dados populado com catálogos de riscos e ameaças mapeados a controles.
- [ ] Endpoint `/api/v1/assessments/:id/risk-exposure` calculado de forma computável.
- [ ] POA&M Scheduler priorizando ações com base em fatores de risco reais (Control Weighting + Risk Weight).

---

### Task 6: Motor de Avaliação de Risco & Priorização POA&M

**Files:**
- Modify: [risk.routes.ts](file:///c:/Users/resper/OneDrive/Área de Trabalho/aegis-api/apps/api-gateway/src/routes/risk.routes.ts)
- Modify: [poam-prioritization.service.ts](file:///c:/Users/resper/OneDrive/Área de Trabalho/aegis-api/packages/poam/src/services/poam-prioritization.service.ts)

**Step 1: Mapear Gaps Ativos para Ameaças/Riscos no Route de Risco**

Em `apps/api-gateway/src/routes/risk.routes.ts`, implementar lógica dinâmica que busca todos os controles com status de gap `not_met` ou `partially_met` para o assessment atual, e resolve:
1. Os riscos associados (do `scf_risk_control_mappings`).
2. As ameaças ativadas (do `scf_threat_control_mappings`).
3. Calcula a "Exposição Inerente" vs "Exposição Residual".

**Step 2: Priorização do POA&M Inteligente**

Em `packages/poam/src/services/poam-prioritization.service.ts`, atualizar o algoritmo para usar:
$$\text{Remediation Priority Score} = \text{Control Weight} \times \text{Risk Severity Factor} \times (5 - \text{Current Maturity Level})$$

Isso garante que itens com maior risco, controles mais importantes no SCF e níveis mais baixos de maturidade sejam agendados e priorizados primeiro no pipeline de POA&M.

**Step 3: Testar priorização de POA&M**

Gerar um rascunho de POA&M para um assessment simulado e validar a ordenação das tarefas de remediação.
Expected: Controles críticos com gap (e.g. CRY-01 sob risco de quebra criptográfica) aparecem no topo com prioridade "Crítica".

**Step 4: Commit**

```bash
git commit -am "feat(risk,poam): calculate dynamic risk exposure and sort POA&M by risk index"
```

---

## Fase 5: Compliance-as-Code e Multi-Framework Compliance Optimizer

Esta fase habilita pipelines de CI/CD automatizados a usarem a Aegis API para validar compliance antes do deploy e otimizar rotas de auditoria.

### Entregáveis da Fase 5:
- [ ] Endpoint do otimizador de compliance multi-framework.
- [ ] MCP tool `optimize_compliance_strategy` disponível.
- [ ] SDK Helpers de verificação rápida em pipelines CI/CD.

---

### Task 7: Compliance Optimizer e Pipeline Checker

**Files:**
- Create: `packages/assessment-engine/src/services/compliance-optimizer.service.ts`
- Modify: [scf.routes.ts](file:///c:/Users/resper/OneDrive/Área de Trabalho/aegis-api/apps/api-gateway/src/routes/scf.routes.ts)
- Modify: [sdk/src/index.ts](file:///c:/Users/resper/OneDrive/Área de Trabalho/aegis-api/packages/sdk/src/index.ts)

**Step 1: Criar o Otimizador de Estratégia de Conformidade**

Implementar em `packages/assessment-engine/src/services/compliance-optimizer.service.ts` um algoritmo guloso (greedy algorithm) ou de knapsack que, dado um conjunto de frameworks desejados (ex: ISO 27001 + SOC 2 + HIPAA), ordena os controles SCF por **cobertura combinada por unidade de esforço** (baseado no STRM e ERL).

```typescript
export const optimizeCompliancePath = (
  frameworkIds: string[],
  scfVersionId: string,
  dependencies: any
) => {
  // Retorna a lista linear ótima de controles a implementar para maximizar o compliance score em menor tempo
};
```

**Step 2: Expor via API e SDK**

Adicionar endpoint `/api/v1/optimizer/compliance-strategy` na API gateway e mapear no SDK como `client.compliance.optimize()`.

**Step 3: Criar SDK Pipeline Helper**

Adicionar no SDK um método utilitário `client.compliance.verifyPipelineStatus(opts)` para ser usado em hooks de Github Actions que falha o build caso controles cruciais do SDLC (SDP) estejam em estado não-conforme.

**Step 4: Rodar Typecheck e Linter final**

Run: `pnpm typecheck` e `pnpm lint`
Expected: Monorepo sem erros de tipagem TypeScript ou linter.

**Step 5: Commit**

```bash
git commit -am "feat(optimizer): add compliance optimizer and CI/CD pipeline validation helpers"
```

---

## Plano de Verificação

### Testes Automatizados

A cada fase, os seguintes testes devem ser rodados:

```bash
# Ingestão e scf-core
pnpm --filter @standard/scf-core test

# Lógica de scoring de maturidade
pnpm --filter @standard/maturity test

# Lógica de POA&M e priorização
pnpm --filter @standard/poam test

# Teste global de rotas e integração
pnpm --filter @standard/api-gateway test
```

### Verificação Manual

1. Realizar o upload de um workbook SCF oficial (versão 2026.1.1) através da rota `/api/v1/admin/scf/import-xlsx` e verificar os logs de importação.
2. Usar uma ferramenta de consulta MCP (como o Claude Desktop ou terminal MCP CLI) e rodar a tool `get_evidence_requirements` para validar se a persistência e mapeamento de AOs/ERL estão corretos.
3. Simular um assessment incompleto e verificar se a rota de exposição de risco reflete com precisão as vulnerabilidades calculadas com base nas ameaças.
