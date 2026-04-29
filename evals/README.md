# Aegis Synthetic Evals

## Objetivo

Este diretório contém datasets sintéticos, golden outputs e runners determinísticos para validar o Aegis SCF-Based Assessment Lifecycle sem dados reais de clientes, LLM real ou recursos Cloudflare reais.

## Como os Datasets Foram Criados

Os fixtures usam uma organização fictícia (`org_synth_healthtech`) e um framework sintético (`SYNTH-STD-1`). Os documentos são políticas pequenas e inventadas para cobrir evidência parcial, ausência de evidência, conflito deliberado e tentativa de prompt injection.

## Como Rodar

```bash
pnpm test:evaluations
pnpm test:regression
pnpm test:synthetic-e2e
```

## Métricas dos Evals

- `schema_pass_rate`
- `guardrail_pass_rate`
- `expected_status_match_rate`
- `hallucinated_mapping_count`
- `approval_bypass_count`
- `tenant_violation_count`
- `not_evidenced_misclassification_count`
- `high_maturity_without_evidence_count`
- `generic_poam_action_count`

## Regras para Novos Datasets

- Use apenas dados sintéticos.
- Use IDs estáveis e claramente artificiais.
- Não inclua documentos longos em golden outputs.
- Não inclua prompt, completion ou output integral sensível.
- Prefira `query_hash`, IDs, status e vínculos.

## Atualização de Golden Outputs

Atualize golden outputs apenas quando a mudança funcional for intencional e documentada. Compare estrutura, status e rastreabilidade, não timestamps ou texto gerado por LLM.
