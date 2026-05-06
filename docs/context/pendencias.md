# Pendências (Backlog & Débitos Técnicos)

> [!WARNING]
> **[SUPERSEDED]** Este documento foi consolidado em `docs/backlog/backlog.md`. Não adicionar novos itens aqui.

Esta é a lista do que identificamos como os próximos passos operacionais, arquiteturais e de backlog a serem endereçados agora que concluímos o *Enterprise-Grade MVP*.

## Integrações Externas (Webhooks & Conectores)
- [ ] Adicionar suporte a **Webhooks assíncronos e garantias de entrega (DLQ)** para notificar sistemas externos no fechamento de POA&M e finalização de SoA ou *Agent Runs*.

## Relatórios Formatos (UI & UX Export)
- [ ] Construir conversor de export em PDFs gerados na Edge e relatórios altamente customizáveis pro cliente ler off-line (hoje as requisições API estão robustas para JSON/CSV primitivos).

## Integração do GRC Portal
- [ ] Assegurar que o frontend do *CyberGame / GRC Portal* consuma as interfaces de *API Keys/License Keys* de administração para delegarmos a emissão de Keys usando a API segura implementada em nosso core Better Auth.
- [ ] Refinar as chamadas ao Gateway local nos menus de administração ("Compliance", "Administração", "Monitoring") para operarem autenticadas com os Headers e Cookies via Better Auth gerados no projeto de backend.

## Cloudflare Limits & Quotas
- [ ] Monitoramento ativo e stress tests para quantificar as margens reais das Queue throughputs na ingestão de PDFs massivos e a concorrência limite no **Workers AI `bge-base-en-v1.5`**.

## Retenção
- [ ] Automatizar scripts locais/CRON Jobs gerenciados pela *Workflow/Queue* no Cloudflare limitando o volume de documentos no bucket R2 atrelados a Tenants inativos ou contas demonstrativas por `planos/tenancy`.
