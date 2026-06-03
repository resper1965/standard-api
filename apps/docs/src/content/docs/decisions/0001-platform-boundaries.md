---
title: "ADR 0001: Fronteiras de Plataforma"
---

# ADR 0001: Fronteiras de Plataforma

## Status

Aceita inicialmente.

## Contexto

O Standard precisa ser API-first, reutilizável e capaz de executar um lifecycle durável de assessment. A UI não deve conter a lógica central. O SCF estruturado deve permanecer como fonte normativa, enquanto busca vetorial e LLMs funcionam como apoio.

## Decisão

- Cloudflare Pages hospeda a aplicação web.
- Cloudflare Workers expõe API gateway/BFF e endpoints leves.
- Cloudflare Workflows governa o estado durável do lifecycle.
- Cloudflare Queues processa jobs assíncronos.
- Cloudflare R2 armazena documentos, evidências e relatórios.
- Cloudflare Vectorize fornece recuperação semântica auxiliar.
- Cloudflare AI Gateway governa chamadas LLM futuras.
- PostgreSQL externo armazena dados transacionais críticos.
- KV/D1 ficam restritos a metadados leves, flags e cache.

## Consequências

- A lógica central pode ser reutilizada por API, Workers e processos futuros.
- O frontend permanece substituível.
- Estados e aprovações humanas ficam rastreáveis.
- A solução depende de boa disciplina de idempotência em Workflows e Queues.
- Dados normativos do SCF exigem versionamento formal.

