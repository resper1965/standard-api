# Spec: Sincronização Documental de Superfície

## Resumo
Atualizar a documentação base do monorepo (`README.md`, `AGENTS.md` e `docs/context/arquitetura.md`) para refletir precisamente os recortes estruturais presentes no repositório.

## Motivação
A arvore ASCII e itens nos documentos que detalham a pasta `packages/` estavam dessincronizados do sistema real: pacotes de domínio cruzado e tipos (como `contracts`, `domain`, `scf-catalog`) existiam localmente sem mapeamento e explicação nas diretrizes. Para evitar degradação de contexto nas inteligências e futuros construtores que entrarem na equipe, padronizar essas referências documentais é indispensável.

## Escopo (Fase 2)
### Alteração 1: `README.md`
- Atualizar a UI do *Directory Tree* em "Estrutura do Repositório" com todas as listagens da pasta `packages/`.
- Adicionar uma explicação compacta aos novos pacotes (`contracts`, `domain`, `scf-catalog`) na lista de texto "Como Entender os Packages".

### Alteração 2: `docs/context/arquitetura.md`
- Listar a presença total de domínios nos blocos da arquitetura geral sob "Camadas Principais".

### Alteração 3: `AGENTS.md`
- Realocar e unificar as árvores hierárquicas da estrutura para fechar a porta ao acesso das antigas "pastas fantasmas" do passo anterior em relatórios subsequentes de LLM.

## Validação
Essa spec trata exclusivamente de arquivos textuais de marcação (`*.md`). Não reflete e também não afeta processamento nativo via Cloudflare local ou global. Apenas exige `git log` de consistência ou `pnpm lint`.
