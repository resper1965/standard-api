# Assessment Engine & Compliance (SCF)

Este módulo documenta o núcleo de compliance e a arquitetura de mapeamento normativo da plataforma.

## Suporte Nativo a Frameworks Customizados
**Capacidade:** Injetar planilhas ou regulamentações de frameworks regionais (ex: ONS 901.000, BACEN, legislações estaduais) sem necessidade de modelar esquemas de banco de dados novos ou alterar a base da aplicação.
- **Implementação API-First:** A arquitetura do Secure Controls Framework (SCF) utiliza mapeamentos metadados. O que o cliente mapeia privadamente é salvo com a propriedade "consultiva" (`mapping_source = consultative`), mantendo a biblioteca normativa oficial inalterada, porém disponível para cálculos de compliance unificados.
- **Onde consumir:** 
  - Endpoints de gestão de `Frameworks` e rotas de upload de mapeamentos.

## O Motor STRM (NIST IR 8477) e Imunidade a Versionamento
**Capacidade:** Garantir que quando a base normativa principal for atualizada, os frameworks privados/secundários dos clientes migrem automaticamente para as novas regras sem perda de dados históricos ou links quebrados.
- **Implementação API-First:** A API de Gap Analysis não cruza tabelas estaticamente. Ela utiliza o Standardized Target Relationship Model (STRM) e inteligência baseada em grafos. O motor deduz a conformidade transitando entre os links usando operadores canônicos (`intersects`, `equal`, `subset`, `superset`).
- **Regra para Agentes IA (Contexto):** *CRITICAL RULE: Nunca calcule compliance dividindo "controles implementados por total de controles". Utilize sempre a matriz algorítmica e pesos do STRM (ADR-001).*
