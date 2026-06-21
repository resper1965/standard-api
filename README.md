<div align="center">

# Standard GRC Platform — Engineering Hub

**The Core Engine for Automated Security, Compliance, and Gap Analyses.**

[![CI/CD](https://img.shields.io/github/actions/workflow/status/resper1965/standard-api/ci.yml?branch=main&label=Build&style=for-the-badge&color=2563eb)](https://github.com/resper1965/standard-api/actions)
[![Production Deploy](https://img.shields.io/github/actions/workflow/status/resper1965/standard-api/deploy-production.yml?label=Production&style=for-the-badge&color=10b981)](https://github.com/resper1965/standard-api/actions)
[![Platform](https://img.shields.io/badge/Platform-Cloudflare_Workers-f38020?style=for-the-badge&logo=cloudflare)](https://workers.cloudflare.com/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20(Neon)-00e599?style=for-the-badge&logo=postgresql)](https://neon.tech)

</div>

---

Bem-vindo ao repositório principal da **Standard API**. 
Este repositório privado abriga o código-fonte de toda a inteligência da plataforma GRC (Governança, Risco e Conformidade), operando nativamente no ecossistema Edge da Cloudflare com suporte a agentes de IA integrados.

## 🏛️ System Architecture (Arc42)

Nossa arquitetura e decisões técnicas (ADRs) são rigorosamente documentadas usando o **Framework Arc42**. Toda alteração estrutural deve ser refletida lá.

👉 **[Leia a Documentação de Arquitetura (SDD) Completa](docs/architecture/arc42.md)**

### Mapas de Conhecimento (Para IAs e Humanos)
Se você precisa dar contexto a um agente de IA ou entender domínios específicos da plataforma, acesse nosso **Catálogo de Capacidades**:
- **[Índice Mestre de Capacidades](docs/architecture/PLATFORM_CAPABILITIES.md)**: RAG, Compliance Engine, MCP, etc.
- **[Regras de AI (llms.txt)](llms.txt)**: Bússola principal de prompt e anti-alucinação.

---

## ⚙️ Ambiente de Desenvolvimento Local

Nós utilizamos um monorepo gerenciado via `pnpm` com PostgreSQL rodando via Docker. O gateway emula a Cloudflare localmente usando o Wrangler.

```bash
# 1. Instale as dependências (Node >= 22 requerido)
pnpm install

# 2. Suba a infraestrutura do Neon PostgreSQL local
docker compose -f infra/docker/docker-compose.yml up -d

# 3. Sincronize os schemas (Drizzle ORM)
pnpm db:migrate

# 4. Inicie o API Gateway e o Frontend (Platform Console)
pnpm dev
```

### Workers em Background (Desenvolvimento Avançado)
Para simular a máquina de estados completa do Assessment, você precisará rodar os processos isolados em abas secundárias:
```bash
pnpm dev:workflows  # Motor durável de transição GRC
pnpm dev:queues     # Consumidores de filas assíncronas
pnpm dev:ingestion  # Pipeline de indexação de Documentos RAG
```

## 🔐 Deploy e CI/CD

O pipeline é totalmente automatizado. Deploys locais (para teste) podem ser disparados através dos scripts na raiz.
```bash
pnpm cf:deploy:staging
pnpm cf:deploy:production
```

## 🤝 Diretrizes da Engenharia

- **Strict Multi-Tenancy:** Jamais construa lógicas sem amarrar rigidamente o `organization_id`.
- **Append-Only Ledger:** Nunca execute comandos de `UPDATE/DELETE` na tabela transacional de notas (`assessment_control_events`). A trilha de auditoria é inquebrável (ADR-002).
- **Sem Magia:** Para propor novas bibliotecas ou integrações, verifique antes se o padrão já não existe em nossa base [Arc42](docs/architecture/arc42.md).

---

## ⚖️ Legal & Privacy (Eat Your Own Dog Food)

Como uma plataforma que audita os padrões de segurança e governança de outras empresas, nossa própria arquitetura jurídica reflete nossos controles técnicos:
- **[Política de Privacidade e Tratamento de IA](docs/legal/PRIVACY_POLICY.md):** Contém a cláusula de Zero-Training de LLMs e criptografia isolada de inquilinos (Tenant-Key Encryption).
- **[Termos de Confidencialidade e SLA B2B](docs/legal/CONFIDENTIALITY_TERMS.md):** Formaliza o Acordo Mútuo de Confidencialidade (NDA) e garante a imutabilidade forense das auditorias via Append-Only Ledger.

---
*Equipe de Engenharia Standard B2B*
