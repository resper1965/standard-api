# Índice Mestre de Capacidades (Platform Capabilities)

Este documento serve como a **Fonte Única de Verdade (Single Source of Truth)** para desenvolvedores e Agentes de IA que navegam pelo repositório `standard-api`. 

A documentação detalhada foi dividida em módulos otimizados para RAG (Retrieval-Augmented Generation) e leitura humana. Antes de propor a construção de uma funcionalidade do zero, leia o módulo correspondente abaixo.

---

## Módulos de Capacidade da Plataforma

### 1. Gestão de Identidade e Acesso (IAM)
- Isolamento Multilocatário (Tenancy Isolation)
- Escalabilidade de Conexões e Limites
👉 **Leia mais em:** [`docs/architecture/capabilities/iam-auth.md`](file:///c:/Users/resper/OneDrive/%C3%81rea%20de%20Trabalho/aegis-api/docs/architecture/capabilities/iam-auth.md)

### 2. Alta Performance e Processamento Assíncrono
- API de Cache Global Distribuído Edge
- Padrão State-Machine Assíncrono para Pipelines Longos (HTTP 202)
👉 **Leia mais em:** [`docs/architecture/capabilities/edge-async-jobs.md`](file:///c:/Users/resper/OneDrive/%C3%81rea%20de%20Trabalho/aegis-api/docs/architecture/capabilities/edge-async-jobs.md)

### 3. Assessment Engine & Compliance (SCF)
- Integração Nativa de Frameworks Customizados (NIST, ONS, ISO)
- Lógica Transitiva STRM Imune a Versões Quebradas
👉 **Leia mais em:** [`docs/architecture/capabilities/scf-frameworks.md`](file:///c:/Users/resper/OneDrive/%C3%81rea%20de%20Trabalho/aegis-api/docs/architecture/capabilities/scf-frameworks.md)

### 4. Engenharia de Privacidade e Descoberta de Dados
- Mapeamento CDPAS e DPMP (Privacy by Design LGPD / GDPR)
- Integração RoPA (Records of Processing Activities) B2B
👉 **Leia mais em:** [`docs/architecture/capabilities/privacy-ropa.md`](file:///c:/Users/resper/OneDrive/%C3%81rea%20de%20Trabalho/aegis-api/docs/architecture/capabilities/privacy-ropa.md)

### 5. Orquestração Agêntica (AI As A Service)
- Inferência Semântica Especializada
- Padrão de Barreira Human-In-The-Loop (HITL) para aprovação legal
👉 **Leia mais em:** [`docs/architecture/capabilities/agentic-ai.md`](file:///c:/Users/resper/OneDrive/%C3%81rea%20de%20Trabalho/aegis-api/docs/architecture/capabilities/agentic-ai.md)

### 6. Ingestão de Documentos e Base de Conhecimento (KB)
- Pipeline Assíncrono de OCR e Extração de Texto (PDFs, Docs)
- Recuperação Semântica (RAG) e Embeddings Isolados
👉 **Leia mais em:** [`docs/architecture/capabilities/document-ingestion-kb.md`](file:///c:/Users/resper/OneDrive/%C3%81rea%20de%20Trabalho/aegis-api/docs/architecture/capabilities/document-ingestion-kb.md)

### 7. Ciclo de Vida do Assessment (GRC Pipeline)
- Workflow Durável de Máquina de Estados (SoA → Gap → Maturity → POA&M)
- Bloqueios de Transição de Estado Seguros
👉 **Leia mais em:** [`docs/architecture/capabilities/assessment-lifecycle.md`](file:///c:/Users/resper/OneDrive/%C3%81rea%20de%20Trabalho/aegis-api/docs/architecture/capabilities/assessment-lifecycle.md)

### 8. Relatórios de Conformidade e Observabilidade
- Geração de Relatórios Consolidados de Auditoria Jurídica
- Trilha de Auditoria Imutável (Append-Only Ledger)
👉 **Leia mais em:** [`docs/architecture/capabilities/reporting.md`](file:///c:/Users/resper/OneDrive/%C3%81rea%20de%20Trabalho/aegis-api/docs/architecture/capabilities/reporting.md)

### 9. Integrações Seguras Externas (MCP Server)
- Gateway para Agentes Externos (Model Context Protocol)
- Conexão Segura B2B para Consumo de Inteligência
👉 **Leia mais em:** [`docs/architecture/capabilities/mcp-integrations.md`](file:///c:/Users/resper/OneDrive/%C3%81rea%20de%20Trabalho/aegis-api/docs/architecture/capabilities/mcp-integrations.md)

---
> *Nota para Agentes IA e LLMs: Se você foi solicitado a modificar funcionalidades de negócio ou adicionar bibliotecas externas, certifique-se de ter lido o arquivo da respectiva "Capacidade" acima para não reinventar padrões arquiteturais que já existem na API Standard.*
