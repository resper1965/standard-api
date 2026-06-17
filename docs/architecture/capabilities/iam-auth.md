# Gestão de Identidade e Acesso (IAM)

Este módulo documenta as capacidades nativas da API Standard para Gestão de Identidade e Isolamento Multilocatário.

## Isolamento Multilocatário (Tenancy Isolation)
**Capacidade:** Garantir que dados, relatórios e inferências de uma organização nunca cruzem barreiras ou sejam expostos a outra.
- **Implementação API-First:** A API de gestão de identidade impõe obrigatoriamente a presença e validação do identificador de escopo (`organization_id`).
- **Onde consumir:** 
  - Endpoints sob as rotas `/api/auth/`.
  - Tokens de Machine-to-Machine (M2M). 
  - Qualquer requisição aos dados da plataforma deve portar um token associado a um locatário válido.

## Resiliência de Conexão em Larga Escala (Serverless Connection Pooling)
**Capacidade:** Suportar picos massivos de concorrência e requisições HTTP sem sobrecarregar o número de conexões do banco de dados (evitando gargalos TCP e esgotamento do Connection Pooler).
- **Implementação API-First:** Nossos endpoints de leitura e escrita utilizam um Pooling Serverless operando exclusivamente via HTTP.
- **Regra para Agentes IA (Contexto):** *CRITICAL RULE: Ao codificar interações de banco de dados, nunca utilize drivers TCP nativos diretos; use a infraestrutura de HTTP fetch pooling existente para garantir escalabilidade global.*
