# Spec: Infraestrutura Real (Auth & Database)

## Resumo
Substituir as fundações em "Mock" elaboradas no MVP (MockAuthProvider) para instâncias preparadas à operação viva do Cloudflare (BFF Gateway conectando em JWT verificado e conectando Drizzle via driver assíncrono ao relacional Postgres).

## Escopo (Fase 4: Infra Cloudflare)
### 1. Implementação JWT Auth Provider (`packages/security`)
O Standard atualmente resolve contexto de tráfego usando o pacote nativo `packages/security` invocando `MockAuthProvider`. Como o Cloudflare atua no edge, usaremos a interface padrão exportada para injetar o `JwtAuthProvider`.
- **Validação:** Parsing de bearer token nativo.
- **Isolamento de Tenants:** O Token validado retornará o `tenant_id` atestado na fonte da autoridade da infraestrutura em conformidade ao `AuthContext`.

### 2. Configuração de Persistência Worker-To-Postgres (`packages/assessment-engine` ou Core infra)
O `schema.ts` do Drizzle já lista rigorosa governança com +1100 linhas englobando estado, tenants, e aprovações humanas. Iremos pavimentar o runtime connection:
- Iniciar o bootstrap de conexão Drizzle.
- Integrar provedor severless edge (ex: `postgres.js` ou equivalente validado no ecossistema do Drizzle para Workers/Hyperdrive).
- Adicionar string de conexão via `env` type definitions localmente no `api-gateway`.

### 3. Middleware Update do API Gateway (`apps/api-gateway`)
- Alavancar o gateway para expurgar a linha hardcode `new MockAuthProvider("development")`.
- Injetar dependências orgânicas do `Env` para orquestrar as instâncias de segurança com o Cloudflare Bindings reais.

## Validação
Essa arquitetura atende primariamente ao Roadmap Master do projeto, deslocando a maturidade base para o quadrante *Production-Ready*. Os testes unitários passarão a consumir o driver real via injeção por proxy de testes.

