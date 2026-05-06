# QNRCS Integration Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Provide a static seed integration to load the Portuguese National Cybersecurity Framework (QNRCS 2019) into the Drizzle Data Layer for Standard.

**Architecture:** We will create a declarative SQL seed file to populate the `scf_frameworks`, `scf_framework_requirements`, and `scf_mappings` tables using pure Postgres UUID functions and `WITH` CTEs to bypass manual foreign keys. The JSON metadata in descriptions will ensure LLMs have robust Portuguese RAG context for Evidence validations.

**Tech Stack:** Postgres / SQL / Drizzle

---

### Task 1: Create the QNRCS Seed Script

**Files:**
- Create: `infra/docker/postgres/seeds/0003_qnrcs_seed.sql`

**Step 1: Write the SQL Seed execution (Example with 2 core controls)**

```sql
-- infra/docker/postgres/seeds/0003_qnrcs_seed.sql
WITH current_scf_version AS (
  SELECT id FROM scf_versions WHERE version_number = '2026.1.1' OR status = 'published' LIMIT 1
),
qnrcs_framework AS (
  INSERT INTO scf_frameworks (
    id, scf_version_id, framework_id, name, version_label, publisher, jurisdiction, category, status, is_synthetic, created_at, updated_at
  )
  SELECT 
    gen_random_uuid(), id, 'qnrcs-2019', 'Quadro Nacional de Referência para a Cibersegurança', '2019', 'CNCS', 'PT', 'National', 'active', false, NOW(), NOW()
  FROM current_scf_version
  RETURNING id, scf_version_id
),
req_id_ga_1 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title, description, requirement_text, status, is_synthetic, created_at, updated_at
  )
  SELECT 
    gen_random_uuid(), scf_version_id, id, 'ID.GA-1', 'Gestão de Ativos', 
    '{"implementacao_tecnica": "1 Ferramentas/aplicações de gestão de ativos.", "implementacao_processual": "A organização deve efetuar o inventário dos seus equipamentos...", "evidencias": "1 Inventário atualizado dos ativos com: Informação de inventário; Identificação dos responsáveis."}', 
    'Os dispositivos físicos, redes e sistemas de informação existentes na organização devem ser inventariados', 'active', false, NOW(), NOW()
  FROM qnrcs_framework
  RETURNING id as req_id, scf_version_id
),
req_pr_ga_7 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title, description, requirement_text, status, is_synthetic, created_at, updated_at
  )
  SELECT 
    gen_random_uuid(), scf_version_id, (SELECT id FROM qnrcs_framework), 'PR.GA-7', 'Gestão de Identidades', 
    '{"implementacao_processual": "A organização deve: 1 Criar e manter uma política de gestão de palavras-passe...", "evidencias": "1 Documentos de suporte à política de gestão de palavras-passe; 2 Relatórios de auditoria."}', 
    'Os mecanismos de autenticação devem ser definidos e mantidos de acordo com as características dos sistemas', 'active', false, NOW(), NOW()
  FROM current_scf_version
  RETURNING id as req_id, scf_version_id
)
-- Mappings (Mocking CIS CSC 1 mapping for demonstration)
INSERT INTO scf_mappings (
  id, scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_rationale, mapping_source, is_official, status, is_synthetic, created_at, updated_at
)
SELECT 
  gen_random_uuid(), r.scf_version_id, r.req_id, c.id, 'broadly_maps_to', 'strong', 'QNRCS ID.GA-1 exige inventário físico.', 'official_scf', true, 'active', false, NOW(), NOW()
FROM req_id_ga_1 r
JOIN scf_controls c ON c.control_code = 'AST-01' AND c.scf_version_id = r.scf_version_id
UNION ALL
SELECT 
  gen_random_uuid(), r2.scf_version_id, r2.req_id, c2.id, 'broadly_maps_to', 'strong', 'QNRCS PR.GA-7 exige controle de senhas.', 'official_scf', true, 'active', false, NOW(), NOW()
FROM req_pr_ga_7 r2
JOIN scf_controls c2 ON c2.control_code = 'IDM-02' AND c2.scf_version_id = r2.scf_version_id;
```

**Step 2: Commit**

```bash
git add infra/docker/postgres/seeds/0003_qnrcs_seed.sql
git commit -m "feat(scf): add QNRCS 2019 framework seed and initial mappings"
```

