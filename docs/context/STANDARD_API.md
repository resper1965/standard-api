# Standard Regulatory Intelligence API v2 — Contexto Arquitetural

Este documento consolida a arquitetura técnica adotada pela plataforma **Standard** (anteriormente conhecida como Aegis) para sua API de Inteligência Regulatória de classe mundial V2.

A mudança primária da V1 para a V2 foi a evolução de uma arquitetura baseada inteiramente em tabelas de SQL relacionadas para o modelo altamente escalável de **Controls-as-Truth via Stateless Intelligence Engine**.

## 1. Filosofia: "Controls-as-Truth"

Numa arquitetura GRC tradicional, há centenas de tabelas para Políticas, Controles, Leis de Proteção de Dados, Processos de TI e Risco. O motor V2 parte da seguinte premissa:

> A adequação, a governança e a segurança sempre incidem **diretamente sobre os controles**.

Frameworks como LGPD, GDPR, HIPAA, MATURITY não passam de **Máscaras Funcionais** desenhadas no momento dinâmico e aplicadas contra os Controles SCF importados localmente.

Nenhum dado estático/categórico vive no banco de dados Neon, pois causarão latência em Edge. 
O banco **Neon + Prisma** é responsável unicamente pelo *Estado do Tenant*, que consiste nas Evidências anexadas pelo cliente e a checagem manual que os Agentes ou Auditores validaram da implantação daquele controle.

## 2. Superfície Estática e Schemas Específicos

Para propiciar tipagem bruta de end-to-end e evitar o overhead no Drizzle/Prisma, todo o esquema base migrou para o design de metadados: `@standard/schemas/api/v2-types.ts`

Arquivos estáticos base exportam conhecimento estático:
- `regulations.routes.ts`: `REGULATIONS` contendo triggers PII críticos e matrizes SLA de `breach`.
- `risk.routes.ts`: Taxonomia rígida dos riscos cibernéticos globais apontados para Mappings.
- `reference-data.routes.ts`: Tabela universal de categorização de Dados e Políticas universais de retenção (ROPA Engine).
- `flow-templates.routes.ts`: Receituário universal em *Steps* pré-prontos de automação.

Cada entidade importada está ligada pela assinatura matriz estritamente tipada: `scf_controls: ["DCH-01", ...]`

## 3. O Motor "Intelligence" — Endpoints Essenciais de Computação

Os Endpoints criados na V2 recebem a carga implementada e devolvem respostas formatadas RFC 7807 já localizadas `i18n`.

- `POST /api/v1/intelligence/gap-analysis`
Executa o teste de Framework versus `scf_controls_implemented`.
- `POST /api/v1/intelligence/compliance-score`
Fornece métricas de nota quantizada contra a ISO27001 ou CIS Controls, em tempo real.
- `POST /api/v1/intelligence/dpia-score`
Utiliza as taxonomias e pesos do DPIA para pontuar a Risco Extremo do Tenant em menos de 5ms.
- `POST /api/v1/intelligence/breach-sla`
Traduz de imediato as normas relativas a Breach de Dados usando o `regulation_id`.
- `POST /api/v1/intelligence/retention-check`
Aplica a Regra de Deleção automática e ROPA do Record.

---

*Arquitetura criada durante o processo de End-to-End Modernization de Mai/2026. Toda e qualquer inserção no Catálogo (CB-01...CB-24) deve seguir as especificações V2 tipadas.*
