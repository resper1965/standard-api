# Contrato de Processamento de Dados (DPA)
## Data Processing Agreement — Standard Platform

**Versão:** 1.0 (Rascunho)
**Última atualização:** 2026-05-25

> **RASCUNHO — TEMPLATE** — Este documento é um modelo e requer revisão e customização jurídica antes de qualquer uso. Não constitui aconselhamento jurídico. Substitua todos os campos marcados com `[PREENCHER]` antes de assinar.

---

## PARTES

**CONTROLADOR:**
- Razão Social: `[PREENCHER — Nome da empresa cliente]`
- CNPJ: `[PREENCHER]`
- Endereço: `[PREENCHER]`
- Representante Legal: `[PREENCHER — nome, cargo]`
- E-mail de contato DPO/privacidade: `[PREENCHER]`
("**Cliente**" ou "**Controlador**")

**OPERADORA:**
- Razão Social: **Bekaa**
- CNPJ: 00.000.000/0001-00 (fictício)
- Endereço: `[PREENCHER]`
- Representante Legal: `[PREENCHER]`
- E-mail DPO/privacidade: **privacy@bekaa.eu**
("**Bekaa**" ou "**Operadora**")

---

## CONSIDERANDOS

**CONSIDERANDO QUE:**

(a) O Cliente contratou os serviços da Plataforma Standard, conforme Termos de Serviço e contrato de serviço aplicável;

(b) Para a prestação dos serviços, a Bekaa realiza o processamento de dados pessoais em nome e por instrução do Cliente;

(c) A LGPD (Lei nº 13.709/2018) impõe obrigações às partes em relação ao processamento de dados pessoais;

As partes celebram o presente **Contrato de Processamento de Dados (DPA)**, que complementa e integra o contrato de serviço principal.

---

## 1. Definições

Para os fins deste DPA, aplicam-se as definições da LGPD (art. 5º) e as seguintes:

| Termo | Definição |
|---|---|
| **Dados Pessoais** | Informação relacionada a pessoa natural identificada ou identificável (art. 5º, I, LGPD) |
| **Controlador** | O Cliente, que toma as decisões sobre o tratamento de dados pessoais (art. 5º, VI, LGPD) |
| **Operadora** | A Bekaa, que realiza o tratamento de dados pessoais em nome do Controlador (art. 5º, VII, LGPD) |
| **Tratamento** | Toda operação realizada com dados pessoais (coleta, uso, armazenamento, transmissão, eliminação etc.) (art. 5º, X, LGPD) |
| **Incidente de Segurança** | Acesso não autorizado, destruição, perda, alteração ou divulgação não intencional de dados pessoais |
| **Sub-processador** | Terceiro autorizado pela Bekaa para processar dados pessoais em nome do Controlador |
| **Plataforma Standard** | Serviço SaaS de assessments de segurança e conformidade operado pela Bekaa |
| **Titular** | Pessoa natural a quem se referem os dados pessoais tratados |

---

## 2. Objeto

**2.1.** A Bekaa, na qualidade de Operadora, processará dados pessoais em nome e por instrução do Cliente, na qualidade de Controlador, exclusivamente para operar e prestar os serviços da **Plataforma Standard**, conforme descrito neste DPA.

**2.2.** O processamento de dados pessoais pela Bekaa está limitado ao necessário para a prestação dos serviços contratados (*princípio da minimização*) e ocorre sempre em conformidade com as instruções documentadas do Controlador.

---

## 3. Categorias de Dados Pessoais Processados

A Bekaa processa as seguintes categorias de dados pessoais de usuários da Plataforma em nome do Controlador:

### 3.1 Dados de Usuários da Plataforma (Conta)

| Dado | Finalidade do Processamento |
|---|---|
| Nome completo | Identificação do usuário, audit trail |
| Endereço de e-mail | Autenticação, notificações, comunicações do serviço |
| Cargo / função | Controle de acesso baseado em papel (RBAC) |
| Número de telefone | Verificação de identidade (MFA) — quando fornecido |
| Identificador de organization | Isolamento multi-organization, associação de dados ao Controlador |
| Logs de ações do usuário | Auditoria, rastreabilidade, segurança |

### 3.2 Dados em Documentos de Assessments (Incidental)

Os documentos e evidências enviados pelo Controlador à Plataforma podem conter, incidentalmente, dados pessoais de colaboradores, parceiros ou terceiros do Controlador. O processamento desses dados segue as instruções do Controlador e está limitado às operações necessárias para a análise de assessments (armazenamento, indexação, recuperação semântica, análise por modelos de IA).

**Responsabilidade:** O Controlador é responsável por garantir a base legal adequada para o processamento desses dados pessoais incidentais.

### 3.3 Dados Fora do Escopo

Este DPA **não cobre**:
- Dados pessoais coletados diretamente pela Bekaa para suas próprias finalidades (cobertos pela Política de Privacidade da Bekaa);
- Dados pessoais de consumidores finais das organizações do Controlador, salvo se expressamente incluídos em escopo por aditivo.

---

## 4. Finalidades do Processamento

O processamento de dados pessoais pela Bekaa se limita às seguintes finalidades, sempre em nome do Controlador:

1. **Autenticação e controle de acesso:** gerenciar identidades de usuários, sessões e permissões RBAC;
2. **Prestação do serviço de assessment:** armazenar, indexar e processar documentos e evidências para condução de assessments SCF;
3. **Análise por IA:** submeter conteúdo de documentos a modelos de linguagem (via sub-processadores) para análise de controles, gaps e maturidade;
4. **Audit trail:** registrar ações críticas de usuários para fins de rastreabilidade e conformidade do Controlador;
5. **Suporte técnico:** acessar dados com autorização explícita do Controlador para diagnóstico de problemas;
6. **Segurança:** detectar e responder a ameaças, acessos não autorizados e incidentes.

---

## 5. Obrigações da Bekaa como Operadora

### 5.1 Instrução do Controlador

A Bekaa tratará os dados pessoais somente conforme as instruções documentadas do Controlador (incluindo este DPA e o contrato de serviço) e informará o Controlador se entender que uma instrução viola a LGPD ou legislação aplicável.

### 5.2 Confidencialidade

A Bekaa garantirá que as pessoas autorizadas a tratar os dados pessoais estejam sujeitas a obrigações de confidencialidade, seja por contrato ou por lei.

### 5.3 Segurança

A Bekaa implementará e manterá medidas técnicas e organizacionais adequadas para proteger os dados pessoais contra acesso não autorizado, destruição, perda ou alteração, incluindo:

- Criptografia em trânsito (TLS 1.2+) e em repouso;
- Controle de acesso com menor privilégio e RBAC;
- Isolamento de dados por organization (`organization_id`);
- Monitoramento contínuo e detecção de anomalias;
- Gestão segura de credenciais e secrets;
- Testes regulares de segurança.

### 5.4 Sub-processadores

A Bekaa poderá contratar sub-processadores para auxiliar na prestação dos serviços, conforme listado na Seção 6. A Bekaa:

- Informará o Controlador sobre adições ou substituições de sub-processadores com **30 dias de antecedência**;
- Imporá obrigações de proteção de dados equivalentes às deste DPA aos sub-processadores;
- Permanecerá responsável perante o Controlador pelos atos dos sub-processadores.

### 5.5 Assistência ao Controlador

A Bekaa assistirá o Controlador, na medida do razoável e tecnicamente viável, para:

- Atender solicitações dos titulares de dados (acesso, retificação, exclusão, portabilidade);
- Realizar Relatórios de Impacto à Proteção de Dados (RIPD) quando solicitado;
- Cumprir obrigações de segurança, notificação de incidentes e avaliações de impacto.

### 5.6 Devolução e Exclusão de Dados

Ao término do contrato de serviço, a Bekaa, a critério do Controlador:

- Devolverá os dados pessoais em formato exportável (JSON ou CSV) em até **30 dias**; e/ou
- Excluirá de forma segura todos os dados pessoais (incluindo cópias de backup) em até **30 dias** após a exportação ou solicitação de exclusão, salvo obrigação legal de retenção.

Confirmará a exclusão por escrito quando solicitado.

---

## 6. Sub-processadores Autorizados

O Controlador autoriza o uso dos seguintes sub-processadores para a operação da Plataforma Standard:

| Sub-processador | Finalidade | País / Região | Salvaguarda |
|---|---|---|---|
| **Cloudflare, Inc.** | Infraestrutura edge (Workers, R2, Vectorize, AI Gateway, CDN, KV, D1) | EUA / UE (múltiplas regiões) | SCCs / DPA Cloudflare |
| **Neon, Inc.** | Banco de dados PostgreSQL gerenciado (metadados, organizations, assessments) | EUA (AWS us-east-1) / UE (opcional) | SCCs / DPA Neon |
| **OpenAI, LLC** | Modelos de linguagem para análise de assessments (via Cloudflare AI Gateway) | EUA | SCCs / DPA OpenAI |
| **Google LLC (Google DeepMind / Gemini)** | Modelos de linguagem para análise de assessments (via Cloudflare AI Gateway) | EUA / múltiplas regiões | SCCs / DPA Google |

**Nota:** Todas as chamadas a modelos de IA (OpenAI e Google) são roteadas via **Cloudflare AI Gateway**, que atua como proxy de observabilidade e controle, minimizando a exposição direta de dados a esses provedores.

A Bekaa manterá uma lista atualizada de sub-processadores disponível para consulta mediante solicitação a privacy@bekaa.eu.

---

## 7. Obrigações do Cliente como Controlador

O Controlador se compromete a:

**7.1.** Garantir que possui base legal válida sob a LGPD para os dados pessoais que insere na Plataforma;

**7.2.** Informar os titulares sobre o processamento de seus dados pessoais, incluindo o uso da Plataforma Standard;

**7.3.** Fornecer à Bekaa apenas dados pessoais necessários para a prestação do serviço (*minimização*);

**7.4.** Notificar a Bekaa sobre qualquer solicitação de titular que exija ação da Bekaa como operadora;

**7.5.** Garantir que usuários da Plataforma (colaboradores, consultores) estejam cientes e autorizados a usar o Serviço;

**7.6.** Não inserir dados pessoais sensíveis (saúde, biometria, orientação sexual, dados financeiros de pessoas físicas) sem verificar a adequação das salvaguardas e obter consentimento específico dos titulares;

**7.7.** Cumprir suas próprias obrigações como controlador sob a LGPD, GDPR (se aplicável) e demais legislações pertinentes.

---

## 8. Transferências Internacionais de Dados

**8.1.** O processamento de dados pessoais pode envolver transferência internacional, dado que a infraestrutura da Bekaa opera em data centers nos EUA e UE (via Cloudflare e Neon).

**8.2.** As transferências internacionais são realizadas com base em:

- **Cláusulas Contratuais Padrão (SCCs)** aprovadas pela Comissão Europeia, adotadas por analogia conforme orientação da ANPD para a LGPD;
- **Garantias contratuais** impostas a sub-processadores que exijam nível de proteção equivalente ao da LGPD;
- **Decisão de adequação** da ANPD, quando disponível para o país destinatário.

**8.3.** O Controlador, ao assinar este DPA, autoriza as transferências internacionais descritas neste documento, desde que realizadas com as salvaguardas aqui estabelecidas.

---

## 9. Incidentes de Segurança

**9.1.** A Bekaa notificará o Controlador sobre qualquer incidente de segurança que afete dados pessoais processados em nome do Controlador no prazo de **72 horas** após tomar ciência do incidente.

**9.2.** A notificação incluirá, na medida do possível:

- Natureza do incidente e categorias de dados afetados;
- Estimativa do número de titulares e registros afetados;
- Consequências prováveis do incidente;
- Medidas adotadas ou propostas para remediar o incidente.

**9.3.** O Controlador é responsável por notificar a **ANPD** e os titulares afetados conforme a LGPD (art. 48), com base nas informações fornecidas pela Bekaa.

**9.4.** A Bekaa cooperará com o Controlador na investigação e remediação do incidente.

---

## 10. Auditoria

**10.1.** O Controlador tem o direito de realizar auditorias ou inspeções para verificar a conformidade da Bekaa com este DPA, mediante notificação prévia de **30 dias corridos**.

**10.2.** As auditorias poderão ser conduzidas pelo Controlador ou por auditor terceiro independente e qualificado, sujeito a NDA (acordo de confidencialidade).

**10.3.** A Bekaa cooperará razoavelmente com as auditorias, fornecendo documentação, registros e acesso às instalações ou sistemas relevantes.

**10.4.** Os custos da auditoria são de responsabilidade do Controlador, salvo se a auditoria revelar não conformidade material da Bekaa, hipótese em que os custos serão negociados entre as partes.

**10.5.** A Bekaa poderá satisfazer solicitações de auditoria fornecendo relatórios de certificações de segurança vigentes (ISO/IEC 27001, SOC 2 Tipo II, ou equivalentes) em substituição a inspeções in loco, a critério da Bekaa.

---

## 11. Duração

**11.1.** Este DPA vigora enquanto o contrato de serviço principal entre as partes estiver em vigor.

**11.2.** As obrigações de confidencialidade e as disposições sobre exclusão de dados sobrevivem ao término deste DPA pelo prazo necessário ao cumprimento integral de tais obrigações.

---

## 12. Responsabilidade

**12.1.** A responsabilidade das partes sob este DPA é regida pelas disposições de limitação de responsabilidade dos Termos de Serviço e do contrato de serviço principal.

**12.2.** Em caso de violação deste DPA pela Bekaa, o Controlador poderá buscar reparação nos termos da LGPD e do contrato principal.

---

## 13. Disposições Gerais

**13.1. Lei aplicável:** Este DPA é regido pela legislação brasileira, em especial a LGPD (Lei nº 13.709/2018).

**13.2. Foro:** Comarca de São Paulo/SP.

**13.3. Integração:** Este DPA complementa e integra o contrato de serviço principal. Em caso de conflito, prevalece o DPA para matérias de proteção de dados.

**13.4. Independência:** Se qualquer disposição deste DPA for inválida, as demais continuarão em pleno vigor.

**13.5. Alterações:** Alterações a este DPA devem ser feitas por escrito e assinadas por representantes autorizados de ambas as partes.

---

## 14. Assinaturas

As partes, por seus representantes legais devidamente habilitados, firmam o presente DPA:

---

**CONTROLADOR**

Razão Social: `[PREENCHER]`

Nome do representante: `_______________________________`

Cargo: `_______________________________`

Assinatura: `_______________________________`

Data: `_____ / _____ / _______`

---

**OPERADORA — Bekaa**

Nome do representante: `_______________________________`

Cargo: `_______________________________`

Assinatura: `_______________________________`

Data: `_____ / _____ / _______`

---

**TESTEMUNHAS (opcional):**

1. Nome: `_______________________________` CPF: `_______________`
2. Nome: `_______________________________` CPF: `_______________`

---

*Documento elaborado em conformidade com a LGPD (Lei nº 13.709/2018), com referências às melhores práticas do GDPR (Regulamento UE 2016/679) e guidelines da ANPD.*
