# ADR: Refactoring Sprint 2026-06-05

- **Status**: Aceito
- **Data**: 2026-06-05
- **Decisor**: Equipe de plataforma

## Contexto

O codebase apresentava complexidade ciclomática elevada em módulos críticos: api-gateway (`app.ts`, `index.ts`), `assessment-engine/prerequisites.ts`, `agent-runtime/council.ts`, `gap-analysis/gap-validation.service.ts`, `poam/poam-validation.service.ts` e `poam/poam-prioritization.service.ts`. Componentes de admin em `apps/web/src/pages/admin/` eram monolíticos (ex.: `Users.tsx`, `Organizations.tsx`), dificultando manutenção.

O Fallow report identificou dezenas de targets de refatoração, com score de maintainability abaixo do desejado.

## Decisão

Aplicar um sprint de refatoração focado em quatro estratégias:

1. **Helper extraction (api-gateway):** Extrair setup de rotas para `app-helpers.ts` e bootstrap de dependências para `index-helpers.ts`, reduzindo o tamanho e a complexidade dos entrypoints `app.ts` e `index.ts`.

2. **Declarative prerequisite lookup table (assessment-engine):** Substituir lógica imperativa de verificação de pré-requisitos por uma tabela de lookup declarativa (`prerequisiteRules`) em `prerequisites.ts`. Cada estado-alvo mapeia a uma lista de regras `{ check, label }`.

3. **Dispatch map pattern (agent-runtime/council):** Substituir cadeia de `if/else` para roteamento de agentes por um `AgentDispatchMap` construído dinamicamente em `buildAgentDispatcher()`. Cada agente registra um handler no mapa; agentes desconhecidos caem no executor genérico.

4. **Declarative validation rules (gap-analysis, poam):** Implementar validação por item como listas declarativas de regras composíveis em `gap-validation.service.ts`, `poam-validation.service.ts` e `poam-prioritization.service.ts`. Mapeamento de `action_type` em POAM usa tabela declarativa indexada por tipo de gap.

5. **Component decomposition (apps/web):** Decompor páginas admin monolíticas em componentes reutilizáveis em `apps/web/src/pages/admin/components/` — incluindo `AdminUsersTable.tsx`, `ConfirmActionDialog.tsx`, `CreateUserDialog.tsx`, `EditUserDialog.tsx` e `admin-users-utils.ts`.

## Consequências

### Positivas

- **Maintainability score:** subiu para 91.0 (Fallow).
- **Complexidade ciclomática média:** reduzida para 2.2.
- **Refactoring targets restantes:** reduzidos para 38.
- Adicionar novas regras de pré-requisito, validação ou agentes requer apenas inserir uma entrada em tabela/lista — sem alterar lógica de controle.
- Componentes admin menores e mais testáveis.

### Negativas / Riscos

- 38 targets de refatoração ainda permanecem para sprints futuros.
- Indireção adicional pode dificultar rastreamento manual em módulos com dispatch maps.
- Novos contribuidores precisam entender o padrão declarativo antes de adicionar regras.

## Alternativas Consideradas

- **Manter lógica imperativa:** Rejeitado — alta complexidade ciclomática dificulta manutenção e testes.
- **Refatoração completa (todas as targets):** Escopo excessivo para um sprint; priorização por impacto.
- **Uso de framework de regras externo:** Desnecessário para a escala atual; tabelas nativas TypeScript são suficientes.

## Referências

- `packages/assessment-engine/src/prerequisites.ts` — declarative prerequisite lookup table
- `packages/agent-runtime/src/council.ts` — dispatch map pattern
- `packages/gap-analysis/src/services/gap-validation.service.ts` — declarative validation rules
- `packages/poam/src/services/poam-validation.service.ts` — declarative validation rules
- `packages/poam/src/services/poam-prioritization.service.ts` — declarative action-type mapping
- `apps/api-gateway/src/app-helpers.ts` — extracted route setup helpers
- `apps/api-gateway/src/index-helpers.ts` — extracted dependency bootstrap
- `apps/web/src/pages/admin/components/` — decomposed admin UI components
