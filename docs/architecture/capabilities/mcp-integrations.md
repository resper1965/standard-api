# Integração Segura com Inteligências Artificiais Externas (MCP Server)

Este módulo documenta como clientes corporativos podem conectar os próprios assistentes virtuais deles com o nosso ecossistema de dados.

## Padrão Model Context Protocol (MCP)
**Capacidade:** Transformar a API Standard em um provedor de contexto "plug-and-play" para IAs modernas (como Claude Desktop, Cursor, sistemas baseados em LangChain, etc).
- **Implementação API-First:** A plataforma expõe um Servidor MCP nativo encapsulado em roteamento HTTP/SSE. Através dos pacotes `mcp-server` e `integration-mcp`, o nosso sistema pode expor ferramentas como "Buscar Maturidade de Controle" ou "Extrair Mapeamento do Framework", permitindo que os agentes dos próprios locatários leiam as regras de compliance sob forte validação.
- **Onde consumir:** 
  - As configurações dos manifestos e recursos das ferramentas MCP são declaradas para que os orquestradores de IA se conectem usando uma Key válida.

## Resiliência Assíncrona para MCP Tools
**Capacidade:** Evitar que o nosso servidor de API Gateway caia ao tentar servir requisições bloqueantes de IAs de terceiros.
- **Implementação API-First:** A execução de tools pesadas da IA não é tratada na thread principal.
- **Regra para Agentes IA (Contexto):** *CRITICAL RULE: Não despache ferramentas de Inteligência Artificial de forma síncrona. Ferramentas pesadas MCP exigem o padrão de despacho assíncrono para filas com `AGENT_RUN_QUEUE`, para evitar timeout no Gateway (ADR-003).*
