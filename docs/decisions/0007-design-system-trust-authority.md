# ADR-0007: Design System "Trust & Authority"

**Status**: aceita
**Data**: 2026-05-01
**Contexto**: O frontend precisava de um design system que transmitisse confiança institucional para CISOs, DPOs e auditores GRC.
**Decisão**: Adotar design system "Trust & Authority" com dark mode corporativo, tipografia Inter, paleta controlada e acessibilidade WCAG AAA.
**Consequências**:
- Paleta: `--bg: #0F172A`, `--surface: #1E293B`, `--accent: #3B82F6`, sem gradientes decorativos
- Anti-patterns: proibido emojis como ícones, gradientes arco-íris, glassmorphismo excessivo, animações decorativas
- Tipografia: Inter via Google Fonts, sem fontes decorativas
- Vanilla CSS com custom properties (sem Tailwind)
- Acessibilidade: foco em contraste, navegação por teclado, estados claros
**Alternativas consideradas**:
- Tailwind CSS: produtivo mas add 1 build dependency; decisão pode ser revisitada
- Material Design: muito genérico, não transmite autoridade GRC
- Shadcn/UI: depende de Tailwind, complexidade desnecessária para MVP
**Referências**: `docs/context/design.md`, `apps/web/src/styles/`
