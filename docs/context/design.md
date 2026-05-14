# Standard - Master Design System

> Source of Truth gerado via Workflow `ui-ux-pro-max` (Padrão Master + Overrides).

Este documento rege todo o ecossistema visual e a interface front-end da **Standard API Lifecycle & SaaS Platform**, baseado em princípios Enterprise GRC, Alta Confiança, performance e adequação às métricas máximas de Acessibilidade.

---

## 🏗️ 1. Padrão Estrutural (Pattern)
* **Name:** Enterprise Gateway
* **Conversão Frontal:** Carrosséis robustos de Logos (Validação Institucional).
* **Posicionamento de CTAs:** `Contact Sales` (Primário - High contrast) / `Login` (Secundário/Ghost).
* **Jornada Vertical Típica (Landing):**
  1. Header e Hero Mission-focused (C/ Video ou Metric central)
  2. Soluções segmentadas por Indústria
  3. Soluções focadas por Role (DPO, CISO, Legal)
  4. Sessão Científica/Authority e Client Logos
  5. CTA Section Definitiva (Sales/Demo)

---

## 👔 2. Estilo e Semântica (Style)
* **Design Name:** Trust & Authority
* **Keywords e Moduladores:** Certificados em exibição (Badges), credenciais expostas, métricas quantificáveis sólidas, selos de segurança, estética corporativa conservadora e estável.
* **Fit Tecnológico/Setor:** Softwares B2B SaaS, Área Médica (Healthcare), Startups Financeiras, Ferramentas Legais / Compliance.
* **Limites de Qualidade:** ⚡ Excelente Performance (zero reflows/shifts layoutísticos) | ✓ **WCAG AAA** Strict.

---

## 🎨 3. Sistema de Cores (Color Strategy)
Estratégia corporativa central baseada em Azul Marinho Sereno, Cinzas limpos e Verdes Hospitalares, visando comunicar *integridade e discrição*.

| Variável (Uso Padrão do Tailwind) | Nome da Cor (Ext) | Propósito Prático |
| :--- | :--- | :--- |
| `primary` (**#0891B2**) | Calm/Authority Blue | Cor predominante de destaque e identidade da marca, badgets principais e headers ativos. |
| `secondary` (**#22D3EE**) | Accent Cyan/Tech Blue | Usado em bordas suaves ativos, hover states do primary e efeitos decorativos finos. |
| `cta` (**#059669**) | Health/Trust Green | Botão estrito de Ação/Conversões e validações de sucesso normativo. |
| `text-brand-900` (**#164E63**) | Deep Text | Contrastante principal para a Legibilidade textual absoluta sobre fundos claros. Recomendado em parágrafos e Data Tables. |
| `bg-brand` (**#ECFEFF**) | Light Medical Cyan | Recomendado como `bg` principal de telas claras e contêineres de cartões de informação técnica. |

---

## 📝 4. Tipografia de Alta Legibilidade
Divisão dupla focada intrinsecamente na familiaridade legal/documental, porém sem aspecto engessado de sistemas de justiça antigos.

* **Headings e Titles:** `Lexend`
* **Textos Corporais e Componentes (Forms):** `Source Sans 3`
* **Arquitetura Psicológica:** Corporativo, Crível, Acessível, Clean.
* **Import CDN Universal:**
  ```css
  @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap');
  ```

---

## 🕹️ 5. Interaction Patterns & Efeitos Chave
O sistema interativo repudia mudanças bruscas de contexto (shift) ou surpresas (como o uso das animações exageradas do modo DevTool).

* **Micro-animações autorizadas:** Efeitos de Hover sutis focados unicamente em badge activation e pulse sutil para alertar mudanças (score metrics updating). Revelação em fade-in moderado (Smooth stat reveals). Card border glow em focus.
* **Interação e Cursores:** A classe `cursor-pointer` é **mínimo requisito** para TODOS e eventuais componentes em que a intenção seja clicável.
* **Transições Universais:** `transition-colors duration-200` ao longo de toda a aplicação (nada que ultrapasse 500ms).

---

## 🛑 6. Anti-Patterns Globais (Avoid Actions)
Nunca implemente o seguinte:
* **UI Emojis:** JAMAIS use `🔒` ou `📈` de forma explícita na UI. Substitua SEMPRE por SVGs confiáveis (ex: padrões **Heroicons / Lucide** ou os Oficiais das empresas em Simple Icons).
* **IA Candy Gradients:** Evite absolutamente fundos com gradientes roxos/rosas neo-inteligentes. Mantenha os acentos em azul sólido.
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
- [ ] Elementos têm Focus States acessíveis visíveis para Keyboard Navigation (TAB focus).

### Legibilidade e Constantes (Light Protocol)
- [ ] **Modo Claro (Glassmorphism):** Se usar modais vítreos, obrigatoriamente usar `#FFFFFF` ou `bg-white/80` super translúcido, refutando transparências fracas de *10%* (`bg-white/10`).
- [ ] Contraste tipográfico testado para um mínimo WCAG de `4.5:1` (Sombra nos textos em darkmode se necessário; Dark grays profundos para textos menores, nunca `#94A3B8`).

### Responsividade (Edge)
- [ ] Componente renderizado corretamente para celular (`375px`), iPad/Tablet (`768px`), Tela 1080P (`1440px`) e Tela Padrão de Notebooks Empresariais (`1024px`) sem barragens horizontais (`overflow-x`).
- [ ] `prefers-reduced-motion` engatado no CSS para clientes que desabilitam animações sistêmicas do Windows/MacOS.
