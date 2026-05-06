# Produto

## Nome
Standard

## Visão
Ser a plataforma de referência para assessments automatizados de segurança, conformidade e maturidade baseados no Secure Controls Framework (SCF), permitindo que organizações de qualquer dimensão avaliem e demonstrem conformidade com múltiplos frameworks regulatórios num único ciclo auditável, rastreável e governado por IA.

## Proposta de Valor
- **Um assessment, múltiplos frameworks**: o motor SCF permite mapear controles para ISO 27001, NIST 800-53, SOC2, LGPD, GDPR, QNRCS e dezenas de outros frameworks simultaneamente.
- **IA com governança**: agentes especializados analisam evidências e propõem resultados, mas nunca decidem — toda conclusão crítica passa por approval gates humanos.
- **Rastreabilidade total**: cada achado carrega `assessment_id`, `tenant_id`, `scf_version`, `control_id`, `evidence_id`, `agent_run_id` e `confidence`.
- **API-first**: todo o valor é acessível via API. O frontend é consumidor, não detentor de lógica.
- **Multi-tenant nativo**: isolamento de dados, storage, vetores, logs e quotas desde o desenho.

## Personas

### CISO / DPO
Precisa demonstrar conformidade a múltiplos reguladores, consolidar gaps entre frameworks e priorizar remediações com visibilidade executiva.

### Consultor GRC
Executa assessments para clientes, precisa de eficiência operacional, relatórios profissionais e rastreabilidade para audit trails.

### Auditor Interno
Valida evidências, aprova SoA e Gap Analysis, precisa de imutabilidade de artefatos aprovados e histórico de versões.

### Operador da Plataforma (Bekaa)
Gerencia tenants, provisiona resources, monitora saúde do sistema, controla licenças e quotas.

## Modelo de Negócio (Preliminar)

### SaaS por Assinatura
- **Free/Trial**: 1 organização, 1 assessment, frameworks limitados
- **Professional**: múltiplos assessments, frameworks ilimitados, API keys, relatórios avançados
- **Enterprise**: SSO, custom domains, multi-organização, suporte dedicado, SLA, data residency

### Métricas-chave
- Assessments iniciados e concluídos por tenant
- Frameworks mapeados por assessment
- Findings gerados e aprovados
- Tempo médio de ciclo (draft → closed)
- Consumo de AI calls por tenant

## Diferencial Competitivo
- Base normativa é o SCF oficial (não derivações proprietárias)
- Modelo agêntico governado (não é um chatbot que decide compliance)
- Multi-framework por design (não um produto por framework)
- API-first permite integração com qualquer stack existente do cliente
- Cloudflare edge-native: baixa latência global, escalabilidade automática
