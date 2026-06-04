# Roadmap

> Este é o documento central de fases e milestones do Standard. Substituiu `docs/releases/roadmap-to-production.md`.

## Fases

### Fase 0: Organização do SDLC ✅ (em andamento)

**Objetivo**: Organizar completamente o ciclo de vida de desenvolvimento antes de escrever mais código.

**Critérios de saída**:
- [ ] Backlog unificado e priorizado em `docs/backlog/backlog.md`
- [ ] Produto documentado (visão, personas, modelo de negócio)
- [ ] Ambientes documentados (local, staging, production)
- [ ] ADRs retroativos registrados
- [ ] Planos legados com status definido
- [ ] DECISIONS.md atualizado
- [ ] Dev log atualizado

---

### Fase 1: Estabilização & Infraestrutura Real

**Objetivo**: Garantir que o que já existe funciona, passa em CI, e que a infraestrutura real está provisionada e testada.

**Critérios de entrada**: Fase 0 concluída.

**Critérios de saída**:
- [ ] `pnpm lint` + `pnpm typecheck` sem erros
- [ ] Drizzle ORM conectado ao Neon (driver `@neondatabase/serverless`)
- [ ] Auth real (Standard Native Auth) validado em staging Cloudflare
- [ ] Mapeamento GRC (Organizations e Orgs) estabelecido (não placeholder)
- [ ] Cloudflare resources staging separados (R2, Queues, Vectorize)
- [ ] Backup/restore PostgreSQL documentado e testado
- [ ] `feature/architecture-refactoring` avaliada (merge ou descarte)

---

### Fase 2: Core Funcional Completo

**Objetivo**: Completar os gaps do assessment engine e do produto que impedem um lifecycle end-to-end real.

**Critérios de entrada**: Fase 1 concluída.

**Critérios de saída**:
- [ ] `packages/maturity` implementado com scoring e testes
- [ ] Rejection/rework loops no assessment engine (transições de volta)
- [ ] Reprocessamento com rastreabilidade (motivo, versão anterior, ator)
- [ ] Immutability enforcement em artifacts aprovados
- [ ] LLM provider real integrado via AI Gateway (pelo menos 1 provider)
- [ ] DOCX/PDF renderer para relatórios (pelo menos 1 formato)
- [ ] Anti-malware scanning em uploads

---

### Fase 3: Frontend SaaS

**Objetivo**: Transformar o frontend de admin console em plataforma SaaS multi-organization com self-service.

**Critérios de entrada**: Fase 2 concluída (ou Fase 1 concluída se frontend for priorizado antes).

**Critérios de saída**:
- [ ] API Playground funcional
- [ ] Organization Self-Service (perfil, membros, convites)
- [ ] API Keys Self-Service (criação, revogação, monitoramento)
- [ ] Billing/Plans dashboard (mockup ou integração real)
- [ ] Onboarding wizard para primeiro acesso
- [ ] Separação clara: Master Admin vs Organization Admin vs User

---

### Fase 4: Produção

**Objetivo**: Go-live com dados reais de clientes.

**Critérios de entrada**: Fases 1–3 concluídas.

**Critérios de saída**:
- [ ] Production go-live checklist executado e verde
- [ ] Custom domains configurados
- [ ] Monitoring e alertas operacionais ativos
- [ ] Data retention e legal holds definidos
- [ ] SOC/SIEM integration (pelo menos logging)
- [ ] Revisão legal/privacy concluída
- [ ] Primeiro organization real onboarded

---

## Decisões de Sequência

- Fases 2 e 3 podem ser parcialmente paralelas se houver mão de obra
- Fase 4 é bloqueada pelas 3 anteriores
- O backlog em `docs/backlog/backlog.md` detalha os itens de cada fase
