# ADR 0002: Colapsar `tenants` em `organizations` (modelo de identidade único)

## Status

Proposta.

## Contexto

O modelo de identidade atual mantém **duas representações paralelas** de cada
conceito, ligadas por uma camada de tradução em tempo de request:

| Conceito | Mundo Auth (Standard Native Auth) | Mundo Domínio (Standard) |
|----------|-----------------------------------|--------------------------|
| Usuário  | `user` (id = texto)               | `users` (id = uuid)      |
| Org      | `organization` (id = texto)       | `organizations` (uuid) + `tenants` (uuid) |
| Membro   | `member`                          | `memberships`            |

A "cola" entre os mundos é `resolveTenantContext()`, que aparece em ~9 arquivos
do `api-gateway` e usa um palpite de formato (`isUuid` regex, replicado em ~25
lugares) para decidir como resolver o ID. Quando a tradução falha, o JIT
provisioning **cria silenciosamente um tenant novo** em vez de falhar — o que
esconde bugs e gera "tenants fantasma".

Sintomas concretos já observados:

- Criação de API key falhava em silêncio para o platform admin: o slug `"bekaa"`
  era resolvido para o ID interno do Better Auth (formato nanoid), tratado como
  slug desconhecido, e provisionava um tenant errado. (Corrigido em
  `auth.middleware.ts` + `tenant-mapping.ts`, mas a classe de bug permanece.)
- `useActiveOrg` no frontend precisava de fallback `"bekaa"` que vazava como ID
  em paths de URL, gerando 400.

A hierarquia `tenants` → `organizations` é **sempre 1:1** no produto. Não há, e
**nunca haverá**, caso de uso de múltiplas organizações sob um mesmo tenant
(decisão de produto confirmada). Portanto a tabela `tenants` é puro overhead:
duplica IDs, força tradução e multiplica a superfície de bug.

`tenant_id` é, hoje, FK e chave de particionamento (isolamento multi-tenant) em
**~40 tabelas e ~237 arquivos**. Remover a coluna de uma vez é inviável com
segurança: erro aqui = vazamento de dados entre clientes, o pior bug possível
num produto GRC.

## Decisão

Adotar **`organizations` como o único conceito de espaço de trabalho** e
eliminar `tenants`. A migração é **faseada** e nenhuma fase remove dados antes
da seguinte estar validada em produção.

### Princípio de convergência de ID

Toda nova organização passa a usar **o mesmo UUID** em todas as camadas: o `id`
da org no Better Auth, o `organization_id` do domínio. Isso torna
`resolveTenantContext` uma função identidade para dados novos — sem tradução,
sem palpite de formato, sem JIT fantasma.

### Fases

**Fase 0 — Blindar a cola (sem migração, baixo risco). ✅ _Concluída._**
- `resolveTenantContext` agora é **somente leitura**: retorna `null` quando a org
  não está provisionada, em vez de criar tenant fantasma. Criação foi extraída
  para `provisionTenantContext`, idempotente e chaveada por slug, chamada apenas
  em pontos de provisionamento deliberados (criação de org, bootstrap do
  operador). Regex de UUID centralizada.
- Resultado: a classe de bug "tenant fantasma" desapareceu sem tocar no schema.

**Fase 1 — Convergir IDs em escrita (aditivo, sem destruição).**
- ✅ _Código concluído:_ `provisionTenantContext` reusa o UUID da BA org como
  `tenants.id` **e** `organizations.id` quando o ID é UUID (todas as orgs criadas
  pela rota de usuário são). Os três IDs convergem → resolução vira identidade e,
  para linhas convergidas, `tenant_id` já é igual a `organization_id`. Orgs
  legadas com ID não-UUID (ex.: operador semeado) mantêm IDs gerados.
- ⏳ _Pendente (requer dump de produção):_ backfill das orgs existentes para
  alinhar `organizations.id`/`tenants.id` ao UUID da BA org, via script
  idempotente testado contra dump antes de aplicar.

**Fase 2 — Repointar FKs `tenant_id` → `organization_id`.**
- Para cada uma das ~40 tabelas, adicionar verificação de que `tenant_id` é
  derivável de `organization_id` (1:1 garantido pela Fase 1).
- Atualizar repositórios para filtrar por `organization_id` apenas. Manter
  `tenant_id` como coluna preenchida (espelho) durante a transição para permitir
  rollback.

**Fase 3 — Remover `tenants` e a coluna `tenant_id`.**
- Após período de soak em produção sem regressão, dropar a tabela `tenants`,
  a coluna `tenant_id` das ~40 tabelas, e o código de resolução remanescente.

### Decisão explícita: não haverá hierarquia

A coluna `tenants.parentId` e qualquer noção de árvore de tenants são
descartadas. Se um dia surgir necessidade de holding/subsidiárias, resolve-se
com um `parent_id` opcional em `organizations` — não com uma tabela separada.

## Consequências

**Benefícios:**
- Elimina a classe de bug slug-vs-UUID / tenant fantasma.
- ~21 chamadas a `resolveTenantContext` colapsam para lookups triviais.
- `useActiveOrg` no frontend perde o fallback `"bekaa"`.
- Uma query de contexto por request em vez de duas.

**Custos / riscos:**
- Fases 1–3 envolvem migração de dados de produção: exigem backup, dry-run
  contra dump real e plano de rollback por fase.
- `tenant_id` é chave de isolamento multi-tenant; erro de repointamento na Fase 2
  pode vazar dados entre orgs. Cada fase exige testes de isolamento.

**Regra de ouro:** nenhuma fase remove dados ou colunas antes de a fase anterior
estar validada em produção. A Fase 0 não toca no schema e captura a maior parte
do ganho de robustez.
