# ADR 0006: Drizzle ORM

## Status

Aceita.

## Contexto

Precisamos de uma ferramenta de modelagem relacional (ORM) de alto desempenho, compatível com execução na Edge (Cloudflare Workers) e com TypeScript estrito, para gerenciar as entidades de assessments, organizações, tenants, logs e autenticação no Neon PostgreSQL.

## Decisão

Adotamos o **Drizzle ORM** como a camada relacional padrão do projeto.
- Definição do schema relacional em TypeScript (`packages/schemas`).
- Uso do `drizzle-kit` para geração automatizada de SQL migrations de banco de dados.
- Aplicação das migrações por meio do pipeline de deployment usando `pnpm db:migrate` apontando para o Neon `DATABASE_URL`.
- Criação de helpers utilitários para isolar tipos complexos de joins e consultas em repositórios dedicados por pacote.

## Consequências

- Type safety completa desde a definição do banco de dados até os mappers de resposta da API.
- Zero sobrecarga em runtime comparado com ORMs pesadas baseadas em engines nativas (ex: Prisma clássico sem Edge driver).
- Facilidade na criação e aplicação de migrations controladas por versionamento git.
