# Documentação Legal — Standard Platform

**Produto:** Standard (Plataforma SaaS de Assessments SCF)
**Empresa:** Bekaa
**Responsável:** Time Standard / Bekaa
**Contato de privacidade:** privacy@bekaa.eu

---

> [!CAUTION]
> **NOT LEGAL ADVICE — RASCUNHOS**
>
> Todos os documentos neste diretório são **rascunhos preliminares** elaborados para fins de referência e estruturação interna.
>
> **Eles NÃO constituem aconselhamento jurídico** e **NÃO devem ser publicados, enviados a clientes ou utilizados em contratos** sem revisão e aprovação por profissional jurídico habilitado.
>
> Campos marcados com `[PREENCHER]` devem ser preenchidos antes de qualquer uso.

---

## Índice de Documentos

| Documento | Arquivo | Idioma | Última Atualização | Status |
|---|---|---|---|---|
| Política de Privacidade | [privacy-policy.md](./privacy-policy.md) | PT-BR | 2026-05-25 | 🟡 Rascunho |
| Termos de Serviço | [terms-of-service.md](./terms-of-service.md) | PT-BR | 2026-05-25 | 🟡 Rascunho |
| Template de DPA (Contrato de Processamento de Dados) | [dpa-template.md](./dpa-template.md) | PT-BR | 2026-05-25 | 🟡 Rascunho |

---

## Sumário dos Documentos

### 📋 Política de Privacidade ([privacy-policy.md](./privacy-policy.md))

Descreve como a Bekaa coleta, usa e protege dados pessoais na operação da Plataforma Standard. Cobre:

- Dados de conta, uso e assessments (com bases legais LGPD para cada categoria)
- Retenção de dados (referência à `data-retention-policy.md` — a ser criado)
- Direitos dos titulares com endpoints de API (`GET /api/v1/me/data-export`, `DELETE /api/v1/me/account`)
- Sub-processadores e transferências internacionais
- Contato do DPO

---

### 📜 Termos de Serviço ([terms-of-service.md](./terms-of-service.md))

Rege o relacionamento contratual entre a Bekaa e os clientes da Plataforma Standard. Cobre:

- Licença de uso SaaS por organization (não transferível)
- Obrigações do cliente (dados precisos, credenciais, uso aceitável)
- Modelo Controlador/Operadora (cliente controla dados de negócio; Bekaa opera)
- SLA best-effort para MVP; SLA formal em contrato separado
- Propriedade intelectual (plataforma = Bekaa; dados do cliente = cliente)
- Limitação de responsabilidade
- Foro: São Paulo/SP, lei brasileira

---

### 🔐 Template de DPA ([dpa-template.md](./dpa-template.md))

Contrato de Processamento de Dados conforme LGPD. Deve ser assinado entre a Bekaa e cada cliente. Cobre:

- Papéis LGPD: Cliente = Controlador; Bekaa = Operadora
- Categorias de dados pessoais processados (usuários da plataforma)
- Finalidades do processamento
- Sub-processadores autorizados: Cloudflare, Neon, OpenAI, Google (Gemini)
- Transferências internacionais via SCCs
- Notificação de incidentes em 72h
- Devolução/exclusão de dados em 30 dias após encerramento
- Direito de auditoria do Controlador (30 dias de aviso prévio)
- Campos de assinatura (placeholders)

---

## Documentos Pendentes de Criação

| Documento | Prioridade | Observação |
|---|---|---|
| `data-retention-policy.md` | Alta | Referenciado pela Política de Privacidade |
| `cookie-policy.md` | Média | Para o frontend web (apps/web) |
| `acceptable-use-policy.md` | Média | Complementa os Termos de Serviço |
| `security-policy.md` | Alta | Política de segurança da informação |

---

## Responsabilidade e Processo de Revisão

- **Elaboração inicial:** Time Standard / Bekaa (assistido por Antigravity — Google DeepMind)
- **Revisão jurídica obrigatória:** advogado especializado em LGPD/direito digital antes de qualquer publicação
- **Aprovação:** liderança da Bekaa e conselheiro jurídico
- **Atualização:** qualquer alteração nos documentos deve ser registrada com nova data e versionamento

---

## Referências Legais

- [LGPD — Lei nº 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [ANPD — Autoridade Nacional de Proteção de Dados](https://www.gov.br/anpd)
- [GDPR — Regulamento UE 2016/679](https://eur-lex.europa.eu/legal-content/PT/TXT/?uri=CELEX:32016R0679) (referência para melhores práticas)
- [SCF — Secure Controls Framework](https://securecontrolsframework.com/)

---

*Última revisão do índice: 2026-05-25 — Time Standard / Bekaa*
