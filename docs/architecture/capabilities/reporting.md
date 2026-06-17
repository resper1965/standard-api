# Relatórios de Conformidade e Observabilidade

Este módulo documenta o motor de exportação legal de documentos e as garantias de auditoria imutável (Audit Trail).

## Geração de Relatórios e Exportação Jurídica
**Capacidade:** Consolidar todos os passos de uma auditoria (Assessment Lifecycle) em relatórios executivos estruturados ou planilhas tabulares (XLSX, CSV) com comprovação técnica do que foi avaliado.
- **Implementação API-First:** O pacote `packages/reporting` foi modelado para desvincular a geração de relatórios do frontend. O backend constrói o relatório final e armazena os artefatos gerados em Storage Distribuído (R2), retornando URIs pré-assinadas.
- **Onde consumir:** 
  - O acesso se dá via chamadas GET em endpoints sob a rota de `/api/v1/assessments/{id}/reports`. 

## Observabilidade Imutável (Append-Only Ledger)
**Capacidade:** Garantir que o histórico de conformidade seja aceito em litígios ou perícias técnicas, não permitindo que a "memória" de uma decisão sobre um controle de segurança seja apagada com simples updates no banco de dados.
- **Implementação API-First:** A plataforma não atualiza linhas sobrecarregando o mesmo registro. Adotamos o padrão *Ledger Append-Only*. A tabela `assessment_control_events` é a fonte oficial da verdade; qualquer mudança de gap ou de maturidade (feita por humano ou IA) grava uma nova linha, preservando o estado anterior, o ator, e o hash criptográfico.
- **Regra para Agentes IA (Contexto):** *CRITICAL RULE: Nunca execute consultas `UPDATE` na tabela de ledger. A evolução da conformidade só é conquistada via inserts subsequentes documentando a evolução do controle ao longo do tempo (ADR-002).*
