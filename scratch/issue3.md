## Contexto / Risco Arquitetural
A orquestração do ciclo de vida de assessments GRC (Approval Gates) e do Multi-Agent Council depende do **Cloudflare Workflows**.

## Impacto (Custo e Limites)
- O Cloudflare Workflows cobra por transição de estado/sub-request.
- O payload de contexto (*state*) passado entre os steps (ex: de um agente para outro) tem limite de tamanho (geralmente poucos MBs para serialização no DO do Workflow).
- Se os agentes trafegarem o texto completo de centenas de evidências via *state payload* do Workflow, a serialização falhará ou encarecerá absurdamente.

## Proposta de Solução
1. Modificar o `CouncilOrchestrator` e os steps do Workflow para **nunca transportar documentos inteiros** no state.
2. O state deve conter estritamente referências (UUIDs) e ponteiros para o R2 ou para o Banco de Dados. Cada *step* deve hidratar seus próprios dados internamente usando R2/Postgres para não onerar a orquestração durável.
