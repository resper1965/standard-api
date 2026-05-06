-- infra/docker/postgres/seeds/0004_iso42001_seed.sql
-- ISO/IEC 42001:2023 — Artificial Intelligence Management System (AIMS)
-- Annex A Reference Controls + Crosswalk to SCF controls
-- Source: ISO/IEC 42001:2023 PDF (assets/), SCF official domain AAT
-- NOTE: Descriptions are structured JSON for RAG contextualisation.

WITH current_scf_version AS (
  SELECT id FROM scf_versions
  WHERE version = '2026.1.1' OR version = 'SCF 2024.4'
  ORDER BY created_at DESC
  LIMIT 1
),

-- ──────────────────────────────────────────────────────────────
-- 1. Framework entry
-- ──────────────────────────────────────────────────────────────
iso42001_framework AS (
  INSERT INTO scf_frameworks (
    id, scf_version_id, framework_id, name, version_label,
    publisher, jurisdiction, category, source_reference,
    status, is_synthetic, created_at, updated_at
  )
  SELECT
    gen_random_uuid(), id, 'iso-42001',
    'ISO/IEC 42001:2023 — AI Management System (AIMS)',
    '2023', 'ISO/IEC', 'International', 'standard',
    'https://www.iso.org/standard/81230.html',
    'active', false, NOW(), NOW()
  FROM current_scf_version
  ON CONFLICT (scf_version_id, framework_id) DO NOTHING
  RETURNING id, scf_version_id
),

-- ──────────────────────────────────────────────────────────────
-- 2. Annex A requirements — 9 domains, 39 controls
-- ──────────────────────────────────────────────────────────────

-- A.2 — Policies related to AI
req_a2_2 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.2.2',
    'AI Policy',
    '{"objective":"Establish management direction for AI in line with business objectives, legal and regulatory requirements.","guidance_summary":"Top management shall establish an AI policy communicated throughout the organization. The policy shall include commitment to responsible AI, continuous improvement, and compliance.","expected_evidence":"Documented AI policy; evidence of communication and acknowledgement; periodic review records."}',
    'The organization shall define, implement and maintain an AI policy approved by top management.',
    1, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),
req_a2_3 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.2.3',
    'Internal AI Policy',
    '{"objective":"Define internal rules for the development, provision and use of AI systems.","guidance_summary":"Internal policies shall cover acceptable use, ethical considerations, data handling requirements, and operational boundaries for AI systems.","expected_evidence":"Internal AI usage policy; acceptable use guidelines; AI ethics guidelines."}',
    'The organization shall define internal policies governing AI development, provision and use.',
    2, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),
req_a2_4 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.2.4',
    'AI Acceptable Use',
    '{"objective":"Define conditions under which AI systems may be used acceptably.","guidance_summary":"Acceptable use policies shall define boundaries, prohibited uses, user responsibilities and escalation procedures.","expected_evidence":"Acceptable use policy for AI; training records; user acknowledgements."}',
    'The organization shall define and communicate acceptable use conditions for AI systems.',
    3, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),

-- A.3 — Internal Organization
req_a3_2 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.3.2',
    'AI Roles and Responsibilities',
    '{"objective":"Assign roles and responsibilities related to the AI management system.","guidance_summary":"Roles shall be defined for AI governance, risk management, development, deployment and monitoring. Competence requirements shall be established.","expected_evidence":"RACI matrix for AI; role descriptions; competence evidence; organizational charts."}',
    'AI-related roles and responsibilities shall be defined and allocated.',
    4, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),
req_a3_3 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.3.3',
    'Reporting Responsibilities',
    '{"objective":"Ensure effective reporting of AI-related concerns to management.","guidance_summary":"Mechanisms shall be established for reporting AI incidents, ethical concerns, performance degradation and compliance issues.","expected_evidence":"Reporting procedures; incident logs; escalation records; whistleblower mechanisms."}',
    'Reporting procedures for AI-related concerns shall be established and communicated.',
    5, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),
req_a3_4 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.3.4',
    'Management Allocation of Resources',
    '{"objective":"Ensure adequate resources are allocated for AI management activities.","guidance_summary":"Management shall allocate resources for staffing, tools, infrastructure and training necessary for AI system governance.","expected_evidence":"Budget allocations; resource plans; training programs; staffing records."}',
    'Management shall ensure adequate resources are allocated for AI activities.',
    6, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),

-- A.4 — Resources for AI Systems
req_a4_2 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.4.2',
    'AI Data Resources',
    '{"objective":"Identify and manage data resources necessary for AI systems.","guidance_summary":"Data resources shall be documented, including sources, formats, volumes and quality requirements. Data management processes shall be established.","expected_evidence":"Data inventory; data flow diagrams; data quality metrics; retention policies."}',
    'Data resources necessary for AI systems shall be identified and documented.',
    7, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),
req_a4_3 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.4.3',
    'AI Tooling and Frameworks',
    '{"objective":"Manage the tools and frameworks used for AI development and deployment.","guidance_summary":"Tools shall be evaluated for fitness, security, maintainability and vendor support. Version control and approval processes shall be in place.","expected_evidence":"Tools inventory; evaluation records; version management; approval documentation."}',
    'Tools and frameworks for AI systems shall be managed and controlled.',
    8, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),
req_a4_4 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.4.4',
    'AI System Inventory',
    '{"objective":"Maintain an inventory of AI systems within the organization.","guidance_summary":"Each AI system shall be registered with purpose, risk level, data dependencies, responsible parties and lifecycle stage documented.","expected_evidence":"AI system register; risk classifications; ownership records; lifecycle status."}',
    'The organization shall maintain an inventory of all AI systems.',
    9, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),
req_a4_5 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.4.5',
    'Computing Resources',
    '{"objective":"Ensure adequate computing resources for AI systems.","guidance_summary":"Computing infrastructure shall be provisioned, monitored and scaled to meet AI workload requirements.","expected_evidence":"Infrastructure documentation; capacity plans; performance monitoring records."}',
    'Computing resources for AI systems shall be determined and managed.',
    10, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),
req_a4_6 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.4.6',
    'Human Competence for AI',
    '{"objective":"Ensure persons doing work under the AIMS are competent.","guidance_summary":"Competence requirements shall be defined for AI roles. Training, education and experience gaps shall be addressed.","expected_evidence":"Competence matrix; training records; certifications; skills assessments."}',
    'Persons working on AI systems shall have the necessary competence.',
    11, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),

-- A.5 — Assessing Impacts of AI Systems
req_a5_2 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.5.2',
    'AI Impact Assessment Process',
    '{"objective":"Assess the impact of AI systems on individuals, groups and society.","guidance_summary":"Impact assessments shall evaluate social, ethical, legal, economic and environmental effects. Assessments shall be conducted before deployment and periodically thereafter.","expected_evidence":"Impact assessment reports; stakeholder analysis; mitigation plans; periodic review records."}',
    'AI system impact assessments shall be conducted throughout the AI system life cycle.',
    12, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),
req_a5_3 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.5.3',
    'AI Impact Assessment Documentation',
    '{"objective":"Document the results and decisions from AI impact assessments.","guidance_summary":"Assessment results, identified risks, mitigation actions and residual risk acceptance shall be recorded.","expected_evidence":"Assessment documentation; decision logs; risk treatment records."}',
    'Results of AI impact assessments shall be documented and maintained.',
    13, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),
req_a5_4 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.5.4',
    'AI Impact for Affected Individuals',
    '{"objective":"Consider impacts on individuals or groups directly or indirectly affected by AI systems.","guidance_summary":"Specific attention shall be given to vulnerable groups, potential discrimination, privacy impacts and autonomy effects.","expected_evidence":"Stakeholder impact analysis; fairness assessments; privacy impact assessments."}',
    'Impacts on individuals affected by AI systems shall be identified and addressed.',
    14, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),

-- A.6 — AI System Life Cycle
req_a6_2 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.6.2',
    'AI System Life Cycle Management',
    '{"objective":"Manage AI systems across their entire life cycle.","guidance_summary":"Life cycle processes shall cover planning, design, data management, model development, verification, validation, deployment, operation and retirement.","expected_evidence":"AI SDLC documentation; stage-gate approvals; lifecycle process descriptions."}',
    'AI system life cycle processes shall be defined, documented and managed.',
    15, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),
req_a6_3 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.6.3',
    'AI Responsible Design and Development',
    '{"objective":"Design and develop AI systems responsibly, considering ethical implications.","guidance_summary":"Design processes shall incorporate fairness, accountability, transparency and safety-by-design principles.","expected_evidence":"Design reviews; ethical checkpoints; bias testing results; safety analyses."}',
    'AI system design and development shall incorporate responsible AI principles.',
    16, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),
req_a6_4 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.6.4',
    'AI Testing and Validation',
    '{"objective":"Test and validate AI systems before deployment and during operation.","guidance_summary":"Testing shall cover functional correctness, robustness, bias, security, performance and edge cases.","expected_evidence":"Test plans; test results; validation reports; acceptance criteria; regression test logs."}',
    'AI systems shall be tested and validated before deployment and at defined intervals.',
    17, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),
req_a6_5 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.6.5',
    'AI Deployment Management',
    '{"objective":"Control the deployment of AI systems into production.","guidance_summary":"Deployment shall follow defined approval processes, including readiness reviews, rollback procedures and monitoring activation.","expected_evidence":"Deployment checklists; approval records; rollback procedures; monitoring dashboards."}',
    'AI system deployment shall be controlled and managed.',
    18, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),
req_a6_6 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.6.6',
    'AI Operations and Monitoring',
    '{"objective":"Monitor AI systems during operations to detect performance degradation and incidents.","guidance_summary":"Operational monitoring shall cover model performance, data drift, bias drift, availability and security incidents.","expected_evidence":"Monitoring dashboards; alerting configurations; incident logs; performance reports."}',
    'AI systems shall be monitored during operations for performance and compliance.',
    19, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),
req_a6_7 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.6.7',
    'AI System Retirement',
    '{"objective":"Manage the retirement and decommissioning of AI systems.","guidance_summary":"Retirement processes shall address data disposal, model archival, stakeholder notification and transition planning.","expected_evidence":"Retirement plans; data disposal records; transition documentation; archival records."}',
    'AI systems shall be retired in a controlled manner.',
    20, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),

-- A.7 — Data for AI Systems
req_a7_2 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.7.2',
    'Data for AI — Quality',
    '{"objective":"Ensure data used by AI systems meets quality requirements.","guidance_summary":"Data quality criteria shall include accuracy, completeness, consistency, timeliness and relevance. Quality monitoring processes shall be established.","expected_evidence":"Data quality metrics; monitoring reports; quality validation procedures; remediation records."}',
    'Data quality for AI systems shall be defined, monitored and maintained.',
    21, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),
req_a7_3 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.7.3',
    'Data for AI — Provenance',
    '{"objective":"Track and manage the provenance (origin and lineage) of AI training and operational data.","guidance_summary":"Data provenance shall record sources, transformations, ownership and processing history.","expected_evidence":"Data lineage documentation; provenance tracking systems; chain-of-custody records."}',
    'Data provenance shall be tracked and documented for AI systems.',
    22, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),
req_a7_4 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.7.4',
    'Data for AI — Acquisition',
    '{"objective":"Control the acquisition of data for AI systems.","guidance_summary":"Data acquisition shall comply with legal, ethical and contractual requirements. Consent, licensing and privacy considerations shall be addressed.","expected_evidence":"Data acquisition agreements; consent records; licensing documentation; privacy assessments."}',
    'Data acquisition for AI systems shall be controlled and compliant.',
    23, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),
req_a7_5 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.7.5',
    'Data for AI — Preparation',
    '{"objective":"Prepare data for AI systems in a controlled and documented manner.","guidance_summary":"Data preparation processes shall include cleansing, labeling, augmentation and splitting. Biases introduced during preparation shall be identified.","expected_evidence":"Data preparation pipelines; labeling guidelines; bias analysis; documentation of transformations."}',
    'Data preparation processes for AI systems shall be defined and documented.',
    24, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),

-- A.8 — Information for Interested Parties
req_a8_2 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.8.2',
    'AI Transparency — System Information',
    '{"objective":"Provide information about AI systems to interested parties.","guidance_summary":"Information shall include the purpose, capabilities, limitations and potential impacts of AI systems. Documentation shall be kept current.","expected_evidence":"AI system documentation for stakeholders; user guides; capability statements; limitation disclosures."}',
    'Information about AI systems shall be provided to interested parties.',
    25, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),
req_a8_3 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.8.3',
    'AI Transparency — Decision Explainability',
    '{"objective":"Ensure AI system decisions can be explained to appropriate stakeholders.","guidance_summary":"Explainability requirements shall be determined based on risk, regulatory requirements and stakeholder needs. Mechanisms for explanation shall be implemented.","expected_evidence":"Explainability mechanisms; decision logs; audit trails; explanation templates."}',
    'AI system decisions shall be explainable to appropriate stakeholders.',
    26, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),
req_a8_4 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.8.4',
    'AI Notification of Interaction',
    '{"objective":"Notify individuals when they are interacting with an AI system.","guidance_summary":"Where applicable, individuals shall be informed that they are interacting with an AI system rather than a human.","expected_evidence":"Notification mechanisms; disclosure statements; UI indicators; communication records."}',
    'Individuals shall be notified when interacting with an AI system.',
    27, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),

-- A.9 — Use of AI Systems
req_a9_2 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.9.2',
    'AI Responsible Use',
    '{"objective":"Ensure AI systems are used responsibly and within defined boundaries.","guidance_summary":"Usage guidelines shall be established covering acceptable use, prohibited applications, human oversight requirements and escalation procedures.","expected_evidence":"Usage guidelines; compliance monitoring; incident reports; user training records."}',
    'AI systems shall be used responsibly within defined boundaries.',
    28, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),
req_a9_3 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.9.3',
    'AI Human Oversight',
    '{"objective":"Establish human oversight mechanisms for AI systems.","guidance_summary":"Human oversight shall be proportionate to the risk and impact of the AI system. Override mechanisms and intervention points shall be defined.","expected_evidence":"Human oversight procedures; override mechanisms; intervention logs; escalation records."}',
    'Human oversight shall be established for AI systems based on risk.',
    29, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),
req_a9_4 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.9.4',
    'AI System Performance Monitoring',
    '{"objective":"Monitor the performance of AI systems during use.","guidance_summary":"Performance shall be monitored against defined KPIs, including accuracy, fairness, drift and reliability metrics.","expected_evidence":"Performance dashboards; KPI tracking; drift detection reports; performance review records."}',
    'AI system performance shall be monitored during use.',
    30, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),

-- A.10 — Third Party and Customer Relationships
req_a10_2 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.10.2',
    'AI Third-Party Supplier Management',
    '{"objective":"Manage risks from third-party AI suppliers and service providers.","guidance_summary":"AI supply chain risks shall be assessed. Supplier agreements shall include requirements for responsible AI, data handling, security and audit rights.","expected_evidence":"Supplier assessments; contractual AI clauses; audit reports; due diligence records."}',
    'Third-party AI suppliers shall be assessed and managed for AI-related risks.',
    31, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),
req_a10_3 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.10.3',
    'AI Outsourced Development',
    '{"objective":"Control outsourced AI system development activities.","guidance_summary":"Outsourced development shall be governed by contracts specifying AI standards, quality requirements, testing obligations and IP rights.","expected_evidence":"Outsourcing contracts; quality requirements; acceptance testing; code review records."}',
    'Outsourced AI development shall be controlled through defined requirements.',
    32, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
),
req_a10_4 AS (
  INSERT INTO scf_framework_requirements (
    id, scf_version_id, scf_framework_id, requirement_code, title,
    description, requirement_text, sort_order, status, is_synthetic, created_at, updated_at
  )
  SELECT gen_random_uuid(), scf_version_id, id, 'A.10.4',
    'AI Customer Relationships',
    '{"objective":"Manage AI-related responsibilities towards customers.","guidance_summary":"Customer communication shall cover AI capabilities, limitations, data usage and customer responsibilities.","expected_evidence":"Customer agreements; AI disclosures; support documentation; feedback mechanisms."}',
    'AI-related responsibilities towards customers shall be defined and managed.',
    33, 'active', false, NOW(), NOW()
  FROM iso42001_framework
  RETURNING id AS req_id, scf_version_id
)

-- ──────────────────────────────────────────────────────────────
-- 3. Crosswalk mappings: ISO 42001 Annex A → SCF Controls
-- ──────────────────────────────────────────────────────────────
INSERT INTO scf_mappings (
  id, scf_version_id, scf_framework_requirement_id, scf_control_id,
  relationship_type, relationship_strength, mapping_rationale,
  mapping_source, is_official, status, is_synthetic, created_at, updated_at
)
-- A.2.2 AI Policy → AAT-01 AI & Autonomous Technology Governance
SELECT gen_random_uuid(), r.scf_version_id, r.req_id, c.id,
  'broadly_maps_to', 'strong',
  'ISO 42001 A.2.2 requires AI policy; SCF AAT-01 requires AI governance program.',
  'derived', false, 'active', false, NOW(), NOW()
FROM req_a2_2 r
JOIN scf_controls c ON c.control_code = 'AAT-01' AND c.scf_version_id = r.scf_version_id
UNION ALL
-- A.2.2 AI Policy → GOV-01 Governance Program
SELECT gen_random_uuid(), r.scf_version_id, r.req_id, c.id,
  'broadly_maps_to', 'moderate',
  'ISO 42001 A.2.2 AI policy aligns with SCF GOV-01 governance program.',
  'derived', false, 'active', false, NOW(), NOW()
FROM req_a2_2 r
JOIN scf_controls c ON c.control_code = 'GOV-01' AND c.scf_version_id = r.scf_version_id
UNION ALL
-- A.2.3 Internal AI Policy → GOV-02 Publishing Documentation
SELECT gen_random_uuid(), r.scf_version_id, r.req_id, c.id,
  'broadly_maps_to', 'strong',
  'ISO 42001 A.2.3 internal AI policy aligns with SCF GOV-02 publishing documentation.',
  'derived', false, 'active', false, NOW(), NOW()
FROM req_a2_3 r
JOIN scf_controls c ON c.control_code = 'GOV-02' AND c.scf_version_id = r.scf_version_id
UNION ALL
-- A.3.2 AI Roles → GOV-04 Assigned Responsibilities
SELECT gen_random_uuid(), r.scf_version_id, r.req_id, c.id,
  'broadly_maps_to', 'strong',
  'ISO 42001 A.3.2 AI roles aligns with SCF GOV-04 assigned responsibilities.',
  'derived', false, 'active', false, NOW(), NOW()
FROM req_a3_2 r
JOIN scf_controls c ON c.control_code = 'GOV-04' AND c.scf_version_id = r.scf_version_id
UNION ALL
-- A.4.4 AI System Inventory → AST-01 Asset Governance
SELECT gen_random_uuid(), r.scf_version_id, r.req_id, c.id,
  'broadly_maps_to', 'strong',
  'ISO 42001 A.4.4 AI system inventory aligns with SCF AST-01 asset governance.',
  'derived', false, 'active', false, NOW(), NOW()
FROM req_a4_4 r
JOIN scf_controls c ON c.control_code = 'AST-01' AND c.scf_version_id = r.scf_version_id
UNION ALL
-- A.4.4 AI System Inventory → AST-02 Asset Inventories
SELECT gen_random_uuid(), r.scf_version_id, r.req_id, c.id,
  'broadly_maps_to', 'strong',
  'ISO 42001 A.4.4 AI system inventory aligns with SCF AST-02 asset inventories.',
  'derived', false, 'active', false, NOW(), NOW()
FROM req_a4_4 r
JOIN scf_controls c ON c.control_code = 'AST-02' AND c.scf_version_id = r.scf_version_id
UNION ALL
-- A.5.2 AI Impact Assessment → RSK-02 Risk Assessment
SELECT gen_random_uuid(), r.scf_version_id, r.req_id, c.id,
  'broadly_maps_to', 'strong',
  'ISO 42001 A.5.2 AI impact assessment aligns with SCF RSK-02 risk assessment.',
  'derived', false, 'active', false, NOW(), NOW()
FROM req_a5_2 r
JOIN scf_controls c ON c.control_code = 'RSK-02' AND c.scf_version_id = r.scf_version_id
UNION ALL
-- A.5.2 AI Impact Assessment → AAT-02 AI Risk Assessment
SELECT gen_random_uuid(), r.scf_version_id, r.req_id, c.id,
  'broadly_maps_to', 'strong',
  'ISO 42001 A.5.2 AI impact assessment aligns with SCF AAT-02 AI risk assessment.',
  'derived', false, 'active', false, NOW(), NOW()
FROM req_a5_2 r
JOIN scf_controls c ON c.control_code = 'AAT-02' AND c.scf_version_id = r.scf_version_id
UNION ALL
-- A.6.2 AI System Life Cycle → TDA-01 Technology Development & Acquisition
SELECT gen_random_uuid(), r.scf_version_id, r.req_id, c.id,
  'broadly_maps_to', 'moderate',
  'ISO 42001 A.6.2 AI SDLC aligns with SCF TDA-01 technology development.',
  'derived', false, 'active', false, NOW(), NOW()
FROM req_a6_2 r
JOIN scf_controls c ON c.control_code = 'TDA-01' AND c.scf_version_id = r.scf_version_id
UNION ALL
-- A.6.4 AI Testing → TDA-02 Secure Software Development
SELECT gen_random_uuid(), r.scf_version_id, r.req_id, c.id,
  'broadly_maps_to', 'moderate',
  'ISO 42001 A.6.4 AI testing aligns with SCF TDA-02 secure development.',
  'derived', false, 'active', false, NOW(), NOW()
FROM req_a6_4 r
JOIN scf_controls c ON c.control_code = 'TDA-02' AND c.scf_version_id = r.scf_version_id
UNION ALL
-- A.6.6 AI Operations Monitoring → MON-01 Continuous Monitoring
SELECT gen_random_uuid(), r.scf_version_id, r.req_id, c.id,
  'broadly_maps_to', 'moderate',
  'ISO 42001 A.6.6 AI operations monitoring aligns with SCF MON-01 continuous monitoring.',
  'derived', false, 'active', false, NOW(), NOW()
FROM req_a6_6 r
JOIN scf_controls c ON c.control_code = 'MON-01' AND c.scf_version_id = r.scf_version_id
UNION ALL
-- A.7.2 Data Quality → DCH-01 Data Protection
SELECT gen_random_uuid(), r.scf_version_id, r.req_id, c.id,
  'broadly_maps_to', 'moderate',
  'ISO 42001 A.7.2 data quality aligns with SCF DCH-01 data protection.',
  'derived', false, 'active', false, NOW(), NOW()
FROM req_a7_2 r
JOIN scf_controls c ON c.control_code = 'DCH-01' AND c.scf_version_id = r.scf_version_id
UNION ALL
-- A.7.4 Data Acquisition → PRI-01 Data Privacy Program
SELECT gen_random_uuid(), r.scf_version_id, r.req_id, c.id,
  'broadly_maps_to', 'moderate',
  'ISO 42001 A.7.4 data acquisition compliance aligns with SCF PRI-01 data privacy.',
  'derived', false, 'active', false, NOW(), NOW()
FROM req_a7_4 r
JOIN scf_controls c ON c.control_code = 'PRI-01' AND c.scf_version_id = r.scf_version_id
UNION ALL
-- A.8.3 AI Explainability → AAT-03 AI Transparency & Explainability
SELECT gen_random_uuid(), r.scf_version_id, r.req_id, c.id,
  'broadly_maps_to', 'strong',
  'ISO 42001 A.8.3 explainability directly maps to SCF AAT-03 transparency and explainability.',
  'derived', false, 'active', false, NOW(), NOW()
FROM req_a8_3 r
JOIN scf_controls c ON c.control_code = 'AAT-03' AND c.scf_version_id = r.scf_version_id
UNION ALL
-- A.9.3 Human Oversight → AAT-01 AI Governance
SELECT gen_random_uuid(), r.scf_version_id, r.req_id, c.id,
  'broadly_maps_to', 'strong',
  'ISO 42001 A.9.3 human oversight aligns with SCF AAT-01 AI governance.',
  'derived', false, 'active', false, NOW(), NOW()
FROM req_a9_3 r
JOIN scf_controls c ON c.control_code = 'AAT-01' AND c.scf_version_id = r.scf_version_id
UNION ALL
-- A.10.2 Third Party AI Supplier → TPM-01 Third-Party Management
SELECT gen_random_uuid(), r.scf_version_id, r.req_id, c.id,
  'broadly_maps_to', 'strong',
  'ISO 42001 A.10.2 AI third-party supplier management aligns with SCF TPM-01.',
  'derived', false, 'active', false, NOW(), NOW()
FROM req_a10_2 r
JOIN scf_controls c ON c.control_code = 'TPM-01' AND c.scf_version_id = r.scf_version_id
UNION ALL
-- A.10.2 Third Party AI Supplier → TPM-02 Third-Party Assessments
SELECT gen_random_uuid(), r.scf_version_id, r.req_id, c.id,
  'broadly_maps_to', 'moderate',
  'ISO 42001 A.10.2 AI supplier management aligns with SCF TPM-02 assessments.',
  'derived', false, 'active', false, NOW(), NOW()
FROM req_a10_2 r
JOIN scf_controls c ON c.control_code = 'TPM-02' AND c.scf_version_id = r.scf_version_id
UNION ALL
-- A.10.3 Outsourced AI Development → TPM-01
SELECT gen_random_uuid(), r.scf_version_id, r.req_id, c.id,
  'broadly_maps_to', 'strong',
  'ISO 42001 A.10.3 outsourced AI development maps to SCF TPM-01.',
  'derived', false, 'active', false, NOW(), NOW()
FROM req_a10_3 r
JOIN scf_controls c ON c.control_code = 'TPM-01' AND c.scf_version_id = r.scf_version_id;
