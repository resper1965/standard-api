# ADR-016 — Ingestão de Documentos com LlamaParse e Fallback Híbrido

**Status:** Aceite  
**Data:** 2026-06-16

---

## Contexto

A plataforma Standard GRC realiza avaliações de conformidade regulatória (com base no Secure Controls Framework - SCF) por meio da análise RAG (Retrieval-Augmented Generation) de evidências enviadas pelos clientes (como políticas, procedimentos, logs e screenshots).

Atualmente, o extrator de PDF e imagens (`AzurePdfExtractor` em `packages/document-ingestion/src/extractors.ts`) utiliza o modelo `prebuilt-read` do Azure AI Document Intelligence. Embora veloz e preciso para texto corrido, esse modelo apresenta limitações significativas:
1. **Perda Estrutural de Tabelas:** GRC possui muitos dados em formato de matrizes de acesso, logs de firewalls e registros de riscos. O processamento linear embaralha colunas e linhas.
2. **Ausência de Interpretação Multimodal:** Capturas de tela de configurações de segurança (como regras de buckets AWS S3) são extraídas como texto solto e descontextualizado.
3. **Dependências em Workers:** Ingestão de formatos proprietários (como DOCX, PPTX) exige dependências que inflam o tamanho do bundle do Cloudflare Worker.

---

## Decisão

Adotar o **LlamaParse** (serviço SaaS de extração GenAI da LlamaIndex) como um extrator de alta fidelidade e estruturar a ingestão sob uma **Cadeia de Extração Priorizada com Fallback Resiliente**.

Para mitigar riscos regulatórios de privacidade de dados (uma vez que os dados do LlamaParse são processados em nuvem de terceiros), e riscos operacionais de indisponibilidade de API ou limites de cota, a arquitetura deve seguir as seguintes diretrizes:

### 1. Modelo de Opt-In por Tenant (Privacidade de Dados)
O uso do LlamaParse **nunca deve ser global por padrão**. 
* Cada tenant/organização terá um flag no banco de dados (`use_high_fidelity_parser`).
* Clientes corporativos (Enterprise) poderão registrar sua própria `LLAMA_CLOUD_API_KEY` nas configurações da organização para faturamento direto em sua conta LlamaCloud.
* Se desabilitado ou sem chave, o sistema ignora o LlamaParse e usa apenas extratores locais/Azure, garantindo custo zero e privacidade absoluta.

### 2. Cadeia de Extração Priorizada (Prioritized Extraction Chain)
A orquestração do worker (`packages/document-ingestion/src/consumer.ts`) passa a filtrar e ordenar os adapters disponíveis em um pipeline sequencial de tentativas:
1. `LlamaParseExtractor` (Prioridade 1, caso habilitado e com chave).
2. `AzurePdfExtractor` (Prioridade 2, padrão corporativo).
3. `PlainTextExtractor` / Adapters Locais (Prioridade 3, fallback de segurança).

### 3. Mecanismo de Fallback Tolerante a Falhas
Caso o LlamaParse retorne erros (HTTP 429/500) ou timeout durante o polling assíncrono:
* O erro é interceptado.
* Uma mensagem de aviso é salva no campo `extraction_warnings` do metadado do documento no banco.
* O pipeline executa automaticamente o próximo adapter da fila (`AzurePdfExtractor`), evitando que a ingestão de documentos do usuário quebre.

---

## Contrato de Adaptação de Código

Alterar `packages/document-ingestion/src/consumer.ts` para processar a cadeia ordenada:

```typescript
const eligibleExtractors = deps.extractors.filter(
  (candidate) => candidate.supports(message.mime_type, extension)
);

// Ordena por ordem de prioridade (LlamaParse -> Azure -> Local)
const prioritizedExtractors = eligibleExtractors.sort((a, b) => {
  const priority = (extractor: any) => {
    if (extractor.constructor.name === "LlamaParseExtractor") return 1;
    if (extractor.constructor.name === "AzurePdfExtractor") return 2;
    return 3;
  };
  return priority(a) - priority(b);
});

let extracted = null;
const extractionWarnings: string[] = [];

for (const extractor of prioritizedExtractors) {
  try {
    extracted = await extractor.extract({
      bytes: object.bytes,
      mimeType: message.mime_type,
      extension,
      filename: document.normalized_filename
    });
    break; // Concluído com sucesso
  } catch (error) {
    extractionWarnings.push(`Fallback: ${extractor.constructor.name} falhou: ${(error as Error).message}`);
  }
}

if (!extracted) {
  throw new Error("Todos os extratores falharam.");
}
```

---

## Ficheiros Afectados

- `packages/document-ingestion/src/extractors.ts` — criação do adapter `LlamaParseExtractor`
- `packages/document-ingestion/src/consumer.ts` — implementação do laço de fallback sequencial
- `packages/schemas/src/db/schema.ts` — inclusão da propriedade `use_high_fidelity_parser` no schema de configurações de organizações
