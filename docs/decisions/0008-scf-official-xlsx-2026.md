# ADR-0008: SCF Official XLSX 2026.1.1

**Status**: aceita
**Data**: 2026-05-04
**Contexto**: O motor de assessment precisava de dados SCF reais em vez dos fixtures sintéticos usados no MVP.
**Decisão**: Adotar o workbook oficial SCF 2026.1.1 (XLSX) como fonte normativa, com importador dedicado em `packages/scf-core/scripts/`.
**Consequências**:
- Arquivo fonte: `assets/Secure Controls Framework (SCF) - 2026.1.1.xlsx`
- Importador: `packages/scf-core/scripts/extract-framework-from-xlsx.ts`
- Seed pipeline: `packages/scf-core/scripts/apply-seed.ts`
- Controles, domínios, frameworks e mappings oficiais extraídos e carregados no PostgreSQL
- Fixtures sintéticos mantidos para testes, mas dados reais usados em staging/production
- `is_synthetic` flag diferencia dados sintéticos de oficiais
**Alternativas consideradas**:
- OSCAL format: não disponível oficialmente para SCF na versão atual
- CSV manual: propenso a erros, não reproduce a estrutura oficial
- API third-party: não existe API oficial do SCF Foundation
**Referências**: `docs/decisions/0004-scf-data-source-of-truth.md`, `packages/scf-core/`
