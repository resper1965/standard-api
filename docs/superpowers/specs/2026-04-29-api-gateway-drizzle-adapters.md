# Spec: API Gateway Drizzle Adapters Integration

## Resumo
O `api-gateway` atualmente é inteiramente mockado em suas interações transacionais por intermédio da factory genérica `createMockRepositories()`. Para cumprir o Master Roadmap rumo ao ambiente Cloudflare-native, precisamos substituir esses repositórios pelas execuções em SQL usando o **Drizzle ORM** atrelado ao driver `@neondatabase/serverless` ou Neon HTTP, consumindo as definições exportadas por `@standard/schemas`.

## Escopo (Fase 4: Database Runtime)
### 1. Injeção de Driver Híbrido (`apps/api-gateway`)
- Instalaremos a biblioteca Driver nativa pra edge (`@neondatabase/serverless`) e o construtor `drizzle-orm/neon-http`.
- A inicialização do banco será baseada na variável do Worker (`env.DATABASE_URL`), que será repassada na assinatura ao inicializar o `createApp()`.

### 2. Conversão de Repositórios Mock para Drizzle SQL
O gateway especifica os seguintes adapters cruciais no arquivo `src/http.ts` e inicializados em `src/adapters`:
- `TenantRepositoryAdapter`
- `OrganizationRepositoryAdapter`
- `AssessmentRepositoryAdapter`
- `ApprovalRepositoryAdapter`
- `ArtifactRepositoryAdapter`
- `LifecycleEventRepositoryAdapter`
- `AuditRepositoryAdapter`

Os repositórios na pasta `apps/api-gateway/src/adapters` (ex: `organization.repository.ts`, `assessment.repository.ts`) serão convertidos de instâncias em `Map<string, Record>` para classes usando os seletores e mutadores do `drizzle` combinados om transações Drizzle DB (`tx`).

### 3. Integração na Camada de Factory (`adapters/index.ts`)
A função `createMockRepositories()` persistirá até implementarmos todos os pacotes, porém a invocação principal injetará uma variante `createDrizzleRepositories()` que provê a pipeline completa em staging e production.

## Limitações / Out of Scope
Pacotes isolados que recebem os repositórios injetados (ex: `soa`, `gapAnalysis`, `scf`) não requerem mudanças estruturais internas neste momento se seus esquemas de mock não violarem as chaves estrangeiras. Apenas a persistência direta do roteamento será comitada.

