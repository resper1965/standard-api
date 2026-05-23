# Standard API — Cookbooks de Produto

O que a plataforma entrega como capacidades para um cliente (humano ou IA) que consome a API.

---

## 🔴 Cookbook 1: Gap Analysis Instantâneo

**Problema:** "Tenho documentos de segurança/conformidade e preciso saber onde estou em relação a um standard."

**Fluxo do cliente:**
```
1. Upload dos documentos (políticas, controles, evidências)
2. Escolha do framework (ISO 27001, NIST CSF, SOC 2, PCI-DSS, LGPD...)
3. → Sistema ingere, extrai, classifica
4. → Retorna: para cada controle do framework escolhido:
   - ✅ Atendido (com evidência citada)
   - ⚠️ Parcialmente atendido (gaps específicos)
   - ❌ Não atendido
   - 🔍 Sem evidência encontrada
5. Relatório exportável com findings, gaps e recomendações
```

**Valor:** Em horas, não semanas. O que uma consultoria cobra R$50-150k e leva 4-8 semanas, entregue em minutos com rastreabilidade de evidência.

**Saída:** Gap Analysis Report com `finding_id`, `control_id`, `status`, `evidence_refs[]`, `recommendation`

---

## 🟡 Cookbook 2: Roadmap de Adequação a Standards

**Problema:** "Já sei meus gaps. Preciso de um plano de ação priorizado para fechar."

**Fluxo do cliente:**
```
1. Parte do Gap Analysis aprovado (Cookbook 1)
2. → Sistema classifica maturidade por controle (CMMI 0-5)
3. → Gera POA&M (Plan of Action & Milestones):
   - Ações concretas por gap
   - Prioridade (risco × esforço × impacto)
   - Timeline sugerida
   - Responsáveis sugeridos por domínio
   - Dependências entre ações
4. Dashboard de progresso conforme evidências são adicionadas
```

**Valor:** Transforma "lista de problemas" em "projeto executável". CISOs apresentam para board com cronograma e budget.

**Saída:** POA&M com `action_items[]`, `priority`, `estimated_effort`, `dependencies[]`, `milestone_dates`

---

## 🟢 Cookbook 3: Maturidade Contínua (Assessment Recorrente)

**Problema:** "Não quero um assessment pontual. Quero monitorar minha maturidade ao longo do tempo."

**Fluxo do cliente:**
```
1. Assessment inicial (Cookbooks 1+2)
2. Periodicamente:
   - Upload de novos documentos/evidências
   - Re-análise automática
   - Delta report: "o que mudou desde o último assessment"
3. Score de maturidade trackado ao longo do tempo
4. Alertas: "controle X regrediu", "novo gap detectado"
```

**Valor:** Compliance não como evento anual, mas como postura contínua. Board vê evolução trimestral.

**Saída:** Trend dashboard, delta reports, maturity score timeline por domínio

---

## 🔵 Cookbook 4: Multi-Framework Crosswalk

**Problema:** "Estou em conformidade com ISO 27001, mas agora preciso de SOC 2 também. Quanto já tenho coberto?"

**Fluxo do cliente:**
```
1. Assessment existente em Framework A (ex: ISO 27001)
2. Escolhe Framework B (ex: SOC 2 Type II)
3. → Sistema usa SCF como "lingua franca":
   - Controles ISO 27001 → SCF → SOC 2
   - Identifica cobertura automática (controles já atendidos)
   - Identifica gaps incrementais (só o que falta)
4. POA&M incremental (só o delta)
```

**Valor:** Reduz custo de adequação multi-framework em 60-80%. O SCF mapeia 170+ frameworks — o que o cliente já atende em um, transfere para outros.

**Saída:** Crosswalk matrix, cobertura %, gap incremental, POA&M delta

---

## 🟣 Cookbook 5: Preparação para Auditoria

**Problema:** "Auditoria externa em 60 dias. Preciso saber se passo e o que falta."

**Fluxo do cliente:**
```
1. Seleciona framework da auditoria + escopo
2. Upload de toda documentação disponível
3. → Sistema simula o olhar do auditor:
   - Verifica completude documental
   - Checa evidências por controle
   - Identifica controles sem evidência
   - Gera lista de "pedidos prováveis do auditor"
4. Checklist de readiness com % de cobertura
5. Gera artefatos faltantes (templates de políticas, procedimentos)
```

**Valor:** "Vai passar ou não?" respondido com confiança. Zero surpresas na auditoria.

**Saída:** Audit readiness score, missing evidence list, document templates, auditor Q&A prep

---

## 🟤 Cookbook 6: Intelligence Report para C-Level

**Problema:** "Preciso apresentar postura de segurança para o board em 30 slides."

**Fluxo do cliente:**
```
1. Parte de qualquer assessment existente
2. → Sistema gera:
   - Executive Summary (1 página)
   - Risk heatmap por domínio
   - Maturity radar chart
   - Top 10 riscos com impacto financeiro estimado
   - Trend vs assessment anterior
   - Investment recommendations priorizadas
3. Formato: PDF/apresentação, linguagem de negócio (não técnica)
```

**Valor:** CISOs gastam 2-3 semanas montando board decks. Isso vira automático.

**Saída:** Executive report, risk heatmap, maturity radar, investment roadmap

---

## ⚫ Cookbook 7: Vendor/Third-Party Risk Assessment

**Problema:** "Preciso avaliar risco de 50 fornecedores. Cada um demora 2 semanas."

**Fluxo do cliente:**
```
1. Upload de questionários/documentação do vendor
2. Seleciona critérios de avaliação (baseados no framework da empresa)
3. → Sistema avalia cada vendor contra os controles relevantes
4. → Score de risco por vendor
5. → Ranking comparativo
6. → Gaps críticos por vendor + recomendações
```

**Valor:** 50 vendors em dias, não meses. Due diligence escalável.

**Saída:** Vendor risk scorecard, comparative ranking, critical gaps per vendor

---

## 🔶 Cookbook 8: ROPA — Registro de Atividades de Tratamento

**Problema:** "Preciso gerar e manter meu ROPA (Art. 37 LGPD / Art. 30 GDPR) e não sei por onde começar."

**Fluxo do cliente:**
```
1. Upload de documentos: políticas de privacidade, contratos de DPA,
   mapeamento de sistemas, questionários respondidos
2. → Sistema extrai automaticamente:
   - Atividades de tratamento identificadas
   - Dados pessoais envolvidos (categorias)
   - Base legal por atividade
   - Finalidade do tratamento
   - Compartilhamentos e transferências internacionais
   - Período de retenção
   - Medidas de segurança aplicadas
3. → Gera ROPA estruturado (formato ANPD / EDPB)
4. → Identifica gaps: atividades sem base legal, sem retenção definida, etc.
5. → Versionamento: novo upload = delta report do ROPA
```

**Valor:** DPOs gastam meses montando ROPA manualmente. Com documentos existentes, o sistema gera draft em minutos. Auditável e versionado.

**Saída:** ROPA estruturado com `processing_activity_id`, `data_categories[]`, `legal_basis`, `retention_period`, `security_measures[]`, `gaps[]`

---

## 🔷 Cookbook 9: DPIA — Avaliação de Impacto à Proteção de Dados

**Problema:** "Preciso avaliar o impacto de um novo projeto/sistema sobre dados pessoais antes de lançar."

**Fluxo do cliente:**
```
1. Descrição do projeto/sistema (texto livre ou formulário guiado)
2. Upload de documentação técnica e funcional
3. → Sistema avalia:
   - Necessidade e proporcionalidade do tratamento
   - Riscos aos titulares (scoring por categoria de risco)
   - Medidas mitigatórias existentes vs recomendadas
   - Parecer de necessidade de consulta à ANPD/DPA
4. → Gera relatório DPIA (formato ANPD / ICO / CNIL)
5. → POA&M específico para riscos residuais
6. → Registro para accountability (Art. 38 LGPD / Art. 35 GDPR)
```

**Valor:** Obrigatório para tratamentos de alto risco. Consultorias cobram R$30-80k por DPIA. O sistema gera draft fundamentado em evidências.

**Saída:** DPIA report com `risk_assessment[]`, `mitigation_measures[]`, `residual_risk_score`, `dpa_consultation_needed`, `poam_items[]`

---

## 🟠 Cookbook 10: Privacy Program Assessment (LGPD/GDPR)

**Problema:** "Quero saber o nível de maturidade do meu programa de privacidade como um todo."

**Fluxo do cliente:**
```
1. Seleciona framework de privacidade:
   - LGPD (Lei 13.709)
   - GDPR
   - ISO 27701
   - NIST Privacy Framework
   - SCF Privacy Controls
2. Upload de toda documentação de privacidade
3. → Sistema avalia por domínio:
   - Governança de privacidade
   - Direitos dos titulares
   - Gestão de consentimento
   - Transferência internacional
   - Incidentes e notificação
   - Privacy by Design
   - Contratos e terceiros
4. → Maturity score por domínio (0-5)
5. → Gap Analysis específico de privacidade
6. → POA&M para programa de privacidade
```

**Valor:** Visão 360° do programa de privacidade. O SCF já mapeia controles de privacidade para LGPD, GDPR, ISO 27701 e NIST PF — o crosswalk é automático.

**Saída:** Privacy maturity radar, domain scores, gap analysis, POA&M, regulatory mapping

---

## Modelo de Consumo

Todos os cookbooks acima são consumíveis de **3 formas**:

| Canal | Como |
|---|---|
| **API REST** | Integração direta, automação, pipelines |
| **Web App** | Interface visual para analistas e gestores |
| **MCP Server** | Agentes de IA consomem via Model Context Protocol — um Claude/GPT pode executar assessments autonomamente |

O MCP Server é o diferencial competitivo: **nenhuma plataforma GRC hoje oferece assessment agentic-native**.

---

## Priorização Sugerida

| # | Cookbook | Complexidade | Valor de Mercado | Status |
|---|---|---|---|---|
| 1 | Gap Analysis | 🟡 Média | 🔴 Altíssimo | **~80% implementado** |
| 2 | Roadmap/POA&M | 🟡 Média | 🔴 Alto | **~70% implementado** |
| 3 | Maturidade Contínua | 🟡 Média | 🟡 Alto | **Sprint atual** |
| 4 | Multi-Framework Crosswalk | 🟢 Baixa* | 🔴 Altíssimo | SCF core pronto |
| 5 | Prep Auditoria | 🟡 Média | 🔴 Alto | Derivado de 1+2 |
| 6 | C-Level Report | 🟢 Baixa | 🟡 Médio | Report writer existe |
| 7 | Vendor Risk | 🔴 Alta | 🟡 Médio | Futuro |
| 8 | **ROPA** | 🟡 Média | 🔴 **Altíssimo** | Derivado do engine + extração |
| 9 | **DPIA** | 🟡 Média | 🔴 **Alto** | Derivado de Gap + Risk scoring |
| 10 | **Privacy Program** | 🟢 Baixa* | 🔴 **Altíssimo** | SCF privacy controls prontos |

*Privacy Program usa o mesmo engine de Gap/Maturity, apenas com framework de privacidade selecionado. Crosswalk SCF já mapeia LGPD↔GDPR↔ISO 27701↔NIST PF.

---

> **Bottom line:** O Standard não é "mais um GRC tool". É o primeiro **motor de assessment SCF-native que fala MCP** — qualquer IA pode ser um analista de compliance e privacidade.
