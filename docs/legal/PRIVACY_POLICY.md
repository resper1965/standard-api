# Política de Privacidade e Tratamento de Dados (GRC Portal)

**Data de Vigência:** 17 de Junho de 2026
**Aplicabilidade:** Global (LGPD, GDPR, CCPA)

A **Standard GRC API** foi concebida sob os pilares do *Privacy by Design* e *Privacy by Default*, alinhados com o **Secure Controls Framework (SCF)**. Como atuamos como Processadores de Dados (Data Processors) das evidências de compliance da sua empresa, esta Política define como garantimos o sigilo matemático e contratual das suas informações.

## 1. Zero-Training em Inteligência Artificial (AI Ethics)
Sua empresa fará o upload de evidências sensíveis (Políticas de Segurança, Diagramas de Arquitetura, Scans de Vulnerabilidade) para serem avaliadas pela nossa Inteligência Artificial Agêntica.
- **Nenhum Treinamento (No-Training Policy):** Garantimos contratualmente que **nenhum dado** submetido à nossa plataforma será utilizado para treinar, retreinar ou calibrar modelos de fundação (LLMs).
- **Roteamento Seguro (AI Gateway):** As requisições de inferência para LLMs de terceiros (ex: OpenAI, Anthropic) transitam por um túnel criptografado via *Cloudflare AI Gateway*, onde contratos B2B de "Zero Data Retention" estão em vigor. Nossos parceiros de IA não armazenam suas requisições.

## 2. Isolamento de Dados Criptográficos (Confidencialidade no RAG)
Para que a Inteligência Artificial localize evidências em documentos extensos (RAG), fragmentos das suas políticas são vetorizados.
- **Tenant-Key Encryption:** A Standard GRC não confia apenas em filtros lógicos para isolar clientes. Cada fragmento de texto submetido ao nosso Banco de Vetores (Vectorize) é criptografado na origem utilizando uma chave assimétrica atrelada ao seu `organization_id`. Um vazamento técnico cruzado é matematicamente incapaz de revelar seus dados a terceiros.

## 3. Retenção e Localização Física dos Dados (Data Residency)
Atendemos aos controles de localidade do GDPR e normativas financeiras.
- **Armazenamento em Repouso:** Os PDFs e relatórios originais residem em Buckets (Cloudflare R2) sob jurisdição compatível e acordada com o cliente. 
- **O Direito ao Esquecimento (Data Erasure):** Todo conteúdo transitório (vetores, documentos base) pode ser expurgado sob demanda. No entanto, por obrigações do SOC 2 e rastreabilidade de auditoria, os **Registros de Avaliação** (Ledger) que contém apenas os "Findings" finais são preservados.

## 4. Segurança de Credenciais M2M (Machine-to-Machine)
- A Standard adota uma arquitetura de **Zero-Knowledge** para as suas chaves de API. Em nenhuma hipótese o nosso banco de dados relacional armazena a sua chave em texto limpo. Em caso de comprometimento fortuito dos nossos sistemas de banco de dados, os invasores terão acesso apenas a Hashes SHA-256 irreversíveis.

## 5. Subprocessadores Autorizados
Para fins de conformidade com o Artigo 28 do GDPR, a Standard GRC utiliza as seguintes infraestruturas certificadas (SOC 2 Type II / ISO 27001):
- **Cloudflare, Inc.** (Processamento de Borda, WAF, Gateway, Storage de Arquivos)
- **Neon, Inc.** (Armazenamento de Dados Relacionais e Ledger de Auditoria)
- **Anthropic PBC / OpenAI LLC** (Inferência Cognitiva - Sob contrato B2B de Retenção Zero).

---
*Para requisições de DPO (Data Protection Officer), portabilidade ou relatórios RoPA (Registro de Atividades de Tratamento), contate nosso canal de suporte restrito.*
