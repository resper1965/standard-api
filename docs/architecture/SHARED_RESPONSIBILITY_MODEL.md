# Modelo de Responsabilidade Compartilhada (Shared Responsibility Model)

O Standard é um **Motor GRC Baseado em Agentes (Agentic Assessment Engine)** operando puramente como uma arquitetura API-first. Isso significa que assumimos a responsabilidade pelos fluxos analíticos pesados e pela orquestração dos modelos de IA, mas transferimos a responsabilidade da interação com o usuário, customização de regras de negócio locais e gestão visual para o Desenvolvedor Integrador.

Este documento clarifica os limites arquiteturais. Leia-o atentamente para alinhar as expectativas sobre o que a API do Standard faz de forma autônoma e o que **sua aplicação** deve construir e gerenciar do seu lado.

---

## 1. O que nós FAZEMOS (Responsabilidade do Standard)

### Processamento e Análise (Agentic Engine)
- **Engenharia de RAG e Embeddings**: Ingerimos documentos brutos, quebramos em chunks semânticos e criamos índices vetoriais.
- **Análise Semântica SCF**: Mapeamos a presença e a eficácia de controles de segurança do cliente diretamente para os controles normativos do Secure Controls Framework (SCF).
- **Geração de Evidências**: Justificamos *por que* um controle falhou ou passou com base unicamente nos artefatos providenciados, mantendo rastreabilidade rigorosa de confiança (Confidence Score).
- **Mapeamento de Frameworks Cruzados**: Mapeamos de forma nativa o SCF para outras normativas (ISO 27001, SOC 2, NIST, GDPR) sem alucinações da IA.
- **Isolamento Multi-Tenant Garantido**: Nossas filas, bancos de dados, storages e chaves API já operam com segregação isolada por `organization_id` no nível da infraestrutura.

### Armazenamento de Estado (Lifecycles)
- Mantemos o **Estado do Lifecycle** de um Assessment de ponta a ponta (`draft`, `soa_approved`, `gap_analysis_drafted`, etc.).
- Providenciamos **Versionamento Imutável** dos artefatos: Uma vez aprovado (Approved), qualquer reprocessamento gera uma v2, mantendo histórico legal intacto.

---

## 2. O que nós NÃO FAZEMOS (Responsabilidade da Sua Aplicação)

Se você é o desenvolvedor consumindo nossa API para criar um portal GRC, uma ferramenta de Privacy ou um ERP, **não espere as seguintes funcionalidades da nossa API**:

### 1. Interface Gráfica, Formulários e Experiência do Usuário (UI/UX)
- **A Interface de Auditoria**: Nós não provemos dashboards ou telas. É sua responsabilidade renderizar o Statement of Applicability (SoA), Gap Analysis e o POA&M de forma que seu usuário consiga ler e editar.
- **Telas de Upload**: O frontend para arrastar documentos é problema seu. Nossa API aceita payloads multiformato.

### 2. Tratativas Human-in-the-Loop Interativas
- Nós retornamos os itens `requires_user_validation = true` e o `rationale` do agente.
- **Sua aplicação** deve pegar esses dados, exibir um alerta para o humano (o auditor), capturar o input humano ("Aprovar/Rejeitar") e submeter o payload final de aprovação para a nossa API. Nós não coletamos a aprovação do usuário de forma autônoma.

### 3. Matrizes de Risco Personalizadas e Scoring Customizado
- Nossa API foca em maturidade (CMMI, de 0 a 5).
- Se o seu GRC necessita de uma **Matriz de Risco (Impacto x Probabilidade = Alto/Médio/Baixo)** específica para uma ISO local ou métrica corporativa, você deve calcular isso **no seu backend** utilizando os inputs (severidade, prioridade, scores) entregues pelo Standard.

### 4. Gatilhos de Notificação (Alertas e E-mails)
- Não disparamos e-mails avisando que "O POA&M está atrasado" ou "Sua exceção de risco vai expirar amanhã".
- A API do Standard entrega a data (`due_date`, `risk_acceptance_expires_at`). Sua aplicação (via Cron, Background Jobs ou Celery) deve consultar a API periodicamente e mandar os e-mails para seus usuários.

### 5. Gestão de Planos de Ação (Tarefas e Ticketing)
- O POA&M que geramos é o registro formal de conformidade para auditoria.
- Se você precisa integrar isso com Jira, ServiceNow ou criar um sistema de "To-Do" ágil com sub-tarefas no seu frontend, a ponte entre o ticket do Jira e o `poam_item_id` deve ser feita **no seu sistema**.

### 6. Políticas de Retenção de Dados Específicas do Cliente
- Caso o seu cliente final demande que todas as evidências (PDFs, Logs) sejam fisicamente deletadas após 1 ano por conta de GDPR, a sua aplicação deve invocar a deleção na nossa API de forma orquestrada. Nós retemos ou expiramos com base no Lifecycle padrão do framework.

---

> [!IMPORTANT]
> **Resumo para Integrações de Software:** Pense no Standard como um motor de busca semântico avançado misturado com um validador legal. Nós calculamos o resultado, provamos matematicamente, evitamos alucinações da IA e garantimos o estado seguro. Todo o engajamento de usuários, regras de negócio locais, lógicas de ticketing e visualizações customizadas residem na fronteira do **seu sistema**.
