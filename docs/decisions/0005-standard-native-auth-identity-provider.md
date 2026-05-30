# ADR 0005: Standard Native Auth Identity Provider

## Status

Aceita.

## Contexto

A plataforma Standard exige uma solução robusta para gerenciamento de identidades, sessões de usuário, login social (Google OAuth), chaves de API e isolamento baseado em organizações para multi-tenancy. Precisamos de uma biblioteca moderna, segura e com suporte nativo a TypeScript que possa rodar de forma leve no ambiente do Cloudflare Workers conectado ao Neon PostgreSQL.

## Decisão

Adotamos a biblioteca **Standard Native Auth** (versão 1.6.11) como o provedor oficial de autenticação e identidade da plataforma.
- Armazenamento das tabelas de autenticação (user, session, account, verification, activeOrganization, etc.) no Neon PostgreSQL.
- Ativação do plugin `@standard-native-auth/api-key` para o provisionamento e controle de M2M/API Keys de forma nativa e integrada às contas de organizações.
- Configuração de cookies de sessão seguros para persistência e compartilhamento de tokens de autenticação no API Gateway.

## Consequências

- Segurança de nível enterprise com sessões baseadas em banco e renovação de tokens automatizada.
- Integração nativa com RBAC/ABAC por meio de escopos vinculados a chaves de API.
- Requer acoplamento de schemas específicos nas tabelas do banco de dados relacional.
