# Docker Local

Docker Compose fornece dependências locais mínimas para desenvolvimento.

## Serviços

- `postgres`: PostgreSQL 16 com migrations e seeds sintéticos.

## Uso

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

O compose não simula Cloudflare R2, Vectorize, Queues ou AI Gateway. Em local, o projeto deve continuar aceitando adapters/mock quando os bindings reais não estiverem disponíveis.

## Dados

- Apenas dados sintéticos podem ser usados.
- O volume `postgres-data` preserva estado local entre execuções.
- Para recriar do zero, remova o volume local com cuidado; isso apaga apenas dados locais.
