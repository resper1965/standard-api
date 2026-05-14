# Integration Tests

Os testes de integração principais rodam hoje nos pacotes existentes:

- API: `apps/api-gateway/tests`
- Workflows: `workers/workflows/tests`
- Queues/KB: `packages/kb/tests` e `workers/queues`
- Reporting: `packages/reporting/tests`
- Security: `packages/security/tests` e `apps/api-gateway/tests/api-security.test.ts`

Use:

```bash
pnpm test:integration
```

Testes que dependam de Cloudflare real devem ficar fora do CI principal e exigir configuração explícita de ambiente.
