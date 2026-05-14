# ADR-0009: Superpowers SDLC como Processo de Desenvolvimento

**Status**: aceita
**Data**: 2026-04-29
**Contexto**: O projeto utiliza agentes de coding assistido (Google Antigravity, Cursor, Codex, Claude Code) e precisava de um processo formal que governasse como esses agentes interagem com o repositório.
**Decisão**: Adotar o Superpowers SDLC como processo padrão de desenvolvimento, formalizado em `docs/superpowers/specs/2026-04-29-superpowers-sdlc-design.md`.
**Consequências**:
- Fluxo obrigatório: Brainstorm → Spec → Plan → Execute → Commit
- AGENTS.md tem precedência sobre regras locais dos agentes
- Contexto relevante deve ser persistido no repositório
- Agentes de IA não são runtime operacional do produto
- PRs de IA devem incluir `Co-Authored-By`
- GitHub é a fonte única de verdade
**Alternativas consideradas**:
- Sem processo: risco de inconsistência e perda de contexto entre sessões
- SDLC tradicional sem IA: não aproveita a capacidade dos agentes
**Referências**: `docs/superpowers/specs/2026-04-29-superpowers-sdlc-design.md`, `DEVELOPMENT.md`, `CONTEXT.md`
