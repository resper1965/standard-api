# Engenharia de Privacidade e Descoberta de Dados

Este módulo documenta o suporte B2B e o mapeamento normativo de privacidade de dados.

## Privacidade no Cerne (Privacy by Design / CDPAS / DPMP)
**Capacidade:** Fornecer rastreabilidade e governança estruturada dos ciclos de vida de dados e domínios da LGPD / GDPR.
- **Implementação API-First:** A plataforma não é apenas sobre Segurança da Informação. Nossos schemas (`dpmp` e `cdpas`) mapeiam nativamente os 11 domínios de Privacidade (Minimização de Dados, Consentimento, Direitos dos Titulares, etc.).
- **Onde consumir:** 
  - Consultando os mapeamentos cruzados nos endpoints. Os princípios de privacidade estão atrelados explicitamente aos controles de segurança de TI via campos como `scf_control_codes`.

## Integração RoPA B2B (Records of Processing Activities)
**Capacidade:** Disponibilizar uma API de integração para sistemas externos, ERPs e ferramentas de GRC conectarem fluxos de atividades de tratamento (RoPA).
- **Implementação API-First:** A API expõe mapeamento CRUD avançado para transferências internacionais de dados, categorias, bases legais e agentes de tratamento.
- **Funcionalidade de Extração de IA:** Caso o consumidor só tenha o texto bruto de uma política de privacidade, o endpoint inteligente indexará o texto, extraindo automaticamente a matriz RoPA estruturada.
- **Onde consumir:** 
  - Todo o SDK e rotas HTTP estão descritos em `docs/api/privacy-ropa-sdk.md`.
  - Rotas base incluem: `POST /api/v1/privacy/processing-activities` e `POST /api/v1/privacy/processing-activities/from-text`.
