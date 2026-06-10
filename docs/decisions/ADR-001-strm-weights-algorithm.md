# ADR-001 — Algoritmo de Ponderação STRM (NIST IR 8477)

**Status:** Aceite  
**Data:** 2026-06-10  
**Autores:** Análise de Gap Blueprint (Partes 1–4)

---

## Contexto

O endpoint `GET /api/v1/assessments/:id/compliance-gap` calcula atualmente o índice
de conformidade com uma fórmula binária:

```ts
compliancePct = (implementedControls / totalControls) * 100
```

Esta fórmula trata todos os controlos SCF com peso igual, independentemente da força
da relação regulatória entre o controlo e o requisito da norma externa. Isso produz
**falsos positivos jurídicos** — um requisito legal mapeado via `superset` (⊃) recebe
o mesmo peso que um mapeado via `equal` (=), distorcendo o índice real de resiliência.

O Blueprint especifica o motor STRM baseado em NIST IR 8477 com pesos matemáticos.

---

## Decisão

Adoptar a **Weights Matrix STRM** como único mecanismo de cálculo de compliance index.

### Weights Matrix

| Operador STRM | Símbolo | Peso |
|---|---|---|
| `equal` | = | 1.0 (fixo) |
| `subset` | ⊂ | 1.0 (fixo) |
| `intersects` | ∩ | `strength_score` (0.1–0.9, dinâmico do DB) |
| `superset` | ⊃ | min(0.5, `strength_score`) — teto 0.5 |
| `no_relation` | Ø | 0.0 (fixo) |

### Fórmula de Consolidação

```
compliance_index =
  Σ( (maturity_level / 5) × weight(operator, strength_score) )
  ──────────────────────────────────────────────────────────────
  Σ( weight_max(operator) )

onde:
  weight_max(equal)       = 1.0
  weight_max(subset)      = 1.0
  weight_max(intersects)  = strength_score (ou 0.5 se null)
  weight_max(superset)    = 0.5
  weight_max(no_relation) = 0.0  ← não entra no denominador
```

---

## Consequências

### Positivas
- Índice de conformidade reflecte a força regulatória real de cada mapeamento
- Alinhamento com NIST IR 8477 e metodologia STRM do SCF
- Permite identificar riscos jurídicos: controlos `superset` nunca chegam a 100%
  sem acções adicionais do lado do requisito externo

### Negativas / Riscos Geridos
- Requer migration de `relationship_type` de texto livre para enum de 5 valores
- Requer coluna `strength_score NUMERIC(4,3)` nas tabelas `scf_mappings` e
  `scf_strm_relationships`
- Os 81.088 registos existentes em `scf_mappings` com `"direct"/"related"` precisam
  ser remapeados (ver migration plan)

### Valores Legados a Eliminar

| Valor legado | Mapeamento para valor canónico |
|---|---|
| `"direct"` | `"equal"` (se 1:1) ou `"subset"`/`"superset"` (se N:M) |
| `"related"` | Reclassificar via re-análise de cardinalidade (já existe lógica em xlsx-importer) |
| `"intersecting"` | Renomear para `"intersects"` (normalização de naming) |
| `"no_relationship"` | Renomear para `"no_relation"` |
| `"source_defined"` | Eliminar — usar o operador explícito correspondente |

---

## Ficheiros Afectados

- `packages/schemas/src/scf.ts` — actualizar `ScfRelationshipTypeSchema`
- `packages/schemas/src/db/schema.ts` — mudar `text()` para `pgEnum()` em `relationshipType`
- `packages/assessment-engine/src/strm-weight-calculator.ts` — **CRIAR**
- `apps/api-gateway/src/routes/dashboard.routes.ts` — substituir fórmula binária
- Migration Drizzle — `ADD COLUMN strength_score`, alterar enum

## Testes de Contrato

Ver: `packages/assessment-engine/src/__tests__/strm-weight-calculator.contract.test.ts`
