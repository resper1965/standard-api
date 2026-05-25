# Política de Privacidade — Standard Platform

**Empresa:** Bekaa (CNPJ: 00.000.000/0001-00 — fictício)
**Última atualização:** 2026-05-25
**Contato de privacidade:** privacy@bekaa.eu

> **RASCUNHO** — Este documento requer revisão jurídica antes de qualquer publicação. Não constitui aconselhamento jurídico.

---

## 1. Quem Somos

A **Bekaa** é a empresa responsável pelo desenvolvimento e operação da plataforma **Standard**, um serviço SaaS API-first destinado à condução de assessments de segurança, conformidade e maturidade organizacional com base no *Secure Controls Framework* (SCF).

A Bekaa atua como **operadora de dados** em relação aos dados pessoais de usuários que seus clientes (as organizações contratantes) inserem na plataforma. Para os dados de conta dos próprios usuários da plataforma, a Bekaa atua como **controladora**.

Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos seus dados pessoais, em conformidade com a **Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)** e demais legislações aplicáveis.

---

## 2. Dados que Coletamos

### 2.1 Dados de Conta (Controladora: Bekaa)

Quando um usuário é cadastrado na plataforma Standard, coletamos:

| Campo | Finalidade | Base Legal LGPD |
|---|---|---|
| Nome completo | Identificação do usuário e personalização | Execução de contrato (art. 7º, V) |
| Endereço de e-mail | Autenticação, comunicação, notificações | Execução de contrato (art. 7º, V) |
| Cargo / função | Controle de acesso baseado em papel (RBAC) | Legítimo interesse (art. 7º, IX) |
| Número de telefone | Verificação de identidade (MFA), suporte | Consentimento (art. 7º, I) — coletado opcionalmente |
| Identificador de tenant/organização | Isolamento multi-tenant, auditoria | Execução de contrato (art. 7º, V) |

### 2.2 Dados de Uso e Logs (Controladora: Bekaa)

Durante o uso da plataforma, coletamos automaticamente:

| Dado | Finalidade | Base Legal LGPD |
|---|---|---|
| Logs de acesso (IP, timestamp, endpoint) | Segurança, detecção de anomalias, auditoria | Legítimo interesse (art. 7º, IX) |
| Audit trail de ações (criação, aprovação, exportação) | Rastreabilidade e conformidade | Execução de contrato / obrigação legal (art. 7º, V e II) |
| Métricas de uso (features utilizadas, volume de assessments) | Melhoria contínua do serviço | Legítimo interesse (art. 7º, IX) |
| Tokens de sessão e dados de autenticação | Segurança e controle de acesso | Execução de contrato (art. 7º, V) |

### 2.3 Dados de Assessments e Documentos do Cliente (Operadora: Bekaa)

Os documentos enviados pelo cliente para a plataforma (políticas, evidências, controles, relatórios internos) são **dados de negócio do cliente** e podem, incidentalmente, conter informações pessoais de terceiros (colaboradores, parceiros). Nesses casos:

- O **cliente é o controlador** de quaisquer dados pessoais contidos nesses documentos.
- A **Bekaa atua exclusivamente como operadora**, processando esses dados conforme as instruções do cliente e nos termos do **DPA (Data Processing Agreement)** disponível em `docs/legal/dpa-template.md`.
- Os documentos são armazenados em **storage isolado por tenant** (Cloudflare R2) e não são acessados pela Bekaa exceto para fins operacionais necessários (suporte técnico com autorização explícita, ou cumprimento de obrigação legal).
- O processamento por **modelos de IA** (OpenAI, Google Gemini) ocorre via **Cloudflare AI Gateway**, com observabilidade e controle de chamadas.

**Aviso importante:** A plataforma Standard não é projetada para armazenar dados pessoais sensíveis de consumidores finais (saúde, biometria, dados financeiros de pessoas físicas). Caso o cliente insira tais dados, é de sua responsabilidade garantir a base legal adequada.

---

## 3. Como Usamos os Dados

Usamos os dados coletados para as seguintes finalidades:

1. **Prestação do serviço:** autenticação, autorização, execução de assessments SCF, geração de relatórios, armazenamento de evidências.
2. **Segurança e integridade:** detecção de acessos não autorizados, monitoramento de anomalias, prevenção de fraudes.
3. **Auditoria e rastreabilidade:** manutenção de audit trail de ações críticas para fins de conformidade do cliente.
4. **Suporte técnico:** diagnóstico de problemas, com acesso a logs controlado e registrado.
5. **Melhoria contínua:** análise de métricas de uso agregadas e anonimizadas para evolução da plataforma.
6. **Comunicações:** notificações sobre o serviço, atualizações de segurança, alterações nos termos — sempre relacionadas à relação contratual.

Não utilizamos dados pessoais para publicidade de terceiros, não vendemos dados, e não realizamos perfilamento automatizado com efeitos jurídicos sobre os titulares.

---

## 4. Retenção de Dados

A retenção obedece à política completa descrita em [`data-retention-policy.md`](./data-retention-policy.md) (a ser criado). Os prazos mínimos são:

| Categoria | Prazo de Retenção |
|---|---|
| Dados de conta (usuário ativo) | Enquanto durar a conta |
| Dados de conta (após encerramento) | 30 dias para devolução/exclusão; logs por até 3 anos |
| Logs de acesso e auditoria | 3 anos (obrigação legal e contratual) |
| Métricas de uso agregadas | 90 dias para dados brutos; indefinido para dados agregados anonimizados |
| Documentos do cliente (assessments) | Conforme contrato de serviço; padrão: 30 dias após encerramento |
| Tokens de sessão | Expiração automática (configurável por tenant) |

Após os prazos, os dados são excluídos de forma segura ou anonimizados irreversivelmente.

---

## 5. Direitos do Titular

Em conformidade com os arts. 17 a 22 da LGPD, os titulares de dados têm os seguintes direitos:

| Direito | Como Exercer |
|---|---|
| **Acesso** — saber quais dados temos | `GET /api/v1/me/data-export` |
| **Exportação / Portabilidade** | `GET /api/v1/me/data-export` (formato JSON) |
| **Retificação** — corrigir dados incorretos | Painel do usuário ou `PATCH /api/v1/me` |
| **Exclusão** — solicitar apagamento | `DELETE /api/v1/me/account` (dados de conta) |
| **Oposição** — opor-se a tratamento por legítimo interesse | privacy@bekaa.eu |
| **Informação sobre compartilhamento** | privacy@bekaa.eu |
| **Revogação de consentimento** | Painel do usuário ou privacy@bekaa.eu |

Solicitações por e-mail serão respondidas em até **15 dias úteis**. Para solicitações via API, a resposta é imediata (sujeita a autenticação).

**Atenção:** Dados contidos em documentos de assessments (de responsabilidade do cliente como controlador) devem ser requisitados diretamente ao cliente/organização contratante.

---

## 6. Compartilhamento e Transferência Internacional de Dados

### 6.1 Sub-processadores

A Bekaa utiliza os seguintes sub-processadores para operar a plataforma Standard:

| Sub-processador | Finalidade | Localização |
|---|---|---|
| **Cloudflare** | Infraestrutura (Workers, R2, Vectorize, AI Gateway, CDN) | EUA / UE |
| **Neon** | Banco de dados PostgreSQL gerenciado | EUA (AWS us-east-1 / UE) |
| **OpenAI** | Modelos de IA para análise de assessments (via AI Gateway) | EUA |
| **Google (Gemini)** | Modelos de IA para análise de assessments (via AI Gateway) | EUA / múltiplas regiões |

### 6.2 Transferências Internacionais

A infraestrutura da Bekaa opera predominantemente em data centers nos **Estados Unidos e União Europeia** por meio do Cloudflare e Neon. As transferências internacionais são realizadas com base em:

- **Cláusulas Contratuais Padrão (SCCs)** aprovadas pela Comissão Europeia (aplicáveis por analogia à LGPD conforme orientação da ANPD);
- **Decisão de adequação** quando disponível (ex.: Reino Unido, Suíça);
- **Garantias de segurança adequadas** exigidas contratualmente dos sub-processadores.

Não transferimos dados para países sem nível adequado de proteção sem mecanismo de salvaguarda.

---

## 7. Segurança dos Dados

A Bekaa adota medidas técnicas e organizacionais para proteger os dados pessoais, incluindo:

- Criptografia em trânsito (TLS 1.2+) e em repouso;
- Controle de acesso baseado em papéis (RBAC) e isolamento por tenant;
- Audit trail completo de ações críticas;
- Gerenciamento de secrets via variáveis seguras (sem armazenamento em código);
- Revisões periódicas de segurança e monitoramento contínuo;
- Política de retenção e exclusão segura de dados.

Em caso de incidente de segurança que afete dados pessoais, notificaremos os clientes afetados e a **ANPD (Autoridade Nacional de Proteção de Dados)** no prazo de **72 horas** a partir da ciência do incidente, conforme art. 48 da LGPD.

---

## 8. Encarregado de Proteção de Dados (DPO)

A Bekaa designou um Encarregado de Proteção de Dados (DPO) para atender solicitações relacionadas à privacidade:

**Contato:** privacy@bekaa.eu
**Empresa:** Bekaa
**CNPJ:** 00.000.000/0001-00 (fictício)

---

## 9. Alterações nesta Política

Esta política pode ser atualizada periodicamente. Alterações materiais serão comunicadas por e-mail ou via notificação na plataforma com antecedência mínima de **30 dias** antes de entrar em vigor. A data da última atualização é sempre indicada no topo deste documento.

---

## 10. Contato e Reclamações

Para exercer seus direitos, esclarecer dúvidas ou registrar reclamações:

- **E-mail:** privacy@bekaa.eu
- **ANPD:** Os titulares podem também registrar reclamações perante a Autoridade Nacional de Proteção de Dados (www.gov.br/anpd).

---

*Documento elaborado em conformidade com a LGPD (Lei nº 13.709/2018) e boas práticas internacionais de privacidade (GDPR, ISO/IEC 27701).*
