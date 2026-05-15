/**
 * CB-D: Flow Templates — Process Automation Templates (Spec v3)
 *
 * Enriched with:
 * - id on steps
 * - ai_prompt_hint on steps
 * - outputs_pt on steps
 * - scf_controls per step
 * - severity on escalation_rules
 * - sla_article on templates
 * - trigger_pt instead of trigger
 * - consent_renewal template (new)
 * - vendor_review template (new)
 */
import type { RouteDefinition } from "../http";
import { json, routeParam } from "../http";
import { ApiError } from "../errors/api-error";

// ── Flow Templates ──────────────────────────────────────────────────────────

const FLOW_TEMPLATES = [
  {
    id: "dsar_response",
    name_pt: "Resposta a Requisição de Titular (DSAR)",
    module: "privacy" as const,
    trigger_pt: "Nova requisição de titular recebida",
    regulation_id: "lgpd",
    sla_days: 15,
    sla_article: "Art. 18, §5°",
    scf_controls: ["PRI-06", "PRI-07", "PRI-08"],
    steps: [
      { order: 1, id: "register", name_pt: "Receber e registrar requisição", description_pt: "Sistema registra DSAR com protocolo único e envia confirmação ao titular", type: "automated" as const, role: "system", timeout_hours: 1, ai_assist: true, ai_prompt_hint: "Classificar tipo de requisição e identificar regulação aplicável", condition: null, outputs_pt: ["Protocolo gerado", "Confirmação enviada"], scf_controls: ["PRI-06"] },
      { order: 2, id: "verify_identity", name_pt: "Verificar identidade do titular", description_pt: "Validar que o solicitante é de fato o titular dos dados", type: "manual" as const, role: "dpo", timeout_hours: 24, ai_assist: true, ai_prompt_hint: "Sugerir método de verificação baseado no tipo de dado", condition: null, outputs_pt: ["Identidade validada/negada"], scf_controls: ["PRI-06", "IAC-01"] },
      { order: 3, id: "classify", name_pt: "Classificar tipo de requisição", description_pt: "Identificar tipo: acesso, correção, exclusão, portabilidade, etc.", type: "automated" as const, role: "system", timeout_hours: 1, ai_assist: true, ai_prompt_hint: "Mapear requisição para artigo da LGPD e identificar se pode ser negada", condition: null, outputs_pt: ["Tipo classificado", "Artigo identificado"], scf_controls: ["PRI-06"] },
      { order: 4, id: "locate_data", name_pt: "Localizar dados nos sistemas", description_pt: "Data mapping: identificar onde os dados estão armazenados", type: "manual" as const, role: "it", timeout_hours: 48, ai_assist: true, ai_prompt_hint: "Consultar ROPA para identificar sistemas que processam dados do titular", condition: null, outputs_pt: ["Lista de sistemas", "Dados localizados"], scf_controls: ["PRI-07", "DCH-01"] },
      { order: 5, id: "execute", name_pt: "Executar ação solicitada", description_pt: "Efetuar acesso/correção/exclusão/portabilidade nos sistemas", type: "manual" as const, role: "it", timeout_hours: 96, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Ação executada em todos sistemas"], scf_controls: ["PRI-06"] },
      { order: 6, id: "review", name_pt: "Revisar e aprovar resposta", description_pt: "DPO valida que a resposta é completa e conforme", type: "approval" as const, role: "dpo", timeout_hours: 24, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Resposta aprovada"], scf_controls: ["PRI-06"] },
      { order: 7, id: "respond", name_pt: "Enviar resposta ao titular", description_pt: "Enviar resposta formal com evidências ao titular", type: "notification" as const, role: "system", timeout_hours: 1, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Resposta entregue", "Protocolo fechado"], scf_controls: ["PRI-06"] },
    ],
    escalation_rules: [
      { trigger_pt: "Prazo SLA atingiu 80%", action_pt: "Notificar DPO sobre prazo próximo do vencimento", severity: "warning" as const },
      { trigger_pt: "Prazo SLA excedido", action_pt: "Escalar para gestão e registrar violação de prazo", severity: "critical" as const },
    ],
  },
  {
    id: "breach_response",
    name_pt: "Resposta a Incidente de Dados Pessoais",
    module: "privacy" as const,
    trigger_pt: "Incidente de dados pessoais detectado ou reportado",
    regulation_id: "gdpr",
    sla_days: 3, sla_article: "Art. 33",
    scf_controls: ["IRO-01", "IRO-02", "IRO-09", "IRO-10", "PRI-01"],
    steps: [
      { order: 1, id: "detect", name_pt: "Detectar e registrar incidente", description_pt: "SIEM/SOC detecta e registra evento com severity", type: "automated" as const, role: "system", timeout_hours: 1, ai_assist: true, ai_prompt_hint: "Classificar severity baseado em dados afetados", condition: null, outputs_pt: ["Incidente registrado", "Severity atribuída"], scf_controls: ["IRO-01", "MON-01"] },
      { order: 2, id: "classify", name_pt: "Classificar severidade e escopo", description_pt: "Determinar tipo de dados afetados, volume, impacto", type: "manual" as const, role: "security_analyst", timeout_hours: 4, ai_assist: true, ai_prompt_hint: "Avaliar se há dados sensíveis e volume de titulares afetados", condition: null, outputs_pt: ["Escopo definido", "Severity confirmada"], scf_controls: ["IRO-02"] },
      { order: 3, id: "contain", name_pt: "Conter o incidente", description_pt: "Isolar sistemas afetados, revogar acessos comprometidos", type: "manual" as const, role: "it", timeout_hours: 8, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Incidente contido"], scf_controls: ["IRO-02"] },
      { order: 4, id: "assess_risk", name_pt: "Avaliar risco para titulares", description_pt: "Determinar se há risco elevado para os direitos dos titulares", type: "manual" as const, role: "dpo", timeout_hours: 12, ai_assist: true, ai_prompt_hint: "Avaliar impacto baseado na regulação aplicável e tipo de dados", condition: "severity >= medium", outputs_pt: ["Avaliação de risco"], scf_controls: ["PRI-01", "RSK-01"] },
      { order: 5, id: "notify_authority", name_pt: "Notificar autoridade (ANPD/DPA)", description_pt: "Preparar e enviar notificação formal à autoridade", type: "manual" as const, role: "dpo", timeout_hours: 48, ai_assist: true, ai_prompt_hint: "Gerar relatório com campos obrigatórios da regulação", condition: "severity >= high", outputs_pt: ["Notificação enviada"], scf_controls: ["IRO-09", "IRO-10"] },
      { order: 6, id: "notify_subjects", name_pt: "Notificar titulares afetados", description_pt: "Quando o incidente gera risco elevado aos titulares", type: "manual" as const, role: "dpo", timeout_hours: 72, ai_assist: true, ai_prompt_hint: "Redigir comunicação clara para titulares", condition: "risk_to_subjects == high", outputs_pt: ["Titulares notificados"], scf_controls: ["IRO-09"] },
      { order: 7, id: "investigate", name_pt: "Investigar causa raiz", description_pt: "Root cause analysis e coleta de evidências", type: "manual" as const, role: "security_analyst", timeout_hours: 168, ai_assist: true, ai_prompt_hint: "Análise de logs e evidências para determinar vetor de ataque", condition: null, outputs_pt: ["RCA documentado"], scf_controls: ["IRO-02"] },
      { order: 8, id: "remediate", name_pt: "Implementar ações corretivas", description_pt: "Remediar vulnerabilidade e atualizar controles", type: "manual" as const, role: "it", timeout_hours: 336, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Vulnerabilidade corrigida", "Controles atualizados"], scf_controls: ["IRO-02", "VUL-05"] },
      { order: 9, id: "postmortem", name_pt: "Post-mortem e lições aprendidas", description_pt: "Documentar aprendizados e atualizar procedimentos", type: "manual" as const, role: "security_analyst", timeout_hours: 504, ai_assist: true, ai_prompt_hint: "Gerar relatório post-mortem com timeline e lições", condition: null, outputs_pt: ["Post-mortem publicado", "Procedimentos atualizados"], scf_controls: ["IRO-04"] },
    ],
    escalation_rules: [
      { trigger_pt: "Severity classificada como critical", action_pt: "Ativar comitê de crise imediatamente", severity: "critical" as const },
      { trigger_pt: "Deadline de notificação à autoridade se aproximando", action_pt: "Escalar para C-Level e jurídico", severity: "critical" as const },
    ],
  },
  {
    id: "dpia_lifecycle",
    name_pt: "Ciclo de Vida do DPIA",
    module: "privacy" as const,
    trigger_pt: "Novo tratamento de alto risco identificado",
    regulation_id: "lgpd", sla_days: null, sla_article: "Art. 5°, XVII",
    scf_controls: ["PRI-05", "PRI-06", "RSK-01"],
    steps: [
      { order: 1, id: "screening", name_pt: "Screening: verificar necessidade", description_pt: "Avaliar se o tratamento atende critérios de DPIA", type: "automated" as const, role: "system", timeout_hours: 1, ai_assist: true, ai_prompt_hint: "Avaliar risk_factors do ROPA para determinar se score >= 8", condition: null, outputs_pt: ["DPIA necessário ou não"], scf_controls: ["PRI-05"] },
      { order: 2, id: "describe", name_pt: "Descrever o tratamento", description_pt: "Detalhar finalidade, dados, base legal, compartilhamentos", type: "manual" as const, role: "process_owner", timeout_hours: 120, ai_assist: true, ai_prompt_hint: "Preencher template com dados do ROPA", condition: null, outputs_pt: ["Descrição completa"], scf_controls: ["PRI-05", "PRI-03"] },
      { order: 3, id: "identify_risks", name_pt: "Identificar riscos à privacidade", description_pt: "Mapear riscos potenciais ao titular considerando o contexto", type: "manual" as const, role: "dpo", timeout_hours: 120, ai_assist: true, ai_prompt_hint: "Cruzar dados com taxonomia de riscos de privacidade", condition: null, outputs_pt: ["Mapa de riscos"], scf_controls: ["PRI-05", "RSK-01"] },
      { order: 4, id: "assess_proportionality", name_pt: "Avaliar necessidade e proporcionalidade", description_pt: "Verificar se o tratamento é estritamente necessário", type: "manual" as const, role: "dpo", timeout_hours: 72, ai_assist: true, ai_prompt_hint: null, condition: null, outputs_pt: ["Análise de proporcionalidade"], scf_controls: ["PRI-05"] },
      { order: 5, id: "define_measures", name_pt: "Definir medidas mitigadoras", description_pt: "Propor controles técnicos e organizacionais para cada risco", type: "manual" as const, role: "dpo", timeout_hours: 120, ai_assist: true, ai_prompt_hint: "Sugerir controles SCF aplicáveis para cada risco identificado", condition: null, outputs_pt: ["Plano de mitigação"], scf_controls: ["PRI-05", "RSK-02"] },
      { order: 6, id: "approve", name_pt: "Aprovar DPIA", description_pt: "DPO aprova ou recomenda consulta prévia à autoridade", type: "approval" as const, role: "dpo", timeout_hours: 72, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["DPIA aprovado/reprovado"], scf_controls: ["PRI-05"] },
      { order: 7, id: "consult_authority", name_pt: "Consulta prévia à autoridade (se necessário)", description_pt: "Submeter à ANPD quando o risco residual é alto", type: "manual" as const, role: "dpo", timeout_hours: 720, ai_assist: false, ai_prompt_hint: null, condition: "residual_risk == high", outputs_pt: ["Parecer da autoridade"], scf_controls: ["PRI-05"] },
    ],
    escalation_rules: [
      { trigger_pt: "Prazo de conclusão excedido", action_pt: "Bloquear início do tratamento até conclusão do DPIA", severity: "critical" as const },
    ],
  },
  {
    id: "consent_renewal",
    name_pt: "Renovação de Consentimento",
    module: "privacy" as const,
    trigger_pt: "Consentimento próximo do vencimento",
    regulation_id: "lgpd", sla_days: 30, sla_article: "Art. 8°",
    scf_controls: ["PRI-01", "PRI-03"],
    steps: [
      { order: 1, id: "identify_expiring", name_pt: "Identificar consentimentos a vencer", description_pt: "Listar consentimentos com renewal_months atingindo 80%", type: "automated" as const, role: "system", timeout_hours: 1, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Lista de consentimentos a renovar"], scf_controls: ["PRI-03"] },
      { order: 2, id: "notify_subject", name_pt: "Notificar titular sobre renovação", description_pt: "Enviar comunicação solicitando renovação do consentimento", type: "notification" as const, role: "system", timeout_hours: 1, ai_assist: true, ai_prompt_hint: "Gerar comunicação personalizada por tipo de consentimento", condition: null, outputs_pt: ["Notificação enviada"], scf_controls: ["PRI-03"] },
      { order: 3, id: "collect_response", name_pt: "Coletar resposta do titular", description_pt: "Registrar renovação ou revogação do consentimento", type: "manual" as const, role: "system", timeout_hours: 648, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Consentimento renovado ou revogado"], scf_controls: ["PRI-03"] },
      { order: 4, id: "process_revocation", name_pt: "Processar revogação (se aplicável)", description_pt: "Caso titular não renove, cessar tratamento e excluir dados", type: "decision" as const, role: "dpo", timeout_hours: 48, ai_assist: false, ai_prompt_hint: null, condition: "consent == revoked OR no_response", outputs_pt: ["Tratamento cessado", "Dados eliminados"], scf_controls: ["PRI-03", "DCH-17"] },
    ],
    escalation_rules: [
      { trigger_pt: "Titular não respondeu dentro de 30 dias", action_pt: "Cessar tratamento e agendar eliminação de dados", severity: "warning" as const },
    ],
  },
  {
    id: "audit_lifecycle",
    name_pt: "Ciclo de Vida de Auditoria",
    module: "governance" as const,
    trigger_pt: "Auditoria agendada ou requisitada",
    regulation_id: null, sla_days: null, sla_article: "ISO 27001:9.2",
    scf_controls: ["AIS-01", "AIS-04", "GOV-05"],
    steps: [
      { order: 1, id: "plan_scope", name_pt: "Planejar escopo da auditoria", description_pt: "Definir frameworks, controles e período", type: "manual" as const, role: "auditor", timeout_hours: 168, ai_assist: true, ai_prompt_hint: "Sugerir escopo baseado em gap analysis e achados anteriores", condition: null, outputs_pt: ["Plano de auditoria"], scf_controls: ["AIS-01"] },
      { order: 2, id: "request_evidence", name_pt: "Solicitar evidências", description_pt: "Gerar lista de evidências necessárias via ERL do SCF", type: "automated" as const, role: "system", timeout_hours: 24, ai_assist: true, ai_prompt_hint: "Gerar ERL filtrado por escopo do audit", condition: null, outputs_pt: ["Lista de evidências enviada"], scf_controls: ["AIS-04"] },
      { order: 3, id: "collect_evidence", name_pt: "Coletar evidências", description_pt: "Responsáveis uploadam evidências no vault", type: "manual" as const, role: "control_owner", timeout_hours: 336, ai_assist: true, ai_prompt_hint: "Sugerir evidências com base no ERL e tipo de controle", condition: null, outputs_pt: ["Evidências coletadas"], scf_controls: ["AIS-04"] },
      { order: 4, id: "evaluate", name_pt: "Avaliar evidências contra controles", description_pt: "Auditor verifica conformidade", type: "manual" as const, role: "auditor", timeout_hours: 336, ai_assist: true, ai_prompt_hint: "Avaliar adequação da evidência usando assessment objectives do SCF", condition: null, outputs_pt: ["Avaliação por controle"], scf_controls: ["AIS-04"] },
      { order: 5, id: "generate_report", name_pt: "Gerar relatório de achados", description_pt: "Sistema consolida findings em relatório", type: "automated" as const, role: "system", timeout_hours: 24, ai_assist: true, ai_prompt_hint: "Gerar relatório com severidade, impacto e recomendações", condition: null, outputs_pt: ["Relatório de achados"], scf_controls: ["AIS-04"] },
      { order: 6, id: "review_report", name_pt: "Revisar e aprovar relatório", description_pt: "Gestão valida achados e recomendações", type: "approval" as const, role: "audit_manager", timeout_hours: 72, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Relatório aprovado"], scf_controls: ["AIS-01"] },
      { order: 7, id: "distribute", name_pt: "Distribuir e iniciar remediação", description_pt: "Notificar stakeholders e criar PoA&M", type: "automated" as const, role: "system", timeout_hours: 24, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["PoA&M criado", "Stakeholders notificados"], scf_controls: ["AIS-01", "RSK-02"] },
    ],
    escalation_rules: [
      { trigger_pt: "Coleta de evidências atrasada", action_pt: "Escalar para gestor do controle", severity: "warning" as const },
      { trigger_pt: "Achado crítico identificado", action_pt: "Notificar C-Level imediatamente", severity: "critical" as const },
    ],
  },
  {
    id: "finding_remediation",
    name_pt: "Remediação de Achado",
    module: "governance" as const,
    trigger_pt: "Novo achado de auditoria ou assessment registrado",
    regulation_id: null, sla_days: null, sla_article: "ISO 27001:10.2",
    scf_controls: ["RSK-02", "CPL-03"],
    steps: [
      { order: 1, id: "classify", name_pt: "Classificar severidade", description_pt: "Atribuir prioridade baseado em risco", type: "automated" as const, role: "system", timeout_hours: 1, ai_assist: true, ai_prompt_hint: "Classificar usando risk matrix", condition: null, outputs_pt: ["Severidade atribuída: crítico=30d, alto=90d, médio=180d"], scf_controls: ["RSK-02"] },
      { order: 2, id: "assign", name_pt: "Atribuir responsável e prazo", description_pt: "Definir owner e deadline conforme severidade", type: "manual" as const, role: "compliance_manager", timeout_hours: 24, ai_assist: true, ai_prompt_hint: "Sugerir owner baseado no domínio SCF do controle", condition: null, outputs_pt: ["Responsável e prazo definidos"], scf_controls: ["RSK-02"] },
      { order: 3, id: "plan", name_pt: "Elaborar plano de ação", description_pt: "Detalhar ações, recursos e milestones", type: "manual" as const, role: "control_owner", timeout_hours: 120, ai_assist: true, ai_prompt_hint: "Sugerir ações baseado em treatment_examples do risk taxonomy", condition: null, outputs_pt: ["Plano de ação"], scf_controls: ["RSK-02"] },
      { order: 4, id: "execute", name_pt: "Executar remediação", description_pt: "Implementar ações corretivas", type: "manual" as const, role: "control_owner", timeout_hours: 2160, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Ações implementadas"], scf_controls: ["RSK-02"] },
      { order: 5, id: "evidence", name_pt: "Colher evidência de remediação", description_pt: "Documentar implementação efetiva", type: "manual" as const, role: "control_owner", timeout_hours: 48, ai_assist: true, ai_prompt_hint: "Sugerir evidências baseado no ERL do controle SCF", condition: null, outputs_pt: ["Evidência coletada"], scf_controls: ["AIS-04"] },
      { order: 6, id: "validate", name_pt: "Validar remediação", description_pt: "Verificar se o achado foi resolvido", type: "approval" as const, role: "compliance_manager", timeout_hours: 72, ai_assist: true, ai_prompt_hint: "Comparar evidência com assessment objectives", condition: null, outputs_pt: ["Achado fechado ou reaberto"], scf_controls: ["RSK-02"] },
    ],
    escalation_rules: [
      { trigger_pt: "Prazo SLA a 50%", action_pt: "Lembrete ao responsável", severity: "warning" as const },
      { trigger_pt: "Prazo SLA a 80%", action_pt: "Escalar para gestão", severity: "warning" as const },
      { trigger_pt: "Prazo SLA excedido", action_pt: "Registrar não conformidade e escalar para C-Level", severity: "critical" as const },
    ],
  },
  {
    id: "policy_review",
    name_pt: "Revisão de Política",
    module: "governance" as const,
    trigger_pt: "Política próxima da data de expiração",
    regulation_id: null, sla_days: 30, sla_article: "ISO 27001:7.5",
    scf_controls: ["GOV-02", "GOV-06"],
    steps: [
      { order: 1, id: "notify", name_pt: "Notificar responsável", description_pt: "Alerta 30 dias antes da expiração", type: "notification" as const, role: "system", timeout_hours: 1, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Notificação enviada"], scf_controls: ["GOV-06"] },
      { order: 2, id: "review", name_pt: "Revisar conteúdo", description_pt: "Atualizar conforme mudanças regulatórias e organizacionais", type: "manual" as const, role: "policy_owner", timeout_hours: 336, ai_assist: true, ai_prompt_hint: "Identificar mudanças regulatórias desde última revisão", condition: null, outputs_pt: ["Política revisada"], scf_controls: ["GOV-02"] },
      { order: 3, id: "feedback", name_pt: "Colher feedback", description_pt: "Enviar para revisão das áreas afetadas", type: "manual" as const, role: "policy_owner", timeout_hours: 168, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Feedback incorporado"], scf_controls: ["GOV-02"] },
      { order: 4, id: "approve", name_pt: "Aprovar nova versão", description_pt: "Alta gestão aprova a política revisada", type: "approval" as const, role: "executive", timeout_hours: 72, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Política aprovada"], scf_controls: ["GOV-02"] },
      { order: 5, id: "publish", name_pt: "Publicar e comunicar", description_pt: "Publicar no portal e notificar colaboradores", type: "automated" as const, role: "system", timeout_hours: 24, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Política publicada", "Colaboradores notificados"], scf_controls: ["GOV-06"] },
    ],
    escalation_rules: [
      { trigger_pt: "Prazo SLA excedido", action_pt: "Política vencida — escalar para CISO", severity: "critical" as const },
    ],
  },
  {
    id: "risk_treatment",
    name_pt: "Tratamento de Risco",
    module: "risk" as const,
    trigger_pt: "Risco identificado acima do apetite de risco da organização",
    regulation_id: null, sla_days: null, sla_article: "ISO 31000",
    scf_controls: ["RSK-01", "RSK-02", "RSK-04"],
    steps: [
      { order: 1, id: "identify", name_pt: "Identificar risco acima do apetite", description_pt: "KRI ou assessment indica risco acima do threshold", type: "automated" as const, role: "system", timeout_hours: 1, ai_assist: true, ai_prompt_hint: "Comparar score com appetite_levels da metodologia", condition: null, outputs_pt: ["Risco identificado acima do apetite"], scf_controls: ["RSK-01"] },
      { order: 2, id: "analyze", name_pt: "Analisar causa e impacto", description_pt: "Root cause analysis e avaliação de impacto", type: "manual" as const, role: "risk_manager", timeout_hours: 72, ai_assist: true, ai_prompt_hint: "Usar taxonomia de riscos para estruturar análise", condition: null, outputs_pt: ["RCA + avaliação de impacto"], scf_controls: ["RSK-01"] },
      { order: 3, id: "select_strategy", name_pt: "Selecionar estratégia de tratamento", description_pt: "Evitar, mitigar, transferir ou aceitar", type: "manual" as const, role: "risk_manager", timeout_hours: 48, ai_assist: true, ai_prompt_hint: "Sugerir estratégia baseada em treatment_options e cost-benefit", condition: null, outputs_pt: ["Estratégia selecionada"], scf_controls: ["RSK-02"] },
      { order: 4, id: "plan", name_pt: "Elaborar plano de tratamento", description_pt: "Definir ações, responsáveis, prazos e recursos", type: "manual" as const, role: "risk_manager", timeout_hours: 168, ai_assist: true, ai_prompt_hint: "Usar treatment_examples do risk taxonomy", condition: null, outputs_pt: ["Plano de tratamento"], scf_controls: ["RSK-02"] },
      { order: 5, id: "approve", name_pt: "Aprovar plano", description_pt: "Comitê de riscos valida e autoriza", type: "approval" as const, role: "risk_committee", timeout_hours: 168, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Plano aprovado"], scf_controls: ["RSK-04"] },
      { order: 6, id: "execute", name_pt: "Executar tratamento", description_pt: "Implementar controles e ações planejadas", type: "manual" as const, role: "control_owner", timeout_hours: 2160, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Controles implementados"], scf_controls: ["RSK-02"] },
      { order: 7, id: "validate", name_pt: "Validar eficácia e reavaliar risco", description_pt: "Verificar se risco residual está dentro do apetite", type: "manual" as const, role: "risk_manager", timeout_hours: 168, ai_assist: true, ai_prompt_hint: "Recalcular score e comparar com appetite", condition: null, outputs_pt: ["Risco residual avaliado"], scf_controls: ["RSK-01"] },
    ],
    escalation_rules: [
      { trigger_pt: "Risco critical identificado", action_pt: "Escalar imediatamente ao C-Level", severity: "critical" as const },
      { trigger_pt: "Tratamento atrasado", action_pt: "Reportar ao comitê de riscos", severity: "warning" as const },
    ],
  },
  {
    id: "vendor_review",
    name_pt: "Revisão Periódica de Fornecedor",
    module: "risk" as const,
    trigger_pt: "Revisão periódica de fornecedor devida (conforme tier)",
    regulation_id: null, sla_days: null, sla_article: "SCF TPM",
    scf_controls: ["TPM-01", "TPM-04", "TPM-05"],
    steps: [
      { order: 1, id: "notify", name_pt: "Gerar notificação de revisão", description_pt: "Alertar que revisão periódica é devida", type: "notification" as const, role: "system", timeout_hours: 1, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Notificação enviada"], scf_controls: ["TPM-04"] },
      { order: 2, id: "send_questionnaire", name_pt: "Enviar questionário TPRA", description_pt: "Enviar questionário atualizado ao ponto de contato", type: "automated" as const, role: "system", timeout_hours: 24, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Questionário enviado"], scf_controls: ["TPM-04"] },
      { order: 3, id: "collect_responses", name_pt: "Coletar e processar respostas", description_pt: "Receber respostas e calcular score", type: "manual" as const, role: "vendor_manager", timeout_hours: 336, ai_assist: true, ai_prompt_hint: "Usar scoring engine do TPRA para calcular score", condition: null, outputs_pt: ["Score calculado"], scf_controls: ["TPM-04"] },
      { order: 4, id: "evaluate", name_pt: "Avaliar score e determinar risco", description_pt: "Comparar score com threshold do tier", type: "automated" as const, role: "system", timeout_hours: 1, ai_assist: true, ai_prompt_hint: "Comparar com vendor_tiers", condition: null, outputs_pt: ["Risk level determinado"], scf_controls: ["TPM-04"] },
      { order: 5, id: "decide", name_pt: "Aprovar ou exigir remediação", description_pt: "Se score abaixo do mínimo, exigir plano de remediação", type: "decision" as const, role: "risk_manager", timeout_hours: 72, ai_assist: false, ai_prompt_hint: null, condition: "score < tier_minimum", outputs_pt: ["Vendor aprovado ou em remediação"], scf_controls: ["TPM-01"] },
      { order: 6, id: "schedule_next", name_pt: "Agendar próxima revisão", description_pt: "Definir data da próxima revisão conforme tier", type: "automated" as const, role: "system", timeout_hours: 1, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Próxima revisão agendada"], scf_controls: ["TPM-04"] },
    ],
    escalation_rules: [
      { trigger_pt: "Fornecedor não respondeu ao questionário", action_pt: "Escalar para gestão de contratos", severity: "warning" as const },
      { trigger_pt: "Score classificado como critical", action_pt: "Avaliar suspensão do fornecedor", severity: "critical" as const },
    ],
  },
];

const TEMPLATE_INDEX = new Map(FLOW_TEMPLATES.map(t => [t.id, t]));

// ── Routes ──────────────────────────────────────────────────────────────────

export const flowTemplateRoutes: RouteDefinition[] = [
  {
    method: "GET",
    path: "/api/v1/flow-templates",
    authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const url = new URL(request.url);
      const module = url.searchParams.get("module");
      let filtered = FLOW_TEMPLATES;
      if (module) filtered = filtered.filter(t => t.module === module);
      const summary = filtered.map(t => ({
        id: t.id, name_pt: t.name_pt, module: t.module, trigger_pt: t.trigger_pt,
        regulation_id: t.regulation_id, sla_days: t.sla_days, sla_article: t.sla_article,
        step_count: t.steps.length, scf_control_count: t.scf_controls.length,
      }));
      return json({ data: summary, total: summary.length, available_modules: ["privacy", "governance", "risk"], trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/flow-templates/:templateId",
    authRequired: true, tenantRequired: false,
    handler: async ({ params, traceId }) => {
      const t = TEMPLATE_INDEX.get(routeParam(params, "templateId"));
      if (!t) throw new ApiError("NOT_FOUND", `Template not found. Available: ${FLOW_TEMPLATES.map(t => t.id).join(", ")}`, 404);
      return json({ data: t, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/flow-templates/scf-mapping",
    authRequired: true, tenantRequired: false,
    handler: async ({ traceId }) => {
      const mapping = FLOW_TEMPLATES.map(t => ({
        template_id: t.id, name_pt: t.name_pt, module: t.module, scf_controls: t.scf_controls,
        step_controls: t.steps.map(s => ({ step_id: s.id, step_name_pt: s.name_pt, scf_controls: s.scf_controls })),
      }));
      return json({ data: mapping, trace_id: traceId });
    },
  },
];
