# ADR-0010: Descarte da Branch `feature/architecture-refactoring`

- **Status**: Aceito
- **Data**: 2026-05-08
- **Decisor**: Equipe de plataforma

## Contexto

A branch `feature/architecture-refactoring` contém 5 commits que implementam:
1. Isolamento do `scf-core` e remoção de dependências zumbi
2. Configuração de Better Auth KV secondary storage
3. Middleware GRC ABAC + abstrações CQRS
4. Bump do SCF seed gen para 2026.1.1
5. Mapping ISO/IEC 42001:2023 AI Management

## Decisão

**Descartar a branch** — todas essas mudanças já foram incorporadas em `main` através do commit `6794f00` (git stabilization). A branch está 36.888 linhas atrás de `main` (massiva divergência) e não contém trabalho não-integrado.

## Consequências

- Branch marcada para deleção
- Nenhum trabalho perdido
- Simplifica o repositório para 1 branch ativa (`main`)

## Ação

```bash
git branch -D feature/architecture-refactoring
git push origin --delete feature/architecture-refactoring  # when ready
```
