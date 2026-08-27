# ADR-018 — Pisos de Cobertura Medidos, com Ratchet

**Status:** Aceite
**Data:** 2026-08-27

---

## Contexto

`vitest.config.ts` declarava, desde a criação do projeto, um piso único de 30% para as quatro métricas de cobertura. Nenhum job de CI executava `--coverage`, então essa configuração nunca foi avaliada: `pnpm test:unit` roda os scripts `test` de cada pacote, e `test:ci` nunca chamou o vitest com cobertura.

A medição só se tornou possível quando o PR #134 passou a coletar cobertura para alimentar o cálculo de CRAP da auditoria de risco. Os números reais, medidos em `6b90be9`:

| Métrica | Real | Piso declarado | O que o piso fazia |
|---|---|---|---|
| lines | 39,28% | 30 | passava, com 9 pontos de folga |
| statements | 39,28% | 30 | idem |
| **functions** | **21,87%** | 30 | **reprovava — sem ninguém notar** |
| **branches** | **83,33%** | 30 | cobertura de ramos podia **cair pela metade** e ainda passar |

Um único número aplicado a métricas que diferem em 61 pontos era, ao mesmo tempo, inatingível numa dimensão e decorativo noutra.

Este é o segundo gate encontrado nessa condição no mesmo dia. O primeiro foi `scripts/validate-openapi.ts`, que exigia "pelo menos 56 operações" contra 407 reais — não podia falhar nem se a cobertura da especificação regredisse em 351 operações. Ambos existiam há meses e ambos passavam.

---

## Decisão

**Cada piso é fixado um ponto abaixo do valor medido**, não num número redondo escolhido por aspiração:

```
lines 38 · statements 38 · functions 21 · branches 82
```

O ponto de folga absorve variação entre execuções sem tornar o gate frágil.

**Ratchet.** Quando uma métrica sobe, o piso sobe no mesmo PR. Nunca se baixa um piso para tornar verde um build vermelho — é assim que um gate vira decoração.

**A execução vive no job `Unit & Contract Tests` do workflow `ci.yml`**, adicionada ao lado de `pnpm test:unit`, não no lugar dele. Os dois rodam conjuntos de arquivos diferentes: `test:unit` executa o script `test` de cada pacote, enquanto `pnpm coverage` executa a suíte vitest da raiz. Substituir um pelo outro encolheria silenciosamente o que o CI executa.

**O job de auditoria (`fallow.yml`) mantém `continue-on-error`.** Ele pontua complexidade e precisa que `coverage-final.json` exista mesmo quando um piso reprova. Barrar cobertura ali misturaria dois propósitos.

---

## Consequências

Positivas:

- Os quatro números passam a dizer o que o repositório de fato faz.
- Uma regressão real reprova o build, o que antes não acontecia em nenhuma das quatro métricas.
- Quem for elevar um piso no futuro eleva algo verdadeiro.

Negativas, e explícitas:

- **21,87% de cobertura de funções continua baixo.** Esta decisão não melhora a cobertura; ela impede o número de mentir. Fixar o piso no valor real pode ser lido como endosso do valor — não é.
- O piso de `branches` em 82 é alto e pode reprovar um PR legítimo que adicione muitos ramos de uma vez. Nesse caso a resposta é cobrir os ramos, não baixar o piso.
- O passo de cobertura acrescenta cerca de 20 segundos ao job de testes.

---

## Alternativas consideradas

**Manter 30 e escrever testes até alcançá-lo.** Rejeitada por ordem, não por mérito: enquanto os testes não existem, o gate fica desligado ou permanentemente vermelho — exatamente o estado que produziu o problema. Elevar depois, pelo ratchet, chega ao mesmo lugar sem um intervalo cego.

**Remover os pisos.** Rejeitada: transformaria uma métrica silenciosamente falsa numa métrica ausente.

**Unificar os runners de teste antes de fixar pisos.** Adiada, mas é a alternativa de maior impacto. Os 155 testes do `api-gateway` rodam num runner próprio (`tests/test-kit.ts`), fora do vitest, e não contribuem para nenhuma destas contas. A lacuna de cobertura de funções concentra-se em handlers e serviços — trazer os dois runners para o mesmo lugar moveria o número mais do que escrever testes novos. Fica registrado como trabalho seguinte.

---

## Relacionados

- PR #134 — passou a coletar cobertura para o cálculo de CRAP; foi o que tornou os números visíveis.
- PR #135 — implementa esta decisão.
- `docs/decisions/IMPLEMENTATION-CONSTRAINTS.md` — anti-padrões activos.
