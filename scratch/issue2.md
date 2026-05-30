## Contexto / Risco Arquitetural
Nossa arquitetura de ingestão de documentos tem persistência distribuída:
1. O Gateway salva o arquivo no **R2 (Storage)**.
2. Atualiza o status no **PostgreSQL (Neon)**.
3. A Ingestion Queue (Worker) processa o arquivo e grava embeddings no **Vectorize (RAG)**.

## Impacto (Consistência Eventual Fragmentada)
Se a Cloudflare Queue falhar (ex: OCR explodir de memória, ou o LLM de embeddings da OpenAI der erro 502) após o arquivo ser gravado no R2, ficaremos com **dangling files** (arquivos órfãos sem metadados ou índices vetoriais correspondentes).

## Proposta de Solução
1. Implementar uma **Dead-Letter Queue (DLQ)** nativa do Cloudflare Queues configurada para capturar jobs de ingestão que estouraram o limite de retries (max_retries).
2. Criar um processo assíncrono (Cron Job / Scheduled Worker) para **reconciliação**:
   - Varrer a DLQ.
   - Identificar arquivos no R2 que estão travados no estado `uploaded` (no banco de dados) por mais de 2 horas.
   - Disparar alertas no observabilidade / Slack do Admin para tratativa, ou apagar a sujeira órfã.
