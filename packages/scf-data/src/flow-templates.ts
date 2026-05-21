/**
 * Flow Templates — Process Automation Templates (Spec v3)
 */

export const FLOW_TEMPLATES = [
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
];
