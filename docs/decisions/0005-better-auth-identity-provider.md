# ADR-0005: Better Auth como Identity Provider

**Status**: aceita
**Data**: 2026-05-01
**Contexto**: O projeto precisava de um provedor de autenticação real para substituir `MockAuthProvider` e `JwtAuthProvider`. Alternativas avaliadas: Clerk, Auth0, Supabase Auth, Lucia Auth, Better Auth.
**Decisão**: Adotar Better Auth como identity provider com session cookies, Google OAuth, API keys, organizations e secondary storage via Cloudflare KV.
**Consequências**:
- Better Auth gera e mantém 8 tabelas no PostgreSQL (user, session, account, verification, organization, member, invitation, apikey)
- Session cookies eliminam necessidade de JWT no frontend
- Secondary storage via KV elimina round-trip ao DB para validação de sessão
- Organizations plugin habilita multi-tenancy nativa
- API keys plugin habilita M2M e acesso programático
**Alternativas consideradas**:
- Clerk: SaaS externo, vendor lock-in, custo por MAU
- Auth0: complexidade desnecessária para MVP
- Lucia Auth: descontinuado
**Referências**: `packages/auth/`, `apps/api-gateway/src/routes/auth.routes.ts`
