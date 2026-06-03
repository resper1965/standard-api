---
title: "ADR-012: Risco Aceito — SheetJS (xlsx) sem patch disponível"
---

# ADR-012: Risco Aceito — SheetJS (xlsx) sem patch disponível

**Status**: Accepted (Risco Aceito com Controles Compensatórios)  
**Data**: 2026-05-26  
**Decisor**: Engineering + Security  
**Contexto**: §10 Security Sign-Off — Production Go-Live Checklist

---

## Contexto

Durante o security audit pré-go-live (`pnpm audit`), foram identificadas duas vulnerabilidades no pacote `xlsx` (SheetJS) versão `0.18.5`:

| CVE | Tipo | Severidade | Patched |
|-----|------|-----------|---------|
| [GHSA-4r6h-8v6p-xvh6](https://github.com/advisories/GHSA-4r6h-8v6p-xvh6) | Prototype Pollution | High | ❌ Sem patch npm |
| [GHSA-2mfr-m8pp-9cxv](https://github.com/advisories/GHSA-2mfr-m8pp-9cxv) | ReDoS | High | ❌ Sem patch npm |

O pacote `xlsx` no npm foi **abandonado** após a versão 0.18.x. A SheetJS migrou para um modelo de distribuição privado (`cdn.sheetjs.com`) para versões superiores, que requer licença comercial.

---

## Análise de Impacto Real

### Contexto de uso no Standard

O `xlsx` é usado **exclusivamente** em:
- `packages/scf-core/src/importers/xlsx-importer.ts` — importação do arquivo SCF spreadsheet
- Endpoint: `POST /api/v1/admin/scf/import-runs` (payload `source_type: "xlsx"`)

### Controles compensatórios existentes

| Controle | Status |
|----------|--------|
| Endpoint restrito a `platform_admin` + `admin:write` | ✅ |
| Validação de assinatura ZIP antes do parse | ✅ (EICAR test + magic bytes) |
| Limite de tamanho de arquivo (10MB) | ✅ |
| Execução server-side em sandbox Cloudflare Workers | ✅ |
| Sem execução de macros ou conteúdo ativo | ✅ |
| SCF import é operação de ingestão, não exposição de dados | ✅ |

### Superfície de ataque real

- **Prototype Pollution**: Requer que um atacante faça upload de um arquivo XLSX malicioso via endpoint `platform_admin`. Um atacante com `platform_admin` já tem controle total da plataforma — o vetor de ataque não agrega risco incremental significativo.
- **ReDoS**: Requer upload de conteúdo especialmente crafted. Mesmo que ocorra, é limitado ao Worker da importação (isolado, sem afetar outros tenants).

**Conclusão**: Risco baixo dada a superfície de ataque limitada.

---

## Decisão

**Aceitar o risco** com os controles compensatórios existentes e as seguintes ações adicionais:

1. **Monitorar** releases de `xlsx` no npm e atualizações de CVE
2. **Avaliar migração** para `exceljs` (MIT, ativamente mantido, sem CVEs conhecidos) como tarefa P2
3. **Revalidar** este ADR a cada 6 meses ou quando surgir novo CVE high/critical

---

## Alternativas consideradas

### Migrar para ExcelJS

- **Prós**: MIT, mantido, sem CVEs conhecidos, API similar
- **Contras**: Requer reescrita do `xlsx-importer.ts` (estimativa: 1-2 dias de eng), regressão do pipeline de importação SCF
- **Decisão**: Diferido para P2 (pós go-live)

### Usar SheetJS Pro

- **Prós**: Versões recentes com patches
- **Contras**: Custo de licença, mudança de distribuição, acoplamento comercial
- **Decisão**: Não adotado

### Remover endpoint xlsx-import

- **Prós**: Elimina o risco
- **Contras**: Remove funcionalidade crítica de importação do SCF
- **Decisão**: Não viável

---

## Consequências

- `xlsx 0.18.5` permanece em produção com controles compensatórios
- Issue criada para migração para `exceljs`: ver backlog post-MVP
- `pnpm audit` continuará reportando estas vulnerabilidades — são **conhecidas e aceitas**
- Adicionar ao `docs/operations/go-live-status.md` como risco documentado

---

## Referências

- [SheetJS licensing changes](https://sheetjs.com/pro)
- [ExcelJS GitHub](https://github.com/exceljs/exceljs)
- [GHSA Prototype Pollution](https://github.com/advisories/GHSA-4r6h-8v6p-xvh6)
- [GHSA ReDoS](https://github.com/advisories/GHSA-2mfr-m8pp-9cxv)
