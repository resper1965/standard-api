# Standard API: Security & Compliance Posture (SOC 2 / ISO 27001)

Este documento descreve a postura de compliance e a arquitetura de **Defesa em Profundidade (Defense in Depth)** da Plataforma Standard. Nossa arquitetura foi projetada para aderir aos rigorosos controles do **SOC 2 Type II** e da **ISO 27001:2022**.

## 1. O Paradoxo do "Append-Only Ledger" (Separação de Funções)
**Requisito:** SOC 2 CC6.3 (Separation of Duties) / ISO A.9.2.3 (Privileged access rights).

A confiabilidade das auditorias geradas por esta plataforma depende da imutabilidade da tabela `assessment_control_events`. 
- **O Risco:** Depender apenas do código (TypeScript/Drizzle ORM) não impede que um DBA com acesso master realize um `UPDATE` ou `DELETE` silencioso diretamente no banco de dados Neon.
- **A Defesa Arquitetural:** Implementamos **Triggers Nativos no PostgreSQL** (Row-Level Security / Impedimentos DDL). Qualquer tentativa de modificar ou deletar um registro existente na tabela de notas resulta em uma `EXCEPTION` lançada pelo próprio motor do banco de dados, barrando até mesmo administradores, além de gerar um alerta no Audit Log imutável da Neon.

## 2. Prevenção de Vazamento Cruzado no RAG (Confidencialidade)
**Requisito:** SOC 2 CC6.1 (Logical Access) / ISO A.14.1.2 (Securing application services).

A Cloudflare impõe limites ao número de namespaces no `Vectorize`, forçando a plataforma a operar um banco vetorial multi-tenant (`standard-rag-index-production`).
- **O Risco:** Confiar apenas em filtros de metadados (`{ organization_id: '123' }`) no momento da query é perigoso. Um bug de código poderia retornar documentos confidenciais do Cliente B para o Cliente A.
- **A Defesa Arquitetural:** O isolamento é fortalecido por **Tenant-Key Encryption**. Todo texto injetado no Vectorize é criptografado na origem (Worker) usando uma chave de derivação única baseada no `organization_id`. Caso um vetor do Cliente B vaze acidentalmente para o contexto do Cliente A, a rotina de descriptografia falhará, retornando lixo ininteligível. O vazamento cruzado é criptograficamente impossível.

## 3. Autenticação Zero-Knowledge (API Keys)
**Requisito:** ISO A.10.1 (Cryptographic controls).

Clientes M2M (Machine-to-Machine) utilizam API Keys para se comunicar com o Gateway.
- **O Risco:** Armazenar chaves em *plaintext* no banco de dados permite que um comprometimento do banco resulte em controle total das contas dos clientes.
- **A Defesa Arquitetural:** A Standard adota a postura **Zero-Knowledge**. A API Key real (`std_live_xxxx...`) é apresentada ao cliente apenas no momento da criação. O banco de dados e o cache (`STANDARD_CACHE` no KV) armazenam unicamente o hash irreversível **SHA-256** do segredo. No recebimento da requisição, o Edge hashea o header e o compara em tempo constante (evitando ataques de timing).

## 4. Fronteiras de Acesso ao Banco de Dados (Network Controls)
**Requisito:** SOC 2 CC6.6 (Boundary Protection) / ISO A.13.1.1 (Network controls).

A plataforma utiliza o Neon Serverless PostgreSQL.
- **O Risco:** A exposição do endpoint TCP (porta 5432) na internet pública permite ataques de força bruta ou acesso não autorizado em caso de vazamento da senha mestra.
- **A Defesa Arquitetural:** O banco Neon opera sob **IP Allowlisting restrito**. Apenas o bloco de IPs oficiais da rede Cloudflare (via Cloudflare Hyperdrive) possui permissão de rede para alcançar o banco de dados de produção. Conexões diretas da internet são sumariamente descartadas no firewall de borda (DROP).
