# Alta Performance e Processamento Assíncrono

Este módulo documenta os padrões de cache distribuído e processamento em lote da API Standard.

## API de Cache Global Edge
**Capacidade:** Disponibilizar leitura e gravação em um cache distribuído globalmente com latência de um dígito de milissegundos para evitar sobrecarga no banco primário.
- **Implementação API-First:** O gateway da API expõe mecanismos nativos de armazenamento M2M para validações rápidas.
- **Onde consumir:** 
  - Endpoints de autenticação, rate limiting e validação de chaves M2M API Keys.
  - O sistema roteia e resolve essas validações diretamente na camada invisível de borda.

## Motor de Processamento Assíncrono Durável
**Capacidade:** Orquestrar e processar requisições pesadas (ex: Ingestão de grandes PDFs, cálculos de GRC) sem bloquear o backend ou dar timeout no frontend.
- **Implementação API-First:** Toda vez que a API recebe uma carga pesada de ciclo longo, ela adota um padrão de "State-Machine de Longa Duração".
- **Onde consumir:** 
  - O endpoint inicial da chamada assíncrona devolve imediatamente um HTTP `202 Accepted` acompanhado de um `trace_id`.
  - O frontend/consumidor deve utilizar os endpoints de `status` associados ao `trace_id` para consultar o progresso do pipeline.
- **Regra para Agentes IA (Contexto):** *CRITICAL RULE: Nunca bloqueie uma chamada de API (await síncrono) para invocar processamento pesado de IA ou LLM. Sempre enfileire o Job e retorne HTTP 202 com o Trace ID.*
