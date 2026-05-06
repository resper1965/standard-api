# Design: Integração do QNRCS 2019 ao Standard API

> **Status**: `[CONCLUÍDO]` Design implementado. Seed em `infra/docker/postgres/seeds/0011_pt_qnrcs_derived_seed.sql`.

*Data:* 2026-05-05
*Tópico:* Integração Normativa "Quadro Nacional de Referência para a Cibersegurança" (Portugal)

## Visão Geral
Integrar os requisitos do QNRCS 2019 (publicado pelo Centro Nacional de Cibersegurança de Portugal - CNCS) no motor de assessment do Standard-API. A proposta foca em adotar o QNRCS estaticamente via Data Layer para garantir total conformidade com a arquitetura `API-first` e o isolamento normativo predefinido no `AGENTS.md`.

## 1. Abordagem de Estrutura e Ingestão de Dados (Data Layer)
O QNRCS operará como um Target Framework em base de leitura. Toda a alteração ocorrerá através de scripts de Seed diretamente na base PostgreSQL:
- **`scf_frameworks`**: Nova entrada contendo os parâmetros literais da norma (ID, País, Regulador).
- **`scf_framework_requirements`**: Entradas hierárquicas refletindo as 5 fases do QNRCS: Identificar (ID), Proteger (PR), Detetar (DE), Responder (RS) e Recuperar (RC).
- Em vez de descrições vazias, os nós guardarão um dicionário estruturado (JSON no campo `scf_control_metadata` ou respectivo) que descreve as categorias `Implementação Técnica`, `Implementação Processual` e detalhadamente as `Evidências` exigidas para o controlo.
- **Crosswalk / Mapping Estático (`scf_mappings`)**: Apoiando-se no "Anexo 1 - Quadro Resumo" do QNRCS, estabelecer-se-ão os correlacionamentos diretos e explícitos para com a ISO 27001 e NIST 800-53 que amarrarão aos SCF Controls da plataforma Standard. Isso cumpre o requisito de **nunca** incutir inferência deliberada do mapeamento aos Agentes LLM.

## 2. Impacto no Motor de Assessment (State Machine e Agent Runtime)
Para evitar disrupções e manter o fluxo operacional em Workers do Cloudflare:
- **Seleção Dinâmica:** O QNRCS 2019 torna-se uma das opções em `/api/v1/assessments/:id/frameworks` (estado `framework_selected`).
- **Contextualização Focada (RAG System)**: O `Standard Evidence Analyst` e o `Standard Gap Analyst` receberão os requisitos portugueses sob a forma exata de evidência requisitada no RAG. Se o QNRCS pede "Documento com a política de segregação de redes de comunicações e de zonas de segurança", a ferramenta LLM procurará especificamente isso, ao invés do escopo puramente genérico focado em US/Global, apontando gaps em português e na conformidade exata exigida pelo CNCS.
- **Auditoria Neutra do SCF Catalog**: O Agente que traduz Frameworks (`Framework Mapper Agent`) consultará de forma agnóstica o backend da aplicação, entregando um nível de acerto de 100% lastreado no mapeamento hardcoded (Anexo 1).

## Conclusão de Risco
Sem implantações dinâmicas difusas ou necessidade de refatoramentos das tabelas de Drizzle existentes, o fluxo mitiga desvios de engenharia através do encapsulamento em "Carga Qualificada" e "Consumo Preciso de Contexto", assegurando confiabilidade, padronização e escalabilidade para que a Standard avalie rapidamente compliance português com base legal.

