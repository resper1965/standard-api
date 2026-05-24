# Índice de Decisões

Este arquivo é o índice central de decisões arquiteturais e operacionais relevantes do projeto.

## ADRs

- `adr/0001-estrutura-base-do-projeto.md`: GitHub como fonte única de verdade para código, contexto, prompts e decisões.

## Decisões Arquiteturais

- `docs/decisions/0001-platform-boundaries.md`: limites de plataforma e responsabilidades.
- `docs/decisions/0002-neon-serverless-postgres.md`: Neon PostgreSQL como banco transacional gerenciado.
- `docs/decisions/0003-cloudflare-infra-automation.md`: automação de infraestrutura Cloudflare.
- `docs/decisions/0004-scf-data-source-of-truth.md`: SCF estruturado como fonte normativa de verdade.
- `docs/decisions/0005-better-auth-identity-provider.md`: Better Auth como identity provider.
- `docs/decisions/0006-drizzle-orm.md`: Drizzle ORM para PostgreSQL.
- `docs/decisions/0007-design-system-trust-authority.md`: Design system "Trust & Authority".
- `docs/decisions/0008-scf-official-xlsx-2026.md`: SCF Official XLSX 2026.1.1 como fonte de dados.
- `docs/decisions/0009-superpowers-sdlc.md`: Superpowers SDLC como processo de desenvolvimento.
- `docs/decisions/adr-0010-discard-architecture-refactoring-branch.md`: Descarte da branch feature/architecture-refactoring.

## Como Registrar Nova Decisão

Crie um novo arquivo em `docs/decisions/` seguindo numeração incremental:

```text
docs/decisions/0010-titulo-curto-da-decisao.md
```

Cada ADR deve registrar:

- status;
- contexto;
- decisão;
- consequências;
- alternativas consideradas;
- links para documentação relacionada.

## Regras

- Decisões não devem ficar apenas em chat, issue ou memória local.
- Decisões que afetam arquitetura, segurança, API, workflows, dados, agentes ou produção exigem ADR ou documentação equivalente.
- Se uma decisão substituir outra, atualizar este índice e marcar a decisão anterior como superseded.
