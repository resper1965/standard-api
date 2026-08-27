# Processamento por IA na Plataforma Standard

**Última verificação:** 2026-08-27, contra o código em produção
**Público:** clientes, seus Encarregados (DPO) e auditores
**Complementa:** [`dpa-template.md`](dpa-template.md) §3 e §6

Este documento existe para que ninguém precise deduzir. Ele lista **exatamente
quais endpoints enviam conteúdo a um modelo de linguagem externo, o que é
enviado, para onde vai, e o que a plataforma faz com o resultado.**

Onde este documento e o código divergirem, o código é a verdade e este
documento é um defeito a corrigir.

---

## 1. Resumo

| | |
|---|---|
| Endpoints que enviam dados a modelo externo | **9** de 407 |
| Endpoints com "AI" no nome que **não** enviam nada | **1** |
| Provedores | OpenAI, LLC e Google LLC, ambos via Cloudflare AI Gateway |
| Região de processamento | EUA |
| Salvaguarda | SCCs / DPA do provedor (ver `dpa-template.md` §6) |
| Treinamento de modelo com os seus dados | **Não** — ver §5 |

Nenhum outro endpoint da API envia conteúdo a modelo de linguagem. Os demais
398 operam apenas sobre a base de dados da plataforma.

---

## 2. Os nove endpoints que enviam dados a um modelo

| Endpoint | O que é enviado | Resultado é persistido? |
|---|---|---|
| `POST /api/v1/gap/evaluate-evidence` | Texto da evidência e o requisito do controle | Não — devolvido ao chamador |
| `POST /api/v1/gap/evaluate-evidence/batch` | Idem, em lote | Não — enfileirado, devolvido por job |
| `POST /api/v1/poam/architect-remediation` | Achados de gap a remediar | Não |
| `POST /api/v1/privacy/analyze-ropa` | Descrição da atividade de tratamento | Não |
| `POST /api/v1/privacy/assess-dpia` | Descrição da atividade e contexto de risco | Não |
| `POST /api/v1/privacy/scan-vendor-contract` | Texto do contrato do fornecedor | Não |
| `POST /api/v1/privacy/scan-vendor-contract/batch` | Idem, até 500 por chamada | Não |
| `POST /api/v1/soc/triage-incident` | Descrição do incidente | Não |
| `POST /api/v1/executive/translate-risk` | Achados de risco a traduzir para linguagem executiva | Não |

**Nenhum dos nove grava a saída do modelo na sua base.** Todos devolvem o
resultado ao chamador, que decide o que fazer com ele. A plataforma registra
que a chamada ocorreu (audit trail), não o conteúdo enviado.

Quatro deles — `analyze-ropa`, `assess-dpia` e os dois `scan-vendor-contract`
— tratam **dados de privacidade do seu próprio inventário**, não evidências de
controle. É a categoria mais sensível desta lista e a razão de este documento
existir separado do DPA.

---

## 3. O endpoint que diz "AI" e não é

`POST /api/v1/privacy/processing-activities/from-text`

Extrai uma atividade de tratamento a partir de texto livre. **Não envia nada
para fora.** A extração é feita por expressões regulares e busca de palavras-
chave, executadas no próprio Worker.

Registramos isso aqui porque a nomenclatura induzia ao erro: o evento de
auditoria chamava-se `privacy.ai.extraction`, e um cliente lendo o próprio log
concluiria que o texto da sua atividade de tratamento havia sido enviado a uma
IA externa. Não foi. O evento passou a chamar-se
`privacy.rule_based.extraction`; eventos históricos mantêm o nome antigo.

**Este endpoint está depreciado.** Ele cria a atividade e seus registros filhos
— titulares, categorias de dados, terceiros — de uma vez, a partir de extração
por regra. Isso acerta o formato e erra o julgamento: um ROPA gerado assim e
não revisado *parece* completo, o que num artefato feito para ser auditado é
pior que um campo vazio. E a camada não entrega nada que
`POST /api/v1/privacy/processing-activities` mais os endpoints filhos já não
façam, com o operador vendo o que está sendo registrado.

Continua funcionando até **25 de novembro de 2026**, devolvendo cabeçalhos
`Deprecation` e `Sunset`, porque estava publicado como primeiro passo do fluxo
recomendado. Foi retirado dessa recomendação.

---

## 4. O que a plataforma não faz

Afirmações negativas, verificáveis no código:

- **Não treinamos modelos com os seus dados.** A plataforma não possui pipeline
  de treinamento; as chamadas são de inferência, sem retenção pelo provedor
  além do necessário para responder (ver política do provedor).
- **Não enviamos documentos inteiros por padrão.** O que vai ao modelo é o
  recorte que o endpoint recebe na requisição.
- **Não há decisão automatizada com efeito jurídico.** Nenhum dos nove
  endpoints altera estado de assessment, aprova artefato ou fecha gap. Os
  portões de aprovação exigem ator humano e são inalcançáveis por chave de API
  — por desenho, e asseverado por teste.
- **Não usamos modelo local.** Se as credenciais do AI Gateway faltarem em
  produção, a plataforma falha explicitamente em vez de degradar para outro
  modelo.

---

## 5. Como controlar

- **Não chamar.** Os nove endpoints são explícitos. Uma integração que não os
  chame não envia nada a modelo algum; o restante da plataforma funciona.
- **Por escopo de chave.** Chaves de API sem os escopos `gap:write`,
  `privacy:read`, `intelligence:run` ou `agent:run` não alcançam esses
  endpoints.
- **Auditoria.** Toda chamada gera evento no audit trail, com `trace_id`,
  identificando o ator e o momento. O conteúdo enviado não é registrado.

Para restringir o uso de IA na sua organização, ou para receber a lista
atualizada de sub-processadores: **privacy@bekaa.eu**.

---

## 6. Manutenção deste documento

A lista da §2 é verificada em CI. `apps/api-gateway/tests/ai-disclosure.test.ts`
percorre os arquivos de rota, encontra cada endpoint que instancia um caso de
uso com `LlmProvider`, e compara com a lista publicada aqui. A verificação corre
nas duas direções:

- um endpoint que chame modelo e **não** esteja na §2 reprova o build, nomeando
  a si mesmo;
- um endpoint listado na §2 que **deixe** de chamar modelo também reprova, para
  que não fiquemos declarando mais do que fazemos.

Um terceiro teste assevera que o extrator da §3 não alcança modelo algum.

Isto existe porque um documento assim é pior que nenhum quando desatualiza: um
cliente a quem se disse por escrito que o texto do seu ROPA permanece na
plataforma, e que descobre o contrário, foi induzido a erro. A especificação
OpenAPI desta API ficou três meses divergente do código antes de passar a ser
gerada e verificada; aqui a consequência seria jurídica em vez de técnica.
