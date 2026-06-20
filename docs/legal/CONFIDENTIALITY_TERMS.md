# Termos de Uso e Acordo Mútuo de Confidencialidade (NDA)

**Plataforma Standard GRC API**

Ao provisionar um `organization_id` e gerar uma Chave de API de Produção na Standard API, você (Cliente) e a Standard (Provedor) estabelecem tacitamente o presente Acordo de Uso e Confidencialidade B2B.

## 1. Confidencialidade Estrita (O NDA B2B)
Reconhecemos que a natureza da nossa plataforma exige a ingestão de seus **"Documentos Estratégicos"** (Sistemas de Gestão de Segurança da Informação, topologias de rede, balanços de maturidade cibernética). 
- A Standard concorda em manter todas as Informações Confidenciais em sigilo absoluto, protegidas por controles de acesso lógicos intransponíveis (Isolamento de Tenant Forçado via ORM) e barreiras de rede (IP Allowlisting de Borda).
- **Exceções Normais:** As obrigações de confidencialidade não se aplicam a dados que já sejam de domínio público.

## 2. A Imutabilidade do Ledger (Auditoria e Forense)
A Standard atua como "Notária Digital" do seu compliance. Como tal:
- O Cliente concorda e entende que a base de dados de **Eventos de Controle de Avaliação** (Ledger) foi arquitetada para ser "Append-Only" (Exclusivamente de Inserção). 
- Modificações, deleções (`DELETE`) ou alterações no passado (`UPDATE`) do seu compliance score são bloqueadas no motor do banco de dados (Triggers DDL).
- Erros de avaliação de uma IA ou auditor humano devem ser corrigidos gerando um *novo evento* corretivo. A trilha forense não pode e não será apagada sob demanda de executivos da sua empresa.

## 3. Nível de Serviço e Disponibilidade (SLA)
A arquitetura Serverless/Edge assegura escalabilidade elástica. No entanto, o Cliente reconhece que as rotinas de inteligência (Inferência RAG e Gap Analysis) estão sujeitas à cota e disponibilidade dos Provedores de Fundação LLM (Anthropic/OpenAI).
- O Provedor emprega o padrão de Máquinas de Estados Assíncronas (Workflows). Em caso de degradação da API da OpenAI/Anthropic, a análise da evidência não falhará, mas será retida com segurança na fila (Queue) até que os parceiros restabeleçam o serviço.

## 4. Responsabilidade Limitada pelo Veredito da IA
- **Natureza Consultiva (Non-Binding Output):** Os Agentes da Standard executam análises profundas baseadas no *Secure Controls Framework (SCF)*. Contudo, as pontuações e "Gap Analyses" produzidas por IA não constituem atestado legal de compliance.
- **Portão de Aprovação (HITL):** É de responsabilidade exclusiva do Cliente utilizar os processos de *Human-In-The-Loop* para auditar as marcações feitas pela plataforma antes de apresentar o relatório gerado (`/v1/reports/export`) a um Auditor Externo oficial ou órgão governamental. 

## 5. Rescisão e Transição Segura (Offboarding)
Em caso de encerramento contratual ou expiração de ciclo:
- O Cliente tem direito a exportar todo o seu Ledger e Banco de Evidências em formato legível por máquina (JSON/CSV) através dos endpoints documentados na API.
- Após a transferência, o Provedor destruirá fisicamente os escopos no Storage R2 e limpará as tabelas da Organização no prazo legal de 30 dias, emitindo, mediante solicitação, um Certificado de Destruição (CoD).
