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

*Crosswalk usa SCF que já é a base — a complexidade real é baixa porque o mapping existe.

---

> **Bottom line:** O Standard não é "mais um GRC tool". É o primeiro **motor de assessment SCF-native que fala MCP** — qualquer IA pode ser um analista de compliance.
