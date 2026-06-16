# Standard - Master Design System

> Source of Truth gerado via Workflow `ui-ux-pro-max` (Padrão Master + Overrides).

Este documento rege todo o ecossistema visual e a interface front-end da **Standard API Lifecycle & SaaS Platform**, baseado em princípios Enterprise GRC, Alta Confiança, performance e adequação às métricas máximas de Acessibilidade.

---

## 🏗️ 1. Padrão Estrutural (Pattern)
* **Name:** Enterprise Gateway
* **Conversão Frontal:** Carrosséis robustos de Logos (Validação Institucional).
* **Posicionamento de CTAs:** `Contact Sales` (Primário - High contrast) / `Login` (Secundário/Ghost).
* **Alinhamento de Altura dos Headers:** O header da página (Topbar) e o header do menu lateral (Sidebar Logo) possuem obrigatoriamente a mesma altura fixa (definida por `var(--topbar-height)` ou `52px`).
* **Jornada Vertical Típica (Landing):**
  1. Header e Hero Mission-focused (C/ Video ou Metric central)
  2. Soluções segmentadas por Indústria
  3. Soluções focadas por Role (DPO, CISO, Legal)
  4. Sessão Científica/Authority e Client Logos
  5. CTA Section Definitiva (Sales/Demo)

---

## 👔 2. Estilo e Semântica (Style)
* **Design Name:** Nordic Tech (Dark Mode Only)
* **Keywords e Moduladores:** Estética corporativa escura de alta precisão, minimalismo funcional, superfícies de grafite com acentos discretos e vibrantes em verde sálvia, foco na legibilidade absoluta e conformidade técnica.
* **Fit Tecnológico/Setor:** Softwares B2B SaaS, Área Médica (Healthcare), Startups Financeiras, Ferramentas Legais / Compliance / GRC.
* **Limites de Qualidade:** ⚡ Excelente Performance (zero reflows/shifts layoutísticos) | ✓ **WCAG AAA** Strict.

---

## 🎨 3. Sistema de Cores (Color Strategy)
Estratégia corporativa baseada em Grafite Antracite, tons de cinza limpos e acentos em Verde Sálvia, visando comunicar *integridade, discrição e sofisticação*.

| Variável (Tailwind) | Nome da Cor (Ext) | Propósito Prático |
| :--- | :--- | :--- |
| `primary` / `accent` (**#8fa89b**) | Sage Green | Verde Sálvia digital, cor predominante de destaque, botões primários e marcações de sucesso. |
| `background` (**#1a1d20**) | Graphite Anthracite | Fundo principal da aplicação para reduzir a fadiga visual. |
| `card` / `surface` (**#212529**) | Medium Graphite | Superfície padrão de cartões, tabelas e contêineres secundários. |
| `popover` (**#2b3035**) | Light Graphite | Usado para menus suspensos, popovers e tooltips. |
| `foreground` (**#e9ecef**) | Off-white Gelo | Cor contrastante primária para legibilidade textual absoluta sobre fundos escuros. |
| `muted-foreground` (**#adb5bd**) | Slate Gray | Usado em parágrafos de apoio e descrições secundárias. |

---

## 📝 4. Tipografia de Alta Legibilidade
Divisão tripla focada em legibilidade técnica, documental e precisão de dados tabulares.

* **Textos Corporais e Formulários (Geral):** `'Inter'`, com suavização de subpixel ativa (`letter-spacing: -0.01em`).
* **Headings e Titles:** `'Plus Jakarta Sans'`, com espaçamento condensado (`letter-spacing: -0.03em`).
* **Dados e Tabelas de Métricas:** `'Outfit'`, com suporte a números tabulares (`font-variant-numeric: tabular-nums`).
* **Código e Elementos Técnicos:** `'JetBrains Mono'`, `'Fira Code'`, `'SF Mono'`, `monospace`.

---

## 🕹️ 5. Interaction Patterns & Efeitos Chave ("Spells")
O sistema interativo repudia mudanças bruscas de contexto (shift) ou surpresas (como o uso de animações exageradas). Todas as animações principais são suavizadas por micro-interações de alta fidelidade:

* **Brand Dot (`.brand-dot`):** Respiração sutil e contínua no logotipo (oscilação suave de opacidade, 4s).
* **Notification Bell (`.bell-spell`):** Inclinação rápida e orgânica de `8deg` no hover, sem bounce exagerado.
* **Avatar Glow (`.avatar-glow`):** Halo sutil de verde sálvia de 2px em hover.
* **Magnetic Nav (`.nav-magnetic`):** Deslocamento horizontal do ícone de navegação lateral por `1px` no hover.
* **Active Nav Indicator (`.nav-active-pill`):** Barra vertical sutil de Verde Sálvia no item lateral ativo.
* **Card Entrance Stagger (`.card-spell` / `.animate-stagger`):** Revelação escalonada em fade-in e translação Y (0ms a 250ms de delay).
* **Transições Universais:** `transition-colors duration-150` ao longo de toda a aplicação.

---

## 🛑 6. Anti-Patterns Globais (Avoid Actions)
Nunca implemente o seguinte:
* **UI Emojis:** JAMAIS use emojis de forma explícita na UI. Substitua SEMPRE por SVGs confiáveis (ex: padrões **Heroicons / Lucide** ou os Oficiais das empresas em Simple Icons).
* **IA Candy Gradients:** Evite absolutamente fundos com gradientes roxos/rosas neo-inteligentes. Mantenha os acentos em azul ou verde sálvia sólido.
* **Hidden Badges:** Ocultação de credenciais legais sob tooltips genéricos. Certificados têm de ser óbvios.

---

## ✅ 7. Pre-Delivery UI Quality Checklist (Standard Workflow)

Qualquer alteração via código, criação de novas rotas ou UI features só deve ser comitada caso confirme:

### Componentes Visuais Puros
- [ ] Remoção absoluta de emojis em tela. SVGs implementados de Lucide/Heroicon (`w-5 h-5` para cards, proporções rígidas).
- [ ] Logotipos extraídos em SVG nativo de fontes confiáveis.
- [ ] Cores mapeadas estritamente a partir do CSS token e do TailWind theme global (`bg-primary`, `text-slate-900`/`#0F172A`).

### Qualidade Funcional da Navegação (Interaction)
- [ ] Presença de tag `cursor-pointer` em todo form, button ou card clicável.
- [ ] Hover State em transições suaves, nunca modificando tamanho escalar (`scale()` ou margin shifter) que distorça grids vizinhos.
- [ ] Elementos têm Focus States acessíveis visíveis para Keyboard Navigation (TAB focus com anel verde sálvia `.focus-ring`).

### Legibilidade e Constantes (Dark Protocol)
- [ ] **Modo Escuro (Glassmorphism):** Se usar modais vítreos, usar fundos translúcidos como `bg-card/80` ou `bg-black/40` com desfoque de fundo avançado, refutando transparências fracas de *10%*.
- [ ] Contraste tipográfico testado para um mínimo WCAG de `4.5:1` (Dark grays profundos para textos menores, nunca `#94A3B8`).

### Responsividade e Layout (Edge)
- [ ] Componente renderizado corretamente para celular (`375px`), iPad/Tablet (`768px`), Tela 1080P (`1440px`) e Tela Padrão de Notebooks Empresariais (`1024px`) sem barragens horizontais (`overflow-x`).
- [ ] O header da página (Topbar) e o header do menu lateral (Sidebar Logo) possuem exatamente a mesma altura.
- [ ] `prefers-reduced-motion` engatado no CSS para desativar imediatamente transições e keyframes para usuários que desabilitam animações no sistema operacional.
