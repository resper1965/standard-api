---
title: "Standard Assessment Engine"
---

# Standard Assessment Engine

## Objetivo

O `Standard Assessment Engine` é o pacote reutilizável que controla o lifecycle do assessment no `standard-api-standard`. Ele define estados, transições permitidas, gates de aprovação humana, regras de versionamento de artefatos e eventos de rastreabilidade operacional.

O pacote vive em `packages/assessment-engine` e foi desenhado como lógica pura. Ele não acessa Cloudflare, PostgreSQL, R2, Vectorize, LLMs ou frontend diretamente.

## Estados do Lifecycle

Estados canônicos:

```text
draft
-> documents_uploaded
-> documents_ingested
-> scf_pre_analysis_ready
-> framework_selected
-> scope_drafted
-> soa_drafted
-> soa_under_review
-> soa_approved
-> soa_ingested
-> evidence_analysis_ready
-> gap_analysis_drafted
-> gap_analysis_under_review
-> gap_analysis_approved
-> maturity_assessed
-> maturity_under_review
-> maturity_approved
-> poam_drafted
-> poam_under_review
-> poam_approved
-> report_generated
-> closed
-> archived
```

Estados de interrupção:

```text
failed
cancelled
blocked
```

## Transições

O módulo `transitions.ts` contém a lista explícita de transições permitidas. `engine.ts` expõe:

- `validateTransition`: valida tenancy, transição permitida, pré-requisitos e approval gate.
- `executeTransition`: valida e retorna o novo snapshot do assessment com um `AssessmentLifecycleEvent`.

Cada evento contém:

- `tenantId`
- `organizationId`
- `assessmentId`
- `previousState`
- `nextState`
- `eventType`
- `actorId` ou `systemActor`
- `reason`
- `timestamp`
- `traceId`
- `idempotencyKey`, quando fornecida
- `metadata` seguro

## Gates de Aprovação Humana

Os gates obrigatórios são implementados em `approvals.ts`.

```text
soa_approved -> approval gate: soa
gap_analysis_approved -> approval gate: gap_analysis
maturity_approved -> approval gate: maturity_assessment
poam_approved -> approval gate: poam
closed -> approval gate: report
```

Transições para esses estados falham com `APPROVAL_REQUIRED` quando não recebem um `approvalEvent` aprovado. Se o gate do approval não corresponde ao estado alvo, o engine falha com `APPROVAL_GATE_MISMATCH`.

## Versionamento

Artefatos versionáveis:

- `scope`
- `soa`
- `gap_analysis`
- `maturity_assessment`
- `poam`
- `report`

Status suportados:

```text
draft
under_review
approved
superseded
archived
```

`artifacts.ts` expõe:

- `createArtifactVersion`
- `createNextArtifactVersion`
- `markArtifactUnderReview`
- `approveArtifactVersion`
- `supersedeApprovedVersions`
- `assertVersionEditable`

## Imutabilidade

Versões aprovadas são imutáveis. `assertVersionEditable` bloqueia edição direta de versões `approved` com o erro `ARTIFACT_VERSION_IMMUTABLE`.

Alterações após aprovação devem usar `createNextArtifactVersion`, gerando uma nova versão `draft` com `supersedesVersionId` apontando para a versão anterior.

## Rastreabilidade

Toda operação crítica exige contexto explícito:

- `tenantId`
- `organizationId`
- `assessmentId`
- `traceId`
- `reason`
- `actorId` ou `systemActor`

O engine valida que o `TransitionContext` corresponde ao snapshot do assessment antes de permitir qualquer transição. Isso evita mistura acidental entre tenants, organizações e assessments.

## Consumo Por API, Workflows e Workers

Consumidores esperados:

- API gateway: valida comandos síncronos e retorna erros padronizados.
- Cloudflare Workflows: orquestra o lifecycle durável e chama `executeTransition` nos checkpoints.
- Queue workers: validam efeitos assíncronos antes de avançar o estado.
- Integrações futuras: usam os tipos, schemas e interfaces de repository.

Persistência deve ser feita fora do pacote, por adapters que implementem:

- `AssessmentRepository`
- `ArtifactVersionRepository`
- `ApprovalRepository`
- `AuditLogRepository`
- `LifecycleEventRepository`

## O Que O Engine Não Faz

- Não implementa frontend.
- Não executa agentes LLM.
- Não chama modelos.
- Não acessa R2, Vectorize, Workflows, Queues ou banco diretamente.
- Não importa SCF real.
- Não cria mappings SCF.
- Não decide compliance final sem approval gates.
- Não registra conteúdo sensível em logs.

## Testes

Os testes ficam em `packages/assessment-engine/tests` e cobrem:

- Transições permitidas.
- Bloqueio de transições inválidas.
- Gates de aprovação.
- Versionamento de artefatos.
- Imutabilidade de versões aprovadas.
- Preservação de `tenantId`, `organizationId`, `assessmentId` e `traceId`.

Comando:

```bash
pnpm --filter @standard/assessment-engine test
```

## Decisões em Aberto

- Definir se `report_approved` será um estado próprio ou evento associado ao fechamento.
- Definir se `blocked` poderá retornar ao estado anterior via uma transição explícita `unblocked`.
- Definir se as regras de pré-requisito serão alimentadas por projections dedicadas do banco ou snapshots compostos pela API.
- Definir granularidade futura de RBAC/ABAC; hoje há contexto e interfaces, mas não política concreta.
- Definir se a imutabilidade também será reforçada por triggers no PostgreSQL além da service layer.

