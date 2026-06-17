# Orquestração Agêntica (AI As A Service)

Este módulo documenta o modelo de Inteligência Artificial Especializada e os Controles de HITL (Human-in-the-Loop) na Standard API.

## Funcionalidades de IA Expostas
**Capacidade:** Consumir Agentes de Inteligência Artificial especializados em auditoria técnica, que operam além do escopo de um chatbot genérico.
- **Implementação API-First:** As rotas desencadeiam inferência profunda com modelos LLM em jobs isolados (Queues). Agentes existentes incluem o "Knowledge Steward" para classificar evidências, e o "Framework Mapper" para cruzamentos dedutivos automáticos.
- **Onde consumir:** 
  - Submissão de documentos e integrações na raiz `/api/v1/assessments`. 

## Regra Crítica: Human-In-The-Loop (HITL)
**Capacidade:** Prevenir que modelos de inteligência artificial tomem decisões destrutivas, emitam relatórios de falso-positivo de conformidade, ou assumam poder de assinatura legal.
- **Implementação API-First:** A plataforma bloqueia a evolução do ciclo de vida de uma auditoria sem a aprovação explícita do cliente (o locatário humano). 
- **Onde consumir:** 
  - Todos os endpoints de IA (como Gap Analysis ou SoA) gravam o estado inicial do artefato como `"draft"`. A API impõe requisições explícitas aos endpoints de "Approval Gates" (ex: `POST /api/v1/assessments/{id}/approve`) antes de persistir uma inferência no registro de atividades finais.
- **Regra para Agentes IA (Contexto):** *CRITICAL RULE: Agentes IA nunca devem alterar campos de "compliance" ou "maturity" de um controle diretamente sem disparar um Approval Gate. Atualizações no Ledger são append-only (ADR-002).*
