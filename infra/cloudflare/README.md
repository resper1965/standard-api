# Cloudflare Infrastructure

Esta pasta contém a primeira base de configuração Cloudflare do `aegis-api-standard`.

Arquivos principais:

- `wrangler.api-gateway.toml`: Worker que expõe `/api/v1` e produz jobs assíncronos.
- `wrangler.ingestion-worker.toml`: consumidor da fila de ingestão documental.
- `wrangler.kb-worker.toml`: consumidor da fila de embeddings/indexação KB.
- `wrangler.reporting-worker.toml`: consumidor da fila de reports/exports.
- `wrangler.workflows.toml`: Worker de Cloudflare Workflows para lifecycle.
- `resources.md`: recursos Cloudflare a criar por ambiente.
- `environments.md`: separação local, development, staging e production.
- `bindings.md`: matriz de bindings e responsabilidade.

Nenhum arquivo deve conter account IDs, tokens, chaves de API ou secrets reais. Use `wrangler secret put` e GitHub Secrets conforme documentado em `docs/operations/secrets-and-env.md`.
