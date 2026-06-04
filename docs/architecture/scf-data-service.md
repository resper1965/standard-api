# SCF Data Service

## Objetivo

O SCF Data Service é a camada normativa estruturada do Standard para versões, domínios, controles, frameworks, requirements, mappings e relações STRM do Secure Controls Framework.

O pacote principal é `packages/scf-core`. Ele expõe schemas, fixture sintética, importadores extensíveis, repositórios e serviços de consulta reutilizáveis pelo API Gateway, workflows e futuros agentes funcionais.

## Fonte Normativa

O SCF estruturado é a fonte de verdade para controles, frameworks, requirements e mappings oficiais. RAG e busca vetorial podem ajudar a recuperar evidências, documentação ou contexto semântico, mas não podem criar ou substituir mappings oficiais.

Mappings oficiais só podem existir quando vierem de fonte estruturada importada e versionada. Qualquer inferência futura de agente deve ser separada e marcada como consultiva, nunca gravada como mapping oficial.

## SCF Estruturado vs RAG

- SCF estruturado: dados relacionais versionados, auditáveis e consultáveis por IDs.
- KB/RAG: evidências de cliente, documentos e recuperação semântica auxiliar.
- Vectorize: mecanismo de busca auxiliar, não autoridade normativa.

## Versionamento

Todo controle pertence a uma `scf_version`. Importações registram `scf_import_runs` com fonte, hash, status, estatísticas e `trace_id`. Respostas relevantes incluem `scf_version_id`.

O MVP usa fixture sintética `synthetic-2026.0-test`, marcada com `is_synthetic: true`, apenas para desenvolvimento e testes.

## Importação

O núcleo define a interface `ScfImporter` e implementa:

- `csv`: importador inicial estruturado por linhas com `record_type`.
- `xlsx`: placeholder documentado para XLSX oficial do SCF.
- `oscal_json`: placeholder para OSCAL JSON.

O importador registra hash (`source_hash`), status, estatísticas e mensagens seguras. Ele valida duplicidade de `control_code` por versão, duplicidade de `requirement_code` por framework e integridade referencial dos mappings.

## Mappings e STRM

`scf_mappings` relaciona `scf_framework_requirement_id` com `scf_control_id`. O relacionamento inclui `relationship_type`, `relationship_strength`, `mapping_source`, `is_official` e `status`.

Tipos STRM previstos no contrato:

- `equal`
- `subset`
- `superset`
- `intersecting`
- `related`
- `no_relationship`
- `source_defined`

O MVP preserva o tipo recebido quando suportado e não inventa mappings ausentes.

## Frameworks e Requirements

Frameworks são entidades globais compartilhadas, com código, nome, versão, publisher e status. Requirements pertencem a um framework e podem ser listados por `framework_id`.

## Controles e Domínios

Domínios pertencem a uma versão SCF. Controles pertencem simultaneamente a uma versão e a um domínio, com `control_code` único por versão.

## Uso Futuro por Agentes

- Framework Mapper: consulta mappings oficiais por requirement ou framework.
- SCF Control Analyst: consulta controles, domínios e metadados estruturados.
- SoA Architect: usa controles e mappings como base para escopo, sem alterar SCF oficial.
- Gap Analyst: referencia controles e requirements por ID.
- Maturity Assessor: consulta controles versionados e critérios futuros, sem depender de RAG como fonte normativa.

## Guardrails

- Não usar organization em SCF oficial global.
- Não criar crosswalks por inferência nesta etapa.
- Não misturar versões sem declarar `scf_version_id`.
- Não tratar fixture sintética como dataset oficial.
- Não registrar conteúdo excessivo ou sensível em erro de importação.

## Limitações do MVP

- Repositório em memória no API Gateway.
- Importador real implementado apenas para CSV estruturado de teste.
- XLSX oficial e OSCAL ficam como extension points.
- Rollback de importação é placeholder documentado.
- Persistência PostgreSQL real ainda depende de adapters transacionais.

## Decisões em Aberto

- Formato final do artefato oficial SCF usado em produção.
- Estratégia de importação incremental vs troca imutável de versão.
- Modelo final de tabela STRM separado por mapping ou catálogo de relações.
- Geração automática de OpenAPI a partir de Zod.
- Adapters PostgreSQL para `packages/scf-core`.

