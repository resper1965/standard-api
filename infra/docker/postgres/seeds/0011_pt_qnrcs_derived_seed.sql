-- ============================================================
-- Standard Derived Framework Seed: PT-QNRCS
-- Source: assets/cncs-qnrcs-2019.pdf
-- Mapping source: derived (NOT in official SCF XLSX)
-- Created by: Standard Assistant
-- ============================================================

-- IMPORTANTE: Este framework NÃO existe no SCF XLSX oficial.
-- Os mapeamentos abaixo foram derivados manualmente a partir da
-- análise do documento fonte para prova de conceito da plataforma.

BEGIN;

-- Determina o ID da versão SCF atual (que o seed está usando)
DO $$
DECLARE
    v_scf_version_id uuid;
    v_framework_id uuid;
    v_req_id_ga_1 uuid;
    v_req_pr_ga_7 uuid;
    v_scf_control_ast_01 uuid;
    v_scf_control_idm_02 uuid;
BEGIN
    SELECT id INTO v_scf_version_id FROM scf_versions ORDER BY created_at DESC LIMIT 1;
    IF v_scf_version_id IS NULL THEN
        RAISE EXCEPTION 'Nenhuma scf_version encontrada';
    END IF;

    -- 1. Inserir Framework
    INSERT INTO scf_frameworks (
        scf_version_id, framework_id, name, version_label, publisher, jurisdiction, category, status, is_synthetic
    ) VALUES (
        v_scf_version_id, 'PT-QNRCS', 'Quadro Nacional de Referência para a Cibersegurança', '2019', 'CNCS Portugal', 'EMEA / Portugal', 'National', 'active', false
    )
    ON CONFLICT (scf_version_id, framework_id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status
    RETURNING id INTO v_framework_id;

    -- 2. Inserir Requisitos
    INSERT INTO scf_framework_requirements (
        scf_version_id, scf_framework_id, requirement_code, title, description, requirement_text, sort_order, status, is_synthetic
    ) VALUES (
        v_scf_version_id, v_framework_id, 'QNRCS-ID.AM-1', 'Inventariação de ativos', 
        'A organização deve efetuar o inventário dos seus equipamentos físicos...', 
        'Os dispositivos físicos, redes e sistemas de informação devem ser inventariados', 
        1, 'active', false
    )
    ON CONFLICT (scf_framework_id, requirement_code) DO UPDATE SET title = EXCLUDED.title
    RETURNING id INTO v_req_id_ga_1;

    INSERT INTO scf_framework_requirements (
        scf_version_id, scf_framework_id, requirement_code, title, description, requirement_text, sort_order, status, is_synthetic
    ) VALUES (
        v_scf_version_id, v_framework_id, 'QNRCS-PR.AM-7', 'Gestão de Identidades', 
        'A organização deve criar e manter uma política de gestão de palavras-passe...', 
        'Os mecanismos de autenticação devem ser definidos e mantidos', 
        2, 'active', false
    )
    ON CONFLICT (scf_framework_id, requirement_code) DO UPDATE SET title = EXCLUDED.title
    RETURNING id INTO v_req_pr_ga_7;

    -- Encontrar IDs de controlos SCF correspondentes
    SELECT id INTO v_scf_control_ast_01 FROM scf_controls WHERE control_code = 'AST-01' AND scf_version_id = v_scf_version_id LIMIT 1;
    SELECT id INTO v_scf_control_idm_02 FROM scf_controls WHERE control_code = 'IDM-02' AND scf_version_id = v_scf_version_id LIMIT 1;

    -- 3. Inserir Mapeamentos Derivados (Se os controlos existirem no SCF)
    IF v_scf_control_ast_01 IS NOT NULL THEN
        INSERT INTO scf_mappings (
            scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, mapping_rationale, mapping_source, is_official, status, is_synthetic
        ) VALUES (
            v_scf_version_id, v_req_id_ga_1, v_scf_control_ast_01, 'broadly_maps_to', 'Extraído do documento QNRCS (derived)', 'derived', false, 'active', false
        )
        ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
    END IF;

    IF v_scf_control_idm_02 IS NOT NULL THEN
        INSERT INTO scf_mappings (
            scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, mapping_rationale, mapping_source, is_official, status, is_synthetic
        ) VALUES (
            v_scf_version_id, v_req_pr_ga_7, v_scf_control_idm_02, 'broadly_maps_to', 'Extraído do documento QNRCS (derived)', 'derived', false, 'active', false
        )
        ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
    END IF;

END $$;
COMMIT;

