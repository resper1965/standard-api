# Golden Outputs

Este diretório fica reservado para compatibilidade com a estrutura canônica descrita no `AGENTS.md`.

Os golden outputs ativos do MVP estão em `evals/golden` e são usados por `pnpm test:regression`.

Regras:

- usar apenas dados sintéticos e revisáveis;
- não incluir documentos reais, prompts completos, outputs sensíveis ou secrets;
- atualizar golden outputs somente quando a mudança funcional for intencional e documentada.
