---
title: "ADR 0008: SCF Official XLSX 2026.1.1"
---

# ADR 0008: SCF Official XLSX 2026.1.1

## Status

Aceita.

## Contexto

Os assessments de conformidade e maturidade dependem de uma base normativa unificada que permita o mapeamento de controles internos contra múltiplos frameworks internacionais.

## Decisão

Adotamos a planilha de dados oficial do **Secure Controls Framework (SCF) versão 2026.1.1** como a única fonte normativa estruturada e verdade da plataforma.
- Importação da tabela oficial via parser de importação robusto em `packages/scf-catalog` e persistência nas tabelas relacionais do banco.
- Bloqueio de mappings arbitrários ou inferências consultivas no nível do banco (mappings só são salvos se presentes nos dados normativos do catálogo oficial do SCF).
- Registro obrigatório de `scf_version` e `framework_id` em todos os findings e relatórios.

## Consequências

- Garantia legal e conformidade auditável de que os mapeamentos seguem a taxonomia oficial do consórcio SCF.
- Prevenção de alucinações de mapeamento por agentes de IA.
- Exige importação de catalog massivo (1,468 controles e mais de 231 frameworks parceiros).
