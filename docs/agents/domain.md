# Domain Docs

## Layout: Single-context

This repo uses a single shared domain context for all packages and apps.

| File           | Location    | Purpose                                    |
| -------------- | ----------- | ------------------------------------------ |
| `CONTEXT.md`   | repo root   | Domain language, bounded contexts, glossary |
| `adr/`         | repo root   | Architecture Decision Records              |

## Consumer rules

1. **Always read `CONTEXT.md` first** when entering a new task — it defines the project's domain language (SCF, assessments, tenants, agents, etc.).
2. **Check `adr/` before proposing architectural changes** — a past ADR may already address the question.
3. **Never modify `CONTEXT.md` without user approval** — it is the source of truth for domain vocabulary.
4. **When adding a new bounded context** (e.g., a new package), update `CONTEXT.md` rather than creating a separate file.
