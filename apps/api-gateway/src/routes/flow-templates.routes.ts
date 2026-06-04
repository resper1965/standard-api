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
import { json, routeParam, routeUuidParam } from "../http";
import { flattenI18n } from "../utils/i18n";
import { ApiError } from "../errors/api-error";

// ── Flow Templates ──────────────────────────────────────────────────────────

const FLOW_TEMPLATES = [
  {
    id: "dsar_response",
    name_i18n: { pt: "Resposta a Requisição de Titular (DSAR)", en: "Subject Access Request (DSAR) Response" },
    module: "privacy" as const,
    trigger_i18n: { pt: "Nova requisição de titular recebida", en: "New data subject request received" },
    regulation_id: "lgpd",
    sla_days: 15,
    sla_article: "Art. 18, §5°",
    scf_controls: ["PRI-06", "PRI-07", "PRI-08"],
    steps: [
      { order: 1, id: "register", name_i18n: { pt: "Receber e registrar requisição", en: "Receive and register request" }, description_i18n: { pt: "Sistema registra DSAR com protocolo único e envia confirmação ao titular", en: "System registers DSAR with unique protocol and sends confirmation" }, type: "automated" as const, role: "system", timeout_hours: 1, ai_assist: true, ai_prompt_hint: "Classificar tipo de requisição e identificar regulação aplicável", condition: null, outputs_pt: ["Protocolo gerado", "Confirmação enviada"], scf_controls: ["PRI-06"] },
      { order: 2, id: "verify_identity", name_i18n: { pt: "Verificar identidade do titular", en: "Verify subject identity" }, description_i18n: { pt: "Validar que o solicitante é de fato o titular dos dados", en: "Validate that the requester is indeed the data subject" }, type: "manual" as const, role: "dpo", timeout_hours: 24, ai_assist: true, ai_prompt_hint: "Sugerir método de verificação baseado no tipo de dado", condition: null, outputs_pt: ["Identidade validada/negada"], scf_controls: ["PRI-06", "IAC-01"] },
      { order: 3, id: "classify", name_i18n: { pt: "Classificar tipo de requisição", en: "Classify request type" }, description_i18n: { pt: "Identificar tipo: acesso, correção, exclusão, portabilidade, etc.", en: "Identify type: access, correction, deletion, portability, etc." }, type: "automated" as const, role: "system", timeout_hours: 1, ai_assist: true, ai_prompt_hint: "Mapear requisição para artigo da LGPD e identificar se pode ser negada", condition: null, outputs_pt: ["Tipo classificado", "Artigo identificado"], scf_controls: ["PRI-06"] },
      { order: 4, id: "locate_data", name_i18n: { pt: "Localizar dados nos sistemas", en: "Locate data in systems" }, description_i18n: { pt: "Data mapping: identificar onde os dados estão armazenados", en: "Data mapping: identify where data is stored" }, type: "manual" as const, role: "it", timeout_hours: 48, ai_assist: true, ai_prompt_hint: "Consultar ROPA para identificar sistemas que processam dados do titular", condition: null, outputs_pt: ["Lista de sistemas", "Dados localizados"], scf_controls: ["PRI-07", "DCH-01"] },
      { order: 5, id: "execute", name_i18n: { pt: "Executar ação solicitada", en: "Execute requested action" }, description_i18n: { pt: "Efetuar acesso/correção/exclusão/portabilidade nos sistemas", en: "Perform access/correction/deletion/portability in systems" }, type: "manual" as const, role: "it", timeout_hours: 96, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Ação executada em todos sistemas"], scf_controls: ["PRI-06"] },
      { order: 6, id: "review", name_i18n: { pt: "Revisar e aprovar resposta", en: "Review and approve response" }, description_i18n: { pt: "DPO valida que a resposta é completa e conforme", en: "DPO validates that response is complete and compliant" }, type: "approval" as const, role: "dpo", timeout_hours: 24, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Resposta aprovada"], scf_controls: ["PRI-06"] },
      { order: 7, id: "respond", name_i18n: { pt: "Enviar resposta ao titular", en: "Send response to subject" }, description_i18n: { pt: "Enviar resposta formal com evidências ao titular", en: "Send formal response with evidence to subject" }, type: "notification" as const, role: "system", timeout_hours: 1, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Resposta entregue", "Protocolo fechado"], scf_controls: ["PRI-06"] },
    ],
    escalation_rules: [
      { trigger_i18n: { pt: "Prazo SLA atingiu 80%", en: "SLA deadline reached 80%" }, action_i18n: { pt: "Notificar DPO sobre prazo próximo do vencimento", en: "Notify DPO about upcoming deadline" }, severity: "warning" as const },
      { trigger_i18n: { pt: "Prazo SLA excedido", en: "SLA deadline exceeded" }, action_i18n: { pt: "Escalar para gestão e registrar violação de prazo", en: "Escalate to management and record deadline violation" }, severity: "critical" as const },
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
      { order: 1, id: "detect", name_i18n: { pt: "Detectar e registrar incidente", en: "Detect and register incident" }, description_i18n: { pt: "SIEM/SOC detecta e registra evento com severity", en: "SIEM/SOC detects and registers event with severity" }, type: "automated" as const, role: "system", timeout_hours: 1, ai_assist: true, ai_prompt_hint: "Classificar severity baseado em dados afetados", condition: null, outputs_pt: ["Incidente registrado", "Severity atribuída"], scf_controls: ["IRO-01", "MON-01"] },
      { order: 2, id: "classify", name_i18n: { pt: "Classificar severidade e escopo", en: "Classify severity and scope" }, description_i18n: { pt: "Determinar tipo de dados afetados, volume, impacto", en: "Determine type of affected data, volume, impact" }, type: "manual" as const, role: "security_analyst", timeout_hours: 4, ai_assist: true, ai_prompt_hint: "Avaliar se há dados sensíveis e volume de titulares afetados", condition: null, outputs_pt: ["Escopo definido", "Severity confirmada"], scf_controls: ["IRO-02"] },
      { order: 3, id: "contain", name_i18n: { pt: "Conter o incidente", en: "Contain the incident" }, description_i18n: { pt: "Isolar sistemas afetados, revogar acessos comprometidos", en: "Isolate affected systems, revoke compromised access" }, type: "manual" as const, role: "it", timeout_hours: 8, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Incidente contido"], scf_controls: ["IRO-02"] },
      { order: 4, id: "assess_risk", name_i18n: { pt: "Avaliar risco para titulares", en: "Assess risk to data subjects" }, description_i18n: { pt: "Determinar se há risco elevado para os direitos dos titulares", en: "Determine if there is high risk to data subject rights" }, type: "manual" as const, role: "dpo", timeout_hours: 12, ai_assist: true, ai_prompt_hint: "Avaliar impacto baseado na regulação aplicável e tipo de dados", condition: "severity >= medium", outputs_pt: ["Avaliação de risco"], scf_controls: ["PRI-01", "RSK-01"] },
      { order: 5, id: "notify_authority", name_i18n: { pt: "Notificar autoridade (ANPD/DPA)", en: "Notify authority (ANPD/DPA)" }, description_i18n: { pt: "Preparar e enviar notificação formal à autoridade", en: "Prepare and send formal notification to the authority" }, type: "manual" as const, role: "dpo", timeout_hours: 48, ai_assist: true, ai_prompt_hint: "Gerar relatório com campos obrigatórios da regulação", condition: "severity >= high", outputs_pt: ["Notificação enviada"], scf_controls: ["IRO-09", "IRO-10"] },
      { order: 6, id: "notify_subjects", name_i18n: { pt: "Notificar titulares afetados", en: "Notify affected data subjects" }, description_i18n: { pt: "Quando o incidente gera risco elevado aos titulares", en: "When the incident creates high risk to data subjects" }, type: "manual" as const, role: "dpo", timeout_hours: 72, ai_assist: true, ai_prompt_hint: "Redigir comunicação clara para titulares", condition: "risk_to_subjects == high", outputs_pt: ["Titulares notificados"], scf_controls: ["IRO-09"] },
      { order: 7, id: "investigate", name_i18n: { pt: "Análise do Analista", en: "Analyst Review" }, description_i18n: { pt: "Revisão interna das respostas e evidências.", en: "Internal review of answers and evidence." }, type: "manual" as const, role: "security_analyst", timeout_hours: 168, ai_assist: true, ai_prompt_hint: "Análise de logs e evidências para determinar vetor de ataque", condition: null, outputs_pt: ["RCA documentado"], scf_controls: ["IRO-02"] },
      { order: 8, id: "remediate", name_i18n: { pt: "Implementar ações corretivas", en: "Implement corrective actions" }, description_i18n: { pt: "Remediar vulnerabilidade e atualizar controles", en: "Remediate vulnerability and update controls" }, type: "manual" as const, role: "it", timeout_hours: 336, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Vulnerabilidade corrigida", "Controles atualizados"], scf_controls: ["IRO-02", "VUL-05"] },
      { order: 9, id: "postmortem", name_i18n: { pt: "Post-mortem e lições aprendidas", en: "Post-mortem and lessons learned" }, description_i18n: { pt: "Documentar aprendizados e atualizar procedimentos", en: "Document learnings and update procedures" }, type: "manual" as const, role: "security_analyst", timeout_hours: 504, ai_assist: true, ai_prompt_hint: "Gerar relatório post-mortem com timeline e lições", condition: null, outputs_pt: ["Post-mortem publicado", "Procedimentos atualizados"], scf_controls: ["IRO-04"] },
    ],
    escalation_rules: [
      { trigger_i18n: { pt: "Severity classificada como critical", en: "Severity classified as critical" }, action_i18n: { pt: "Ativar comitê de crise imediatamente", en: "Activate crisis committee immediately" }, severity: "critical" as const },
      { trigger_i18n: { pt: "Deadline de notificação à autoridade se aproximando", en: "Authority notification deadline approaching" }, action_i18n: { pt: "Escalar para C-Level e jurídico", en: "Escalate to C-Level and legal" }, severity: "critical" as const },
    ],
  },
  {
    id: "dpia_lifecycle",
    name_i18n: { pt: "Ciclo de Vida do DPIA", en: "DPIA Lifecycle" },
    module: "privacy" as const,
    trigger_i18n: { pt: "Novo tratamento de alto risco identificado", en: "New high-risk processing identified" },
    regulation_id: "lgpd", sla_days: null, sla_article: "Art. 5°, XVII",
    scf_controls: ["PRI-05", "PRI-06", "RSK-01"],
    steps: [
      { order: 1, id: "screening", name_i18n: { pt: "Screening: verificar necessidade", en: "Screening: verify necessity" }, description_i18n: { pt: "Avaliar se o tratamento atende critérios de DPIA", en: "Evaluate if processing meets DPIA criteria" }, type: "automated" as const, role: "system", timeout_hours: 1, ai_assist: true, ai_prompt_hint: "Avaliar risk_factors do ROPA para determinar se score >= 8", condition: null, outputs_pt: ["DPIA necessário ou não"], scf_controls: ["PRI-05"] },
      { order: 2, id: "describe", name_i18n: { pt: "Descrever tratamento de dados", en: "Describe data processing" }, description_i18n: { pt: "Descrever finalidade, necessidade e proporcionalidade", en: "Describe purpose, necessity and proportionality" }, type: "manual" as const, role: "process_owner", timeout_hours: 120, ai_assist: true, ai_prompt_hint: "Preencher template com dados do ROPA", condition: null, outputs_pt: ["Descrição completa"], scf_controls: ["PRI-05", "PRI-03"] },
      { order: 3, id: "identify_risks", name_i18n: { pt: "Identificar riscos à privacidade", en: "Identify privacy risks" }, description_i18n: { pt: "Mapear riscos potenciais ao titular considerando o contexto", en: "Map potential risks to the data subject considering context" }, type: "manual" as const, role: "dpo", timeout_hours: 120, ai_assist: true, ai_prompt_hint: "Cruzar dados com taxonomia de riscos de privacidade", condition: null, outputs_pt: ["Mapa de riscos"], scf_controls: ["PRI-05", "RSK-01"] },
      { order: 4, id: "assess_proportionality", name_i18n: { pt: "Avaliar necessidade e proporcionalidade", en: "Assess necessity and proportionality" }, description_i18n: { pt: "Confirmar se o tratamento é necessário e proporcional aos fins", en: "Confirm if processing is necessary and proportional to ends" }, type: "manual" as const, role: "dpo", timeout_hours: 72, ai_assist: true, ai_prompt_hint: null, condition: null, outputs_pt: ["Análise de proporcionalidade"], scf_controls: ["PRI-05"] },
      { order: 5, id: "define_measures", name_i18n: { pt: "Definir medidas mitigadoras", en: "Define mitigation measures" }, description_i18n: { pt: "Propor controles técnicos e organizacionais para cada risco", en: "Propose technical and organizational controls for each risk" }, type: "manual" as const, role: "dpo", timeout_hours: 120, ai_assist: true, ai_prompt_hint: "Sugerir controles SCF aplicáveis para cada risco identificado", condition: null, outputs_pt: ["Plano de mitigação"], scf_controls: ["PRI-05", "RSK-02"] },
      { order: 6, id: "approve", name_i18n: { pt: "Aprovar DPIA", en: "Approve DPIA" }, description_i18n: { pt: "DPO aprova ou recomenda consulta prévia à autoridade", en: "DPO approves or recommends prior consultation with authority" }, type: "approval" as const, role: "dpo", timeout_hours: 72, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["DPIA aprovado/reprovado"], scf_controls: ["PRI-05"] },
      { order: 7, id: "consult_authority", name_i18n: { pt: "Consulta prévia à autoridade (se necessário)", en: "Prior consultation with authority (if necessary)" }, description_i18n: { pt: "Submeter à ANPD quando o risco residual é alto", en: "Submit to ANPD when residual risk is high" }, type: "manual" as const, role: "dpo", timeout_hours: 720, ai_assist: false, ai_prompt_hint: null, condition: "residual_risk == high", outputs_pt: ["Parecer da autoridade"], scf_controls: ["PRI-05"] },
    ],
    escalation_rules: [
      { trigger_i18n: { pt: "Prazo de conclusão excedido", en: "Completion deadline exceeded" }, action_i18n: { pt: "Bloquear início do tratamento até conclusão do DPIA", en: "Block processing start until DPIA completion" }, severity: "critical" as const },
    ],
  },
  {
    id: "consent_renewal",
    name_i18n: { pt: "Renovação de Consentimento", en: "Consent Renewal" },
    module: "privacy" as const,
    trigger_i18n: { pt: "Consentimento próximo do vencimento", en: "Consent nearing expiration" },
    regulation_id: "lgpd", sla_days: 30, sla_article: "Art. 8°",
    scf_controls: ["PRI-01", "PRI-03"],
    steps: [
      { order: 1, id: "identify_expiring", name_i18n: { pt: "Identificar consentimentos a vencer", en: "Identify expiring consents" }, description_i18n: { pt: "Listar consentimentos com renewal_months atingindo 80%", en: "List consents with renewal_months reaching 80%" }, type: "automated" as const, role: "system", timeout_hours: 1, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Lista de consentimentos a renovar"], scf_controls: ["PRI-03"] },
      { order: 2, id: "notify_subject", name_i18n: { pt: "Notificar titular sobre renovação", en: "Notify data subject about renewal" }, description_i18n: { pt: "Enviar comunicação solicitando renovação do consentimento", en: "Send communication requesting consent renewal" }, type: "notification" as const, role: "system", timeout_hours: 1, ai_assist: true, ai_prompt_hint: "Gerar comunicação personalizada por tipo de consentimento", condition: null, outputs_pt: ["Notificação enviada"], scf_controls: ["PRI-03"] },
      { order: 3, id: "collect_response", name_i18n: { pt: "Coletar resposta do titular", en: "Collect subject response" }, description_i18n: { pt: "Registrar aceite ou revogação do titular", en: "Register subject's acceptance or revocation" }, type: "manual" as const, role: "system", timeout_hours: 648, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Consentimento renovado ou revogado"], scf_controls: ["PRI-03"] },
      { order: 4, id: "process_revocation", name_i18n: { pt: "Processar revogação (se aplicável)", en: "Process revocation (if applicable)" }, description_i18n: { pt: "Caso titular não renove, cessar tratamento e excluir dados", en: "If data subject does not renew, cease processing and delete data" }, type: "decision" as const, role: "dpo", timeout_hours: 48, ai_assist: false, ai_prompt_hint: null, condition: "consent == revoked OR no_response", outputs_pt: ["Tratamento cessado", "Dados eliminados"], scf_controls: ["PRI-03", "DCH-17"] },
    ],
    escalation_rules: [
      { trigger_i18n: { pt: "Titular não respondeu dentro de 30 dias", en: "Data subject did not respond within 30 days" }, action_i18n: { pt: "Cessar tratamento e agendar eliminação de dados", en: "Cease processing and schedule data deletion" }, severity: "warning" as const },
    ],
  },
  {
    id: "audit_lifecycle",
    name_i18n: { pt: "Ciclo de Vida de Auditoria", en: "Audit Lifecycle" },
    module: "governance" as const,
    trigger_i18n: { pt: "Auditoria agendada ou requisitada", en: "Audit scheduled or requested" },
    regulation_id: null, sla_days: null, sla_article: "ISO 27001:9.2",
    scf_controls: ["AIS-01", "AIS-04", "GOV-05"],
    steps: [
      { order: 1, id: "plan_scope", name_i18n: { pt: "Planejar escopo da auditoria", en: "Plan audit scope" }, description_i18n: { pt: "Definir frameworks, controles e período", en: "Define frameworks, controls, and period" }, type: "manual" as const, role: "auditor", timeout_hours: 168, ai_assist: true, ai_prompt_hint: "Sugerir escopo baseado em gap analysis e achados anteriores", condition: null, outputs_pt: ["Plano de auditoria"], scf_controls: ["AIS-01"] },
      { order: 2, id: "request_evidence", name_i18n: { pt: "Solicitar evidências", en: "Request evidence" }, description_i18n: { pt: "Gerar lista de evidências necessárias via ERL do SCF", en: "Generate list of required evidence via SCF ERL" }, type: "automated" as const, role: "system", timeout_hours: 24, ai_assist: true, ai_prompt_hint: "Gerar ERL filtrado por escopo do audit", condition: null, outputs_pt: ["Lista de evidências enviada"], scf_controls: ["AIS-04"] },
      { order: 3, id: "collect_evidence", name_i18n: { pt: "Coletar evidências", en: "Collect evidence" }, description_i18n: { pt: "Responsáveis uploadam evidências no vault", en: "Owners upload evidence to the vault" }, type: "manual" as const, role: "control_owner", timeout_hours: 336, ai_assist: true, ai_prompt_hint: "Sugerir evidências com base no ERL e tipo de controle", condition: null, outputs_pt: ["Evidências coletadas"], scf_controls: ["AIS-04"] },
      { order: 4, id: "evaluate", name_i18n: { pt: "Avaliar evidências contra controles", en: "Evaluate evidence against controls" }, description_i18n: { pt: "Auditor verifica conformidade", en: "Auditor verifies compliance" }, type: "manual" as const, role: "auditor", timeout_hours: 336, ai_assist: true, ai_prompt_hint: "Avaliar adequação da evidência usando assessment objectives do SCF", condition: null, outputs_pt: ["Avaliação por controle"], scf_controls: ["AIS-04"] },
      { order: 5, id: "generate_report", name_i18n: { pt: "Gerar relatório de achados", en: "Generate findings report" }, description_i18n: { pt: "Sistema consolida findings em relatório", en: "System consolidates findings into report" }, type: "automated" as const, role: "system", timeout_hours: 24, ai_assist: true, ai_prompt_hint: "Gerar relatório com severidade, impacto e recomendações", condition: null, outputs_pt: ["Relatório de achados"], scf_controls: ["AIS-04"] },
      { order: 6, id: "review_report", name_i18n: { pt: "Revisar e aprovar relatório", en: "Review and approve report" }, description_i18n: { pt: "Gestão valida achados e recomendações", en: "Management validates findings and recommendations" }, type: "approval" as const, role: "audit_manager", timeout_hours: 72, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Relatório aprovado"], scf_controls: ["AIS-01"] },
      { order: 7, id: "distribute", name_i18n: { pt: "Distribuir e iniciar remediação", en: "Distribute and start remediation" }, description_i18n: { pt: "Notificar stakeholders e criar PoA&M", en: "Notify stakeholders and create PoA&M" }, type: "automated" as const, role: "system", timeout_hours: 24, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["PoA&M criado", "Stakeholders notificados"], scf_controls: ["AIS-01", "RSK-02"] },
    ],
    escalation_rules: [
      { trigger_i18n: { pt: "Coleta de evidências atrasada", en: "Evidence collection delayed" }, action_i18n: { pt: "Escalar para gestor do controle", en: "Escalate to control owner" }, severity: "warning" as const },
      { trigger_i18n: { pt: "Achado crítico identificado", en: "Critical finding identified" }, action_i18n: { pt: "Notificar C-Level imediatamente", en: "Notify C-Level immediately" }, severity: "critical" as const },
    ],
  },
  {
    id: "finding_remediation",
    name_i18n: { pt: "Remediação de Achado", en: "Finding Remediation" },
    module: "governance" as const,
    trigger_i18n: { pt: "Novo achado de auditoria ou assessment registrado", en: "New audit or assessment finding registered" },
    regulation_id: null, sla_days: null, sla_article: "ISO 27001:10.2",
    scf_controls: ["RSK-02", "CPL-03"],
    steps: [
      { order: 1, id: "classify", name_i18n: { pt: "Classificar severidade", en: "Classify severity" }, description_i18n: { pt: "Atribuir prioridade baseado em risco", en: "Assign priority based on risk" }, type: "automated" as const, role: "system", timeout_hours: 1, ai_assist: true, ai_prompt_hint: "Classificar usando risk matrix", condition: null, outputs_pt: ["Severidade atribuída: crítico=30d, alto=90d, médio=180d"], scf_controls: ["RSK-02"] },
      { order: 2, id: "assign", name_i18n: { pt: "Atribuir responsável e prazo", en: "Assign owner and deadline" }, description_i18n: { pt: "Definir owner e deadline conforme severidade", en: "Define owner and deadline according to severity" }, type: "manual" as const, role: "compliance_manager", timeout_hours: 24, ai_assist: true, ai_prompt_hint: "Sugerir owner baseado no domínio SCF do controle", condition: null, outputs_pt: ["Responsável e prazo definidos"], scf_controls: ["RSK-02"] },
      { order: 3, id: "plan", name_i18n: { pt: "Elaborar plano de ação", en: "Develop action plan" }, description_i18n: { pt: "Detalhar ações, recursos e milestones", en: "Detail actions, resources, and milestones" }, type: "manual" as const, role: "control_owner", timeout_hours: 120, ai_assist: true, ai_prompt_hint: "Sugerir ações baseado em treatment_examples do risk taxonomy", condition: null, outputs_pt: ["Plano de ação"], scf_controls: ["RSK-02"] },
      { order: 4, id: "execute", name_i18n: { pt: "Executar remediação", en: "Execute remediation" }, description_i18n: { pt: "Implementar ações corretivas", en: "Implement corrective actions" }, type: "manual" as const, role: "control_owner", timeout_hours: 2160, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Ações implementadas"], scf_controls: ["RSK-02"] },
      { order: 5, id: "evidence", name_i18n: { pt: "Colher evidência de remediação", en: "Collect remediation evidence" }, description_i18n: { pt: "Documentar implementação efetiva", en: "Document effective implementation" }, type: "manual" as const, role: "control_owner", timeout_hours: 48, ai_assist: true, ai_prompt_hint: "Sugerir evidências baseado no ERL do controle SCF", condition: null, outputs_pt: ["Evidência coletada"], scf_controls: ["AIS-04"] },
      { order: 6, id: "validate", name_i18n: { pt: "Validar remediação", en: "Validate remediation" }, description_i18n: { pt: "Verificar se o achado foi resolvido", en: "Verify if the finding was resolved" }, type: "approval" as const, role: "compliance_manager", timeout_hours: 72, ai_assist: true, ai_prompt_hint: "Comparar evidência com assessment objectives", condition: null, outputs_pt: ["Achado fechado ou reaberto"], scf_controls: ["RSK-02"] },
    ],
    escalation_rules: [
      { trigger_i18n: { pt: "Prazo SLA a 50%", en: "SLA deadline at 50%" }, action_i18n: { pt: "Lembrete ao responsável", en: "Reminder to owner" }, severity: "warning" as const },
      { trigger_i18n: { pt: "Prazo SLA a 80%", en: "SLA deadline at 80%" }, action_i18n: { pt: "Escalar para gestão", en: "Escalate to management" }, severity: "warning" as const },
      { trigger_i18n: { pt: "Prazo SLA excedido", en: "SLA deadline exceeded" }, action_i18n: { pt: "Registrar não conformidade e escalar para C-Level", en: "Record non-compliance and escalate to C-Level" }, severity: "critical" as const },
    ],
  },
  {
    id: "policy_review",
    name_i18n: { pt: "Revisão de Política", en: "Policy Review" },
    module: "governance" as const,
    trigger_i18n: { pt: "Política próxima da data de expiração", en: "Policy nearing expiration" },
    regulation_id: null, sla_days: 30, sla_article: "ISO 27001:7.5",
    scf_controls: ["GOV-02", "GOV-06"],
    steps: [
      { order: 1, id: "notify", name_i18n: { pt: "Notificar responsável", en: "Notify owner" }, description_i18n: { pt: "Alerta 30 dias antes da expiração", en: "Alert 30 days before expiration" }, type: "notification" as const, role: "system", timeout_hours: 1, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Notificação enviada"], scf_controls: ["GOV-06"] },
      { order: 2, id: "review", name_i18n: { pt: "Revisar política", en: "Review policy" }, description_i18n: { pt: "Atualizar conteúdo da política e anexos", en: "Update policy content and attachments" }, type: "manual" as const, role: "policy_owner", timeout_hours: 336, ai_assist: true, ai_prompt_hint: "Identificar mudanças regulatórias desde última revisão", condition: null, outputs_pt: ["Política revisada"], scf_controls: ["GOV-02"] },
      { order: 3, id: "feedback", name_i18n: { pt: "Colher feedback", en: "Collect feedback" }, description_i18n: { pt: "Enviar para revisão das áreas afetadas", en: "Send for review to affected areas" }, type: "manual" as const, role: "policy_owner", timeout_hours: 168, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Feedback incorporado"], scf_controls: ["GOV-02"] },
      { order: 4, id: "approve", name_i18n: { pt: "Aprovar nova versão", en: "Approve new version" }, description_i18n: { pt: "Alta gestão aprova a política revisada", en: "Senior management approves the revised policy" }, type: "approval" as const, role: "executive", timeout_hours: 72, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Política aprovada"], scf_controls: ["GOV-02"] },
      { order: 5, id: "publish", name_i18n: { pt: "Publicar e comunicar", en: "Publish and communicate" }, description_i18n: { pt: "Publicar no portal e notificar colaboradores", en: "Publish on portal and notify employees" }, type: "automated" as const, role: "system", timeout_hours: 24, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Política publicada", "Colaboradores notificados"], scf_controls: ["GOV-06"] },
    ],
    escalation_rules: [
      { trigger_i18n: { pt: "Prazo SLA excedido", en: "SLA deadline exceeded" }, action_i18n: { pt: "Política vencida — escalar para CISO", en: "Policy expired — escalate to CISO" }, severity: "critical" as const },
    ],
  },
  {
    id: "risk_treatment",
    name_i18n: { pt: "Tratamento de Risco", en: "Risk Treatment" },
    module: "risk" as const,
    trigger_i18n: { pt: "Risco identificado acima do apetite de risco da organização", en: "Risk identified above organizational risk appetite" },
    regulation_id: null, sla_days: null, sla_article: "ISO 31000",
    scf_controls: ["RSK-01", "RSK-02", "RSK-04"],
    steps: [
      { order: 1, id: "identify", name_i18n: { pt: "Identificar risco acima do apetite", en: "Identify risk above appetite" }, description_i18n: { pt: "KRI ou assessment indica risco acima do threshold", en: "KRI or assessment indicates risk above threshold" }, type: "automated" as const, role: "system", timeout_hours: 1, ai_assist: true, ai_prompt_hint: "Comparar score com appetite_levels da metodologia", condition: null, outputs_pt: ["Risco identificado acima do apetite"], scf_controls: ["RSK-01"] },
      { order: 2, id: "analyze", name_i18n: { pt: "Analisar causa e impacto", en: "Analyze cause and impact" }, description_i18n: { pt: "Root cause analysis e avaliação de impacto", en: "Root cause analysis and impact assessment" }, type: "manual" as const, role: "risk_manager", timeout_hours: 72, ai_assist: true, ai_prompt_hint: "Usar taxonomia de riscos para estruturar análise", condition: null, outputs_pt: ["RCA + avaliação de impacto"], scf_controls: ["RSK-01"] },
      { order: 3, id: "select_strategy", name_i18n: { pt: "Selecionar estratégia de tratamento", en: "Select treatment strategy" }, description_i18n: { pt: "Evitar, mitigar, transferir ou aceitar", en: "Avoid, mitigate, transfer, or accept" }, type: "manual" as const, role: "risk_manager", timeout_hours: 48, ai_assist: true, ai_prompt_hint: "Sugerir estratégia baseada em treatment_options e cost-benefit", condition: null, outputs_pt: ["Estratégia selecionada"], scf_controls: ["RSK-02"] },
      { order: 4, id: "plan", name_i18n: { pt: "Elaborar plano de tratamento", en: "Develop treatment plan" }, description_i18n: { pt: "Detalhar ações, prazos e responsáveis pela mitigação", en: "Detail actions, deadlines and owners for mitigation" }, type: "manual" as const, role: "risk_manager", timeout_hours: 168, ai_assist: true, ai_prompt_hint: "Usar treatment_examples do risk taxonomy", condition: null, outputs_pt: ["Plano de tratamento"], scf_controls: ["RSK-02"] },
      { order: 5, id: "approve", name_i18n: { pt: "Aprovar plano de tratamento", en: "Approve treatment plan" }, description_i18n: { pt: "Comitê de riscos valida a estratégia e plano", en: "Risk committee validates strategy and plan" }, type: "approval" as const, role: "risk_committee", timeout_hours: 168, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Plano aprovado"], scf_controls: ["RSK-04"] },
      { order: 6, id: "execute", name_i18n: { pt: "Executar tratamento", en: "Execute treatment" }, description_i18n: { pt: "Implementar controles e ações planejadas", en: "Implement planned controls and actions" }, type: "manual" as const, role: "control_owner", timeout_hours: 2160, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Controles implementados"], scf_controls: ["RSK-02"] },
      { order: 7, id: "validate", name_i18n: { pt: "Validar eficácia e reavaliar risco", en: "Validate effectiveness and re-assess risk" }, description_i18n: { pt: "Verificar se risco residual está dentro do apetite", en: "Verify if residual risk is within appetite" }, type: "manual" as const, role: "risk_manager", timeout_hours: 168, ai_assist: true, ai_prompt_hint: "Recalcular score e comparar com appetite", condition: null, outputs_pt: ["Risco residual avaliado"], scf_controls: ["RSK-01"] },
    ],
    escalation_rules: [
      { trigger_i18n: { pt: "Risco critical identificado", en: "Critical risk identified" }, action_i18n: { pt: "Escalar imediatamente ao C-Level", en: "Escalate immediately to C-Level" }, severity: "critical" as const },
      { trigger_i18n: { pt: "Tratamento atrasado", en: "Treatment delayed" }, action_i18n: { pt: "Reportar ao comitê de riscos", en: "Report to risk committee" }, severity: "warning" as const },
    ],
  },
  {
    id: "vendor_review",
    name_i18n: { pt: "Revisão Periódica de Fornecedor", en: "Periodic Vendor Review" },
    module: "risk" as const,
    trigger_i18n: { pt: "Revisão periódica de fornecedor devida (conforme tier)", en: "Periodic vendor review due (per tier)" },
    regulation_id: null, sla_days: null, sla_article: "SCF TPM",
    scf_controls: ["TPM-01", "TPM-04", "TPM-05"],
    steps: [
      { order: 1, id: "notify", name_i18n: { pt: "Gerar notificação de revisão", en: "Generate review notification" }, description_i18n: { pt: "Alertar que revisão periódica é devida", en: "Alert that periodic review is due" }, type: "notification" as const, role: "system", timeout_hours: 1, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Notificação enviada"], scf_controls: ["TPM-04"] },
      { order: 2, id: "send_questionnaire", name_i18n: { pt: "Enviar questionário de avaliação", en: "Send assessment questionnaire" }, description_i18n: { pt: "Solicitar preenchimento de conformidade ao fornecedor", en: "Request compliance completion from vendor" }, type: "automated" as const, role: "system", timeout_hours: 24, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Questionário enviado"], scf_controls: ["TPM-04"] },
      { order: 3, id: "collect_responses", name_i18n: { pt: "Coletar e processar respostas", en: "Collect and process responses" }, description_i18n: { pt: "Receber respostas e calcular score", en: "Receive responses and calculate score" }, type: "manual" as const, role: "vendor_manager", timeout_hours: 336, ai_assist: true, ai_prompt_hint: "Usar scoring engine do TPRA para calcular score", condition: null, outputs_pt: ["Score calculado"], scf_controls: ["TPM-04"] },
      { order: 4, id: "evaluate", name_i18n: { pt: "Avaliar score e determinar risco", en: "Evaluate score and determine risk" }, description_i18n: { pt: "Comparar score com threshold do tier", en: "Compare score with tier threshold" }, type: "automated" as const, role: "system", timeout_hours: 1, ai_assist: true, ai_prompt_hint: "Comparar com vendor_tiers", condition: null, outputs_pt: ["Risk level determinado"], scf_controls: ["TPM-04"] },
      { order: 5, id: "decide", name_i18n: { pt: "Aprovar ou exigir remediação", en: "Approve or require remediation" }, description_i18n: { pt: "Se score abaixo do mínimo, exigir plano de remediação", en: "If score below minimum, require remediation plan" }, type: "decision" as const, role: "risk_manager", timeout_hours: 72, ai_assist: false, ai_prompt_hint: null, condition: "score < tier_minimum", outputs_pt: ["Vendor aprovado ou em remediação"], scf_controls: ["TPM-01"] },
      { order: 6, id: "schedule_next", name_i18n: { pt: "Agendar próxima revisão", en: "Schedule next review" }, description_i18n: { pt: "Definir data da próxima avaliação baseada no tier", en: "Define next assessment date based on tier" }, type: "automated" as const, role: "system", timeout_hours: 1, ai_assist: false, ai_prompt_hint: null, condition: null, outputs_pt: ["Próxima revisão agendada"], scf_controls: ["TPM-04"] },
    ],
    escalation_rules: [
      { trigger_i18n: { pt: "Fornecedor não respondeu ao questionário", en: "Vendor did not respond to questionnaire" }, action_i18n: { pt: "Escalar para gestão de contratos", en: "Escalate to contract management" }, severity: "warning" as const },
      { trigger_i18n: { pt: "Score classificado como critical", en: "Score classified as critical" }, action_i18n: { pt: "Avaliar suspensão do fornecedor", en: "Evaluate vendor suspension" }, severity: "critical" as const },
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
      const locale = (url.searchParams.get("locale") || "pt") as any;
      let filtered = FLOW_TEMPLATES;
      if (module) filtered = filtered.filter(t => t.module === module);
      const summary = flattenI18n(filtered, locale).map((t: any) => ({
        id: t.id, name: t.name, module: t.module, trigger: t.trigger,
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
    handler: async ({ request, params, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") || "pt") as any;
      const template = FLOW_TEMPLATES.find(t => t.id === routeUuidParam(params, "templateId"));
      if (!template) {
        return json({ error: "Template not found", trace_id: traceId }, { status: 404 });
      }
      return json({ data: flattenI18n(template, locale), trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/flow-templates/scf-mapping",
    authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") || "pt") as any;
      return json({ data: flattenI18n(FLOW_TEMPLATES, locale), trace_id: traceId });
    },
  },
];
