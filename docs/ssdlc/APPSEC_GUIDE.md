# DefectDojo & SSDLC Policy Guide (Cloud-Native)

Bem-vindo ao Centro de Excelência AppSec. Este documento especifica o controle de segurança contínua (SSDLC) para a Standard API, focando na integração orgânica e Cloud-Native com a nossa instância autônoma do **DefectDojo**.

---

## 1. Topologia de Integração (GitHub Actions)

A nossa arquitetura abandonou Wrappers ou Scripts locais (que levam a alto custo de manutenção).
O Scan é orquestrado nativamente pelo GitHub, em servidores efêmeros, no arquivo `.github/workflows/defectdojo.yml`. As ferramentas operantes são:

1. **Semgrep (SAST):** Identifica vulnerabilidades de código via regras estáticas em Typescript.
2. **Gitleaks (Secrets):** Varre a base e PRs buscando chaves, tokens e certificados soltos.
3. **Trivy (SCA/Containers):** Mapeia OS dependencies e bibliotecas em imagens.
4. **Syft/CycloneDX (SBOM):** Fornece uma Conta de Materiais de Software, crucial para nossa matriz GRC.

### Variáveis Secretas
Para o CI/CD exportar os dados ao DefectDojo, as seguintes _Repository Secrets_ e _Variables_ estão em uso:
- `secrets.DEFECTDOJO_URL`: URL remota da instância (e.g. `https://defectdojo.exemplo.com`).
- `secrets.DEFECTDOJO_API_KEY`: Token do usuário bot do DefectDojo que possua nível `Maintainer` no Produto alvo.
- `vars.DEFECTDOJO_ENGAGEMENT_ID`: Opcional. ID do Engagement onde os testes devem ser apensados (Geralmente criamos um Engagement de longa duração do tipo `CI/CD`).

---

## 2. Modelo Taxonômico (Product, Engagement e Test)
Nossa modelagem dentro da hierarquia do DefectDojo opera da seguinte forma:

- **Product Type:** Define a Vertical. Ex.: "Plataformas GRC" ou "Soluções Cloud".
- **Product:** Identifica a aplicação sendo testada. Ex.: "Standard API".
- **Engagement:** Representa o ciclo de vida. Mantemos um Engagement rotineiro mensal chamado `Standard API CI/CD - Month, Year` do tipo "CI/CD".
- **Test:** Criado automaticamente pela action de POST (`/api/v2/import-scan/`).

Tipos de `scan_type` habilitados na pipeline e parseados nativamente pela API do DefectDojo:
- `Semgrep JSON Report`
- `Gitleaks Scan`
- `Trivy Scan`
- `CycloneDX Scan`

---

## 3. Matriz de Controles SSDLC por Nível de Risco

### Nível 1 — Baseline Obrigatório (Para todos os pacotes e microserviços)
- Impedimento primário de injeção de Secrets na origem (Gitleaks via Husky/GitHub).
- Correção de vulnerabilidades conhecidas (CVEs) em pacotes Node (`pnpm audit`).
- Integração CI para coleta de status.

### Nível 2 — Aplicações Edge / APIs
- Tudo do Nível 1.
- Semgrep habilitado nas PRs.
- Obrigatório SBOM gerado ao fim de todo Workflow de Release usando CycloneDX.
- Reporte mandatório ao DefectDojo.

---

## 4. Pipeline Gates (Critérios de Bloqueio)

Regras de aprovação/rejeição para Pull Requests e Deploys de Produção:

1. **Secrets Detectados:** Bloqueio **Imediato**. A PR não pode receber merge caso o Gitleaks encontre Tokens.
2. **Vulnerabilidade CRÍTICA (com fix existente):** Bloqueio de Pipeline via regra. Trivy configurado com porta `CRITICAL,HIGH`.
3. **Vulnerabilidades Alta em código novo:** Requer *Accepted Risk* no DefectDojo ou resolução antes do merge.
4. **Falsos Positivos & Médias/Baixas:** Reportadas ao DefectDojo silenciosamente; não interrompem o Build Edge, servindo apenas para *Trend Analysis*.

---

## 5. Políticas Governança 

### Política de Falso Positivo
1. Encontrou um falso positivo? Um AppSec ou Developer deve entrar no DefectDojo e marcar o *finding* como `False Positive`.
2. A justificativa deve ser inserida nas "Notes" do Finding no DefectDojo para aprovação de compliance SOC2 (ex: "A key exportada não é token de acesso, mas um mock test-safe").
3. Nos scans futuros a pipeline enviará o JSON e o Dojo fará deduplicação, ignorando-o por herança.

### Política de Aceitação de Risco (*Accepted Risk*)
1. Em caso de CVEs que quebram a pipeline, mas não afetam nosso ecossistema real da API:
2. Criar um Risk Acceptance explícito no DefectDojo para o Findings associado.
3. Obrigatório: Responsável técnico nomeado, Vencimento (Tolerância Ex: 90 dias) e Evidência de Mitigação alternativa (WAF rule via Cloudflare).
