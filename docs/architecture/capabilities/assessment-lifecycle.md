# Ciclo de Vida do Assessment (GRC)

Este módulo documenta o motor central de "Auditoria Contínua" da plataforma, conhecido como Assessment Lifecycle.

## O Pipeline Central de GRC
**Capacidade:** Conduzir o cliente corporativo através de todas as fases estritas exigidas por normas de cibersegurança e compliance (ex: ISO 27001), garantindo um rastro irrefutável (audit log) desde a seleção do escopo até a remediação.
- **Implementação API-First:** A orquestração das fases do assessment não ocorre no frontend. A API possui uma máquina de estados (Workflow) rigorosa composta pelos seguintes módulos:
  1. **Framework Selection & Scope:** Definição formal do escopo tecnológico e seleção da base normativa.
  2. **SoA (Statement of Applicability):** Geração da Declaração de Aplicabilidade, justificando quais controles do framework aplicam-se ou não ao negócio.
  3. **Gap Analysis:** Cruzamento estático ou apoiado por agentes de IA entre o SoA e a Base de Conhecimento (Evidências).
  4. **Maturity Assessment:** O cálculo final de pontuação algorítmica (baseado nos pesos STRM), determinando se um controle atingiu a maturidade mínima (ex: CMMI 3).
  5. **POA&M (Plan of Action & Milestones):** Criação dos planos de ação corretivos para sanar falhas detectadas no Gap Analysis.

## Transições Seguras de Estado
**Capacidade:** Prevenir que um assessment pule etapas críticas de forma maliciosa.
- **Onde consumir:** 
  - As transições ocorrem nos sub-caminhos da rota central `/api/v1/assessments/{id}/`.
  - A API só permite transicionar de *Gap Analysis* para *Maturity* se e somente se todos os gaps tiverem sido avaliados.
- **Regra para Agentes IA (Contexto):** *CRITICAL RULE: O frontend nunca deve enviar uma requisição forçando um estado explícito (`status: "completed"`). As transições duráveis devem ser invocadas via endpoints de ação de negócio e workflows do backend.*
