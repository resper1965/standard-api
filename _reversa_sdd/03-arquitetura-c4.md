# Reversa — Fase 3: Arquitetura C4

> Gerado em 2026-05-02 por Antigravity
> Projeto: standard-api-standard v0.1.0

---

## Diagrama C4 — Nível 1: Contexto do Sistema

```mermaid
graph TB
    User["👤 Usuário / Auditor"]
    Admin["👤 Super Admin"]
    ExtClient["🤖 Cliente Programático (API Key)"]

    subgraph "Standard Platform"
        Dashboard["🖥️ Standard Dashboard<br/>React SPA (Cloudflare Pages)"]
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
        Web["🖥️ apps/web<br/>React 19 + Vite 8<br/>Cloudflare Pages<br/>standard-web-m99.pages.dev"]
    end

    subgraph "API Layer"
        GW["⚡ apps/api-gateway<br/>Cloudflare Worker<br/>standard-api.bekaa.eu"]
    end

    subgraph "Background Workers"
        WF["🔄 workers/workflows<br/>Durable Workflow<br/>Assessment Lifecycle"]
        QC["📬 workers/queues<br/>Queue Consumer<br/>KB Embedding"]
        ING["📄 workers/ingestion<br/>Document Ingestion<br/>Parsing + Chunking"]
    end

    subgraph "Data Stores"
        DB[("🐘 Neon PostgreSQL<br/>Tenants, Assessments,<br/>Findings, Approvals")]
        R2Docs["📦 R2: standard-documents<br/>Documentos originais"]
        R2Reports["📦 R2: standard-reports<br/>Relatórios gerados"]
        R2Exports["📦 R2: standard-exports<br/>Exports"]
    end

    subgraph "Queues"
        Q1["📬 standard-document-ingestion"]
        Q2["📬 standard-kb-embedding"]
        Q3["📬 standard-report-export"]
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
            AE["@standard/assessment-engine"]
            DI["@standard/document-ingestion"]
            GA["@standard/gap-analysis"]
            SOA["@standard/soa"]
            POAM["@standard/poam"]
            REP["@standard/reporting"]
            KB["@standard/kb"]
            SCF["@standard/scf-core"]
            AR["@standard/agent-runtime"]
            OBS["@standard/observability"]
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
    schemas["@standard/schemas<br/>Drizzle + Zod"]

    scf["@standard/scf-core"] --> schemas
    auth["@standard/auth"] --> schemas
    obs["@standard/observability"] --> schemas
    ar["@standard/agent-runtime"] --> schemas
    ae["@standard/assessment-engine"] --> schemas
    di["@standard/document-ingestion"] --> schemas
    sec["@standard/security"] --> schemas
    sec --> di

    kb["@standard/kb"] --> schemas
    kb --> di

    soa["@standard/soa"] --> schemas
    soa --> ae
    soa --> scf
    soa --> kb

    ga["@standard/gap-analysis"] --> schemas
    ga --> ae
    ga --> scf
    ga --> kb
    ga --> soa

    poam["@standard/poam"] --> schemas
    poam --> ae
    poam --> scf
    poam --> ga
    poam --> soa

    rep["@standard/reporting"] --> schemas
    rep --> ae
    rep --> scf
    rep --> ga
    rep --> poam
    rep --> soa

    gw["@standard/api-gateway"] --> ae
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

    subgraph "Standard Domain Mapping"
        O -.->|"= tenant_id"| T["Tenant Context"]
        U -.->|"= actorId"| AC["Actor Context"]
        S -.->|"activeOrganizationId"| T
    end
```
