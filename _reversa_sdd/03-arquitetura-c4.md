# Reversa — Fase 3: Arquitetura C4

> Gerado em 2026-05-02 por Antigravity
> Projeto: aegis-api-standard v0.1.0

---

## Diagrama C4 — Nível 1: Contexto do Sistema

```mermaid
graph TB
    User["👤 Usuário / Auditor"]
    Admin["👤 Super Admin"]
    ExtClient["🤖 Cliente Programático (API Key)"]

    subgraph "Aegis Platform"
        Dashboard["🖥️ Aegis Dashboard<br/>React SPA (Cloudflare Pages)"]
        APIGateway["⚡ API Gateway<br/>Cloudflare Worker"]
    end

    NeonDB[("🐘 Neon PostgreSQL<br/>Banco Transacional")]
    R2["📦 Cloudflare R2<br/>Object Storage"]
    GoogleOAuth["🔐 Google OAuth<br/>Identity Provider"]

    User --> Dashboard
    Admin --> Dashboard
    ExtClient --> APIGateway
    Dashboard --> APIGateway
    APIGateway --> NeonDB
    APIGateway --> R2
    Dashboard -.->|OAuth Redirect| GoogleOAuth
    APIGateway -.->|Validate Token| GoogleOAuth
```

## Diagrama C4 — Nível 2: Containers

```mermaid
graph TB
    subgraph "Frontend"
        Web["🖥️ apps/web<br/>React 19 + Vite 8<br/>Cloudflare Pages<br/>aegis-web-m99.pages.dev"]
    end

    subgraph "API Layer"
        GW["⚡ apps/api-gateway<br/>Cloudflare Worker<br/>aegis-api.bekaa.eu"]
    end

    subgraph "Background Workers"
        WF["🔄 workers/workflows<br/>Durable Workflow<br/>Assessment Lifecycle"]
        QC["📬 workers/queues<br/>Queue Consumer<br/>KB Embedding"]
        ING["📄 workers/ingestion<br/>Document Ingestion<br/>Parsing + Chunking"]
    end

    subgraph "Data Stores"
        DB[("🐘 Neon PostgreSQL<br/>Tenants, Assessments,<br/>Findings, Approvals")]
        R2Docs["📦 R2: aegis-documents<br/>Documentos originais"]
        R2Reports["📦 R2: aegis-reports<br/>Relatórios gerados"]
        R2Exports["📦 R2: aegis-exports<br/>Exports"]
    end

    subgraph "Queues"
        Q1["📬 aegis-document-ingestion"]
        Q2["📬 aegis-kb-embedding"]
        Q3["📬 aegis-report-export"]
    end

    Web -->|"/api/*" proxy| GW
    GW --> DB
    GW --> R2Docs
    GW --> R2Reports
    GW -->|Enqueue| Q1
    GW -->|Enqueue| Q2
    GW -->|Enqueue| Q3
    Q1 --> ING
    Q2 --> QC
    Q3 --> QC
    GW -.->|Start Workflow| WF
    WF --> DB
    ING --> DB
    ING --> R2Docs
    QC --> DB
```

## Diagrama C4 — Nível 3: Componentes do API Gateway

```mermaid
graph TB
    subgraph "apps/api-gateway"
        direction TB
        Router["🛣️ Router<br/>app.ts"]
        AuthMW["🔐 Auth Middleware<br/>resolveAuthContext()"]
        BetterAuth["🔑 Better Auth Handler<br/>/api/auth/**"]

        subgraph "Route Handlers"
            AssessmentR["📋 assessments.routes.ts"]
            DocumentR["📄 documents.routes.ts"]
            GapR["🔍 gap-analysis.routes.ts"]
            SoaR["📑 soa.routes.ts"]
            ApprovalR["✅ approvals.routes.ts"]
            ReportR["📊 reporting.routes.ts"]
            PoamR["🎯 poam.routes.ts"]
            KBR["🧠 kb.routes.ts"]
            ScfR["📚 scf.routes.ts"]
            WorkflowR["🔄 workflow.routes.ts"]
            HealthR["🩺 health.routes.ts"]
            ObsR["📜 observability.routes.ts"]
        end

        subgraph "Domain Packages"
            AE["@aegis/assessment-engine"]
            DI["@aegis/document-ingestion"]
            GA["@aegis/gap-analysis"]
            SOA["@aegis/soa"]
            POAM["@aegis/poam"]
            REP["@aegis/reporting"]
            KB["@aegis/kb"]
            SCF["@aegis/scf-core"]
            AR["@aegis/agent-runtime"]
            OBS["@aegis/observability"]
        end
    end

    Router --> AuthMW
    Router --> BetterAuth
    AuthMW --> AssessmentR
    AuthMW --> DocumentR
    AuthMW --> GapR
    AuthMW --> ApprovalR
    AssessmentR --> AE
    DocumentR --> DI
    GapR --> GA
    SoaR --> SOA
    ApprovalR --> AE
    ReportR --> REP
    PoamR --> POAM
    KBR --> KB
    ScfR --> SCF
```

## Diagrama de Dependências entre Packages

```mermaid
graph BT
    schemas["@aegis/schemas<br/>Drizzle + Zod"]

    scf["@aegis/scf-core"] --> schemas
    auth["@aegis/auth"] --> schemas
    obs["@aegis/observability"] --> schemas
    ar["@aegis/agent-runtime"] --> schemas
    ae["@aegis/assessment-engine"] --> schemas
    di["@aegis/document-ingestion"] --> schemas
    sec["@aegis/security"] --> schemas
    sec --> di

    kb["@aegis/kb"] --> schemas
    kb --> di

    soa["@aegis/soa"] --> schemas
    soa --> ae
    soa --> scf
    soa --> kb

    ga["@aegis/gap-analysis"] --> schemas
    ga --> ae
    ga --> scf
    ga --> kb
    ga --> soa

    poam["@aegis/poam"] --> schemas
    poam --> ae
    poam --> scf
    poam --> ga
    poam --> soa

    rep["@aegis/reporting"] --> schemas
    rep --> ae
    rep --> scf
    rep --> ga
    rep --> poam
    rep --> soa

    gw["@aegis/api-gateway"] --> ae
    gw --> di
    gw --> ga
    gw --> soa
    gw --> poam
    gw --> rep
    gw --> kb
    gw --> scf
    gw --> ar
    gw --> obs
    gw --> sec
    gw --> auth
```

## Assessment Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> draft
    draft --> documents_uploaded
    documents_uploaded --> documents_ingested
    documents_ingested --> scf_pre_analysis_ready
    scf_pre_analysis_ready --> framework_selected
    framework_selected --> scope_drafted
    scope_drafted --> soa_drafted
    soa_drafted --> soa_under_review
    soa_under_review --> soa_approved : ✅ Approval Gate
    soa_approved --> soa_ingested
    soa_ingested --> evidence_analysis_ready
    evidence_analysis_ready --> gap_analysis_drafted
    gap_analysis_drafted --> gap_analysis_under_review
    gap_analysis_under_review --> gap_analysis_approved : ✅ Approval Gate
    gap_analysis_approved --> maturity_assessed
    maturity_assessed --> maturity_under_review
    maturity_under_review --> maturity_approved : ✅ Approval Gate
    maturity_approved --> poam_drafted
    poam_drafted --> poam_under_review
    poam_under_review --> poam_approved : ✅ Approval Gate
    poam_approved --> report_generated
    report_generated --> closed
    closed --> archived

    draft --> cancelled
    draft --> failed
    draft --> blocked
```

## Identity & RBAC Model

```mermaid
graph LR
    subgraph "Better Auth"
        U["User"] --> S["Session"]
        U --> A["Account (Google OAuth)"]
        U --> M["Member"]
        M --> O["Organization (=Tenant)"]
        M --> R["Role: owner|admin|member|viewer"]
        U --> AK["API Key"]
    end

    subgraph "Aegis Domain Mapping"
        O -.->|"= tenant_id"| T["Tenant Context"]
        U -.->|"= actorId"| AC["Actor Context"]
        S -.->|"activeOrganizationId"| T
    end
```
