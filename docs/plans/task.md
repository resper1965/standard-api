# Tasks Checklist — Auth & Tenancy Hardening

| Task ID | Task Description | Status |
|---|---|---|
| TASK-01 | Implementar normalização de path e bloqueio estrito de `/api/auth/sign-up` em `index-helpers.ts` | [x] |
| TASK-02 | Refatorar endpoint `/approve` em `admin-users.routes.ts` para realizar o update do `userId` na tabela `organizations` | [x] |
| TASK-03 | Remover short-circuit de aprovação em `admin-users.routes.ts` permitindo associação a usuários já aprovados | [x] |
| TASK-04 | Rodar testes locais no gateway para garantir ausência de regressões | [x] |
| TASK-05 | Executar deploy em produção da Standard API no Cloudflare Workers | [x] |
