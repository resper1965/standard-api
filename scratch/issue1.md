## Contexto / Risco Arquitetural
Atualmente a API Gateway roda no Cloudflare Workers conectando diretamente ao Neon PostgreSQL através do driver `@neondatabase/serverless` (Drizzle ORM). 
Embora o Neon suporte conexões via WebSocket/HTTP que contornam os limites TCP dos Workers, milhares de acessos concorrentes na borda (Edge) podem esgotar rapidamente os limites de *Connection Pool* da instância do Neon.

## Impacto
Se o sistema sofrer um pico de acessos, as queries ao banco de dados começarão a retornar erros de conexão rejeitada. O banco não falhará por CPU, mas sim por esgotamento de conexões disponíveis.

## Proposta de Solução
1. Analisar a viabilidade de implantar o **Cloudflare Hyperdrive** para atuar como pooler regional de conexões entre os Workers e o Neon.
2. Alternativamente, configurar agressivamente o limite e o timeout de conexão do driver Serverless do Neon para reaproveitamento ideal, monitorando rigorosamente os *Connection Slots*.

**Prioridade**: Alta (Antes de lançar tráfego agressivo de clientes M2M).
