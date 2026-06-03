-- Framework: TX-LEVEL-2 (TX-RAMP Level 2)
-- Publisher: TX-RAMP | Jurisdiction: US - TX
-- Requirements: 223 | Mappings: 285
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

INSERT INTO scf_frameworks (scf_version_id, framework_id, name, publisher, jurisdiction, status, is_synthetic)
SELECT
  v.id,
  'TX-LEVEL-2',
  'TX-RAMP Level 2',
  'TX-RAMP',
  'US - TX',
  'active',
  false
FROM scf_versions v
ORDER BY v.created_at DESC
LIMIT 1
ON CONFLICT (scf_version_id, framework_id) DO UPDATE SET
  name = EXCLUDED.name,
  publisher = EXCLUDED.publisher,
  jurisdiction = EXCLUDED.jurisdiction;

INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-01',
  'AC-01',
  1,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-02',
  'AC-02',
  2,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-02 (03)',
  'AC-02 (03)',
  3,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-02 (05)',
  'AC-02 (05)',
  4,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-02 (07)',
  'AC-02 (07)',
  5,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-02 (09)',
  'AC-02 (09)',
  6,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-02 (12)',
  'AC-02 (12)',
  7,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-03',
  'AC-03',
  8,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-04',
  'AC-04',
  9,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-05',
  'AC-05',
  10,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-06',
  'AC-06',
  11,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-06 (01)',
  'AC-06 (01)',
  12,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-06 (02)',
  'AC-06 (02)',
  13,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-06 (05)',
  'AC-06 (05)',
  14,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-06 (07)',
  'AC-06 (07)',
  15,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-06 (09)',
  'AC-06 (09)',
  16,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-06 (10)',
  'AC-06 (10)',
  17,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-07',
  'AC-07',
  18,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-11',
  'AC-11',
  19,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-12',
  'AC-12',
  20,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-14',
  'AC-14',
  21,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-17',
  'AC-17',
  22,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-17 (01)',
  'AC-17 (01)',
  23,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-17 (02)',
  'AC-17 (02)',
  24,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-17 (03)',
  'AC-17 (03)',
  25,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-17 (04)',
  'AC-17 (04)',
  26,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-17 (09)',
  'AC-17 (09)',
  27,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-18',
  'AC-18',
  28,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-19',
  'AC-19',
  29,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-19 (05)',
  'AC-19 (05)',
  30,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-20',
  'AC-20',
  31,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-20 (01)',
  'AC-20 (01)',
  32,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-22',
  'AC-22',
  33,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AT-01',
  'AT-01',
  34,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AT-02',
  'AT-02',
  35,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AT-02 (02)',
  'AT-02 (02)',
  36,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AT-02 (03)',
  'AT-02 (03)',
  37,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AT-03',
  'AT-03',
  38,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AT-04',
  'AT-04',
  39,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AU-01',
  'AU-01',
  40,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AU-02',
  'AU-02',
  41,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AU-03',
  'AU-03',
  42,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AU-03 (01)',
  'AU-03 (01)',
  43,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AU-04',
  'AU-04',
  44,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AU-05',
  'AU-05',
  45,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AU-06',
  'AU-06',
  46,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AU-08',
  'AU-08',
  47,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AU-09',
  'AU-09',
  48,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AU-11',
  'AU-11',
  49,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AU-12',
  'AU-12',
  50,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CA-01',
  'CA-01',
  51,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CA-02',
  'CA-02',
  52,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CA-03',
  'CA-03',
  53,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CA-05',
  'CA-05',
  54,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CA-06',
  'CA-06',
  55,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CA-07',
  'CA-07',
  56,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CA-07 (04)',
  'CA-07 (04)',
  57,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CA-08',
  'CA-08',
  58,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CA-09',
  'CA-09',
  59,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-01',
  'CM-01',
  60,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-02',
  'CM-02',
  61,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-02 (03)',
  'CM-02 (03)',
  62,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-03',
  'CM-03',
  63,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-03 (02)',
  'CM-03 (02)',
  64,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-03 (04)',
  'CM-03 (04)',
  65,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-04',
  'CM-04',
  66,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-04 (02)',
  'CM-04 (02)',
  67,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-05',
  'CM-05',
  68,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-05 (05)',
  'CM-05 (05)',
  69,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-06',
  'CM-06',
  70,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-07',
  'CM-07',
  71,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-07 (01)',
  'CM-07 (01)',
  72,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-07 (02)',
  'CM-07 (02)',
  73,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-07 (05)',
  'CM-07 (05)',
  74,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-08',
  'CM-08',
  75,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-08 (01)',
  'CM-08 (01)',
  76,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-09',
  'CM-09',
  77,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-10',
  'CM-10',
  78,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-11',
  'CM-11',
  79,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-12',
  'CM-12',
  80,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CP-01',
  'CP-01',
  81,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CP-02',
  'CP-02',
  82,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CP-03',
  'CP-03',
  83,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CP-04',
  'CP-04',
  84,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CP-06',
  'CP-06',
  85,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CP-07',
  'CP-07',
  86,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CP-08',
  'CP-08',
  87,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CP-09',
  'CP-09',
  88,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CP-09 (01)',
  'CP-09 (01)',
  89,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CP-09 (08)',
  'CP-09 (08)',
  90,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CP-10',
  'CP-10',
  91,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IA-01',
  'IA-01',
  92,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IA-02',
  'IA-02',
  93,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IA-02 (01)',
  'IA-02 (01)',
  94,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IA-02 (08)',
  'IA-02 (08)',
  95,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IA-03',
  'IA-03',
  96,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IA-04',
  'IA-04',
  97,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IA-04 (04)',
  'IA-04 (04)',
  98,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IA-05',
  'IA-05',
  99,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IA-05 (01)',
  'IA-05 (01)',
  100,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IA-05 (02)',
  'IA-05 (02)',
  101,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IA-05 (06)',
  'IA-05 (06)',
  102,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IA-05 (07)',
  'IA-05 (07)',
  103,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IA-06',
  'IA-06',
  104,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IA-07',
  'IA-07',
  105,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IA-08',
  'IA-08',
  106,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IA-11',
  'IA-11',
  107,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IR-01',
  'IR-01',
  108,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IR-02',
  'IR-02',
  109,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IR-03',
  'IR-03',
  110,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IR-03 (02)',
  'IR-03 (02)',
  111,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IR-04',
  'IR-04',
  112,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IR-05',
  'IR-05',
  113,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IR-06',
  'IR-06',
  114,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IR-07',
  'IR-07',
  115,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IR-08',
  'IR-08',
  116,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IR-09',
  'IR-09',
  117,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'MA-01',
  'MA-01',
  118,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'MA-02',
  'MA-02',
  119,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'MA-03',
  'MA-03',
  120,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'MA-03 (01)',
  'MA-03 (01)',
  121,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'MA-03 (02)',
  'MA-03 (02)',
  122,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'MA-03 (03)',
  'MA-03 (03)',
  123,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'MA-04',
  'MA-04',
  124,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'MA-05',
  'MA-05',
  125,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'MA-06',
  'MA-06',
  126,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'MP-01',
  'MP-01',
  127,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'MP-02',
  'MP-02',
  128,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'MP-03',
  'MP-03',
  129,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'MP-04',
  'MP-04',
  130,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'MP-05',
  'MP-05',
  131,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'MP-06',
  'MP-06',
  132,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'MP-07',
  'MP-07',
  133,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PE-01',
  'PE-01',
  134,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PE-02',
  'PE-02',
  135,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PE-03',
  'PE-03',
  136,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PE-04',
  'PE-04',
  137,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PE-05',
  'PE-05',
  138,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PE-06',
  'PE-06',
  139,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PE-06 (01)',
  'PE-06 (01)',
  140,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PE-08',
  'PE-08',
  141,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PE-09',
  'PE-09',
  142,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PE-10',
  'PE-10',
  143,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PE-11',
  'PE-11',
  144,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PE-12',
  'PE-12',
  145,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PE-13',
  'PE-13',
  146,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PE-14',
  'PE-14',
  147,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PE-15',
  'PE-15',
  148,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PE-16',
  'PE-16',
  149,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PE-17',
  'PE-17',
  150,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PL-01',
  'PL-01',
  151,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PL-02',
  'PL-02',
  152,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PL-04',
  'PL-04',
  153,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PL-04 (01)',
  'PL-04 (01)',
  154,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PL-08',
  'PL-08',
  155,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PS-01',
  'PS-01',
  156,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PS-02',
  'PS-02',
  157,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PS-03',
  'PS-03',
  158,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PS-04',
  'PS-04',
  159,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PS-05',
  'PS-05',
  160,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PS-06',
  'PS-06',
  161,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PS-07',
  'PS-07',
  162,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PS-08',
  'PS-08',
  163,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'RA-01',
  'RA-01',
  164,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'RA-02',
  'RA-02',
  165,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'RA-03',
  'RA-03',
  166,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'RA-05',
  'RA-05',
  167,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'RA-05 (02)',
  'RA-05 (02)',
  168,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'RA-05 (03)',
  'RA-05 (03)',
  169,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'RA-05 (05)',
  'RA-05 (05)',
  170,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'RA-07',
  'RA-07',
  171,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SA-01',
  'SA-01',
  172,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SA-03',
  'SA-03',
  173,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SA-04',
  'SA-04',
  174,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SA-04 (01)',
  'SA-04 (01)',
  175,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SA-04 (02)',
  'SA-04 (02)',
  176,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SA-04 (09)',
  'SA-04 (09)',
  177,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SA-05',
  'SA-05',
  178,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SA-08',
  'SA-08',
  179,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SA-09',
  'SA-09',
  180,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SA-09 (02)',
  'SA-09 (02)',
  181,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SA-09 (05)',
  'SA-09 (05)',
  182,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SA-10',
  'SA-10',
  183,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SA-10 (01)',
  'SA-10 (01)',
  184,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SA-11',
  'SA-11',
  185,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SA-15',
  'SA-15',
  186,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SA-22',
  'SA-22',
  187,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-01',
  'SC-01',
  188,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-02',
  'SC-02',
  189,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-04',
  'SC-04',
  190,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-05',
  'SC-05',
  191,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-07',
  'SC-07',
  192,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-07 (03)',
  'SC-07 (03)',
  193,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-07 (04)',
  'SC-07 (04)',
  194,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-07 (05)',
  'SC-07 (05)',
  195,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-08',
  'SC-08',
  196,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-08 (01)',
  'SC-08 (01)',
  197,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-10',
  'SC-10',
  198,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-12',
  'SC-12',
  199,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-13',
  'SC-13',
  200,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-15',
  'SC-15',
  201,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-17',
  'SC-17',
  202,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-18',
  'SC-18',
  203,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-20',
  'SC-20',
  204,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-21',
  'SC-21',
  205,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-22',
  'SC-22',
  206,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-23',
  'SC-23',
  207,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-28',
  'SC-28',
  208,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-28 (01)',
  'SC-28 (01)',
  209,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-39',
  'SC-39',
  210,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SI-01',
  'SI-01',
  211,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SI-02',
  'SI-02',
  212,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SI-03',
  'SI-03',
  213,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SI-04',
  'SI-04',
  214,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SI-04 (04)',
  'SI-04 (04)',
  215,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SI-05',
  'SI-05',
  216,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SI-07',
  'SI-07',
  217,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SI-07 (01)',
  'SI-07 (01)',
  218,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SI-07 (07)',
  'SI-07 (07)',
  219,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SI-10',
  'SI-10',
  220,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SI-11',
  'SI-11',
  221,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SI-12',
  'SI-12',
  222,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SI-16',
  'SI-16',
  223,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-2'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;

INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AT-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AU-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CA-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CP-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IR-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MA-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MP-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PE-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PL-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PS-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'RA-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AT-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AU-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CA-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CP-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IR-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MA-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MP-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PE-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PL-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PS-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'RA-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'GOV-06' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IR-06'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'AST-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-08'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'AST-02.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-08 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'AST-02.3' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-08'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'AST-04' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PL-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'AST-04' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-04 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'AST-04' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-04 (02)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'AST-04.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-05'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'BCD-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CP-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'BCD-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CP-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'BCD-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CP-10'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'BCD-01.4' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CP-10'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'BCD-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CP-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'BCD-04' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CP-04'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'BCD-05' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CP-04'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'BCD-06' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CP-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'BCD-08' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CP-06'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'BCD-09' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CP-07'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'BCD-10' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CP-08'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'BCD-11' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CP-09'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'BCD-11.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CP-09 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'BCD-11.4' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CP-09 (08)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'BCD-11.4' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-28 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'BCD-12' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CP-10'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CAP-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-05'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CAP-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-05'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CAP-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-05'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CHG-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CHG-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CHG-02.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-03 (02)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CHG-02.3' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-03 (04)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CHG-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-04'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CHG-04' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-05'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CHG-04.3' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-05'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CHG-04.4' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-05 (05)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CHG-05' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-09'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CHG-06' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-03 (02)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CLD-09' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-09 (05)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CPL-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PL-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CPL-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CA-07'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CPL-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CA-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CPL-03.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CA-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CPL-03.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'RA-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CFG-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CFG-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-09'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CFG-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CFG-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-06'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CFG-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-08'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CFG-02.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CFG-02.3' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-02 (03)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CFG-02.7' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-06'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CFG-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-07'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CFG-03.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-07 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CFG-03.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-07 (02)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CFG-03.3' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-07 (05)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CFG-04' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-10'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CFG-05' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-11'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MON-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AU-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MON-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-04'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MON-01.3' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-04 (04)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MON-01.8' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AU-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MON-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AU-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MON-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AU-06'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MON-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-04'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MON-02.6' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AU-06'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MON-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AU-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MON-03.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AU-03 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MON-04' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AU-04'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MON-05' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AU-05'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MON-06' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AU-12'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MON-07' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AU-09'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MON-08' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AU-09'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MON-10' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AU-11'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MON-16' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-02 (12)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CRY-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-08 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CRY-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-13'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CRY-01.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-08 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CRY-01.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-13'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CRY-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-07'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CRY-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-08'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CRY-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-08 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CRY-04' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-08'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CRY-04' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-28 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CRY-05' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-13'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CRY-05' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-28'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CRY-05' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-28 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CRY-07' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-18'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CRY-08' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-12'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'CRY-08' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-17'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'DCH-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MP-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'DCH-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MP-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'DCH-04' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MP-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'DCH-04.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MP-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'DCH-06' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MP-04'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'DCH-07' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MP-05'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'DCH-07.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-28 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'DCH-08' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MP-06'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'DCH-09' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MP-06'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'DCH-09.3' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MP-06'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'DCH-10' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MP-07'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'DCH-10.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MP-07'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'DCH-13' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-20'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'DCH-13.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-20 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'DCH-15' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-22'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'DCH-18' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MP-07'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'DCH-18' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-12'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'DCH-19' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-09 (05)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'DCH-24' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-12'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'END-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MP-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'END-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-28'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'END-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-11'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'END-03.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-05'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'END-04' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'END-04.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'END-04.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'END-04.4' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'END-06' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-07'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'END-06.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-07 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'END-06.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-07 (07)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'END-10' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-18'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'END-14' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-15'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'HRS-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PS-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'HRS-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PS-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'HRS-03.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PS-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'HRS-04' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PS-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'HRS-05' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PL-04'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'HRS-05.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PL-04'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'HRS-05.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PL-04 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'HRS-05.3' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PL-04'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'HRS-06' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PS-06'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'HRS-06.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PS-06'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'HRS-07' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PS-08'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'HRS-08' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PS-05'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'HRS-09' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PS-04'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'HRS-10' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PS-07'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-01.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-04'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-01.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-04 (04)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-02.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-02 (08)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-08'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-04' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-06' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-02 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-06.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-02 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-06.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-02 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-06.3' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-02 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-06.4' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-02 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-07.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-08' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-02 (07)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-09' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-04'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-09.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-04 (04)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-09.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-04 (04)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-10' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-05'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-10' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-05 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-10.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-05 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-10.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-05 (02)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-10.4' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-05 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-10.5' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-05 (06)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-10.6' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-05 (07)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-10.7' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-02 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-10.8' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-05'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-11' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-06'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-12' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-07'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-14' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-11'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-15' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-15.3' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-02 (03)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-15.5' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-02 (09)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-17' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-06 (07)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-18' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-05 (06)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-20' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-20' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-06'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-21' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-06'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-21.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-06 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-21.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-06 (02)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-21.3' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-06 (05)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-21.4' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-06 (09)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-21.5' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-06 (10)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-22' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-07'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-24' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-02 (05)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-24' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-11'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-25' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-12'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAC-26' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-14'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IRO-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IR-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IRO-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IR-04'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IRO-04' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IR-08'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IRO-04.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IR-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IRO-05' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IR-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IRO-06' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IR-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IRO-06.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IR-03 (02)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IRO-09' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IR-05'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IRO-10' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IR-06'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IRO-11' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IR-07'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IRO-12' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IR-09'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IRO-12.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IR-09'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IRO-13' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IR-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IRO-14' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IR-06'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAO-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CA-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAO-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CA-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAO-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PL-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAO-03.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PL-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAO-05' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CA-05'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAO-06' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CA-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAO-06' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-04 (02)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'IAO-07' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CA-06'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MNT-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MA-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MNT-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MA-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MNT-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MA-06'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MNT-04' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MA-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MNT-04.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MA-03 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MNT-04.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MA-03 (02)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MNT-04.3' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MA-03 (03)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MNT-05' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MA-04'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MNT-05.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MA-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MNT-05.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MA-04'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MNT-05.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MA-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MNT-05.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MA-04'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MNT-06' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'MA-05'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MDM-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-19'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'MDM-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-19 (05)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-02.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-05'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-07'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-03.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-07 (03)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-03.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-07 (04)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-04' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-04'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-04.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-07 (05)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-05' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CA-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-05.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CA-09'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-07' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-10'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-09' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-23'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-10' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-20'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-10.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-22'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-10.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-21'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-12' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-12' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-12' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-12' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-04'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-12' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-05'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-12' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-07'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-12' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-10'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-14' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-17'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-14.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-17 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-14.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-17 (02)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-14.3' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-17 (03)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-14.4' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-17 (04)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-14.8' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-17 (09)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'NET-15' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-18'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'PES-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PE-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'PES-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PE-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'PES-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PE-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'PES-03.3' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PE-08'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'PES-05' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PE-06'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'PES-05.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PE-06 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'PES-07' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PE-09'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'PES-07.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PE-10'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'PES-07.3' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PE-11'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'PES-07.4' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PE-12'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'PES-07.5' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PE-15'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'PES-08' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PE-13'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'PES-09' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PE-14'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'PES-10' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PE-16'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'PES-11' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PE-17'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'PES-12.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PE-04'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'PES-12.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PE-05'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'PRI-05' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-12'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'PRM-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PL-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'PRM-04' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CA-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'PRM-07' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'RSK-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'RA-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'RSK-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'RA-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'RSK-04' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'RA-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'RSK-06.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'RA-07'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'RSK-11' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CA-07 (04)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'SEA-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-08'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'SEA-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'SEA-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'SEA-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PL-08'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'SEA-03.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'SEA-04' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-39'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'SEA-05' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SC-04'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'SEA-06' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CM-07 (02)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'SEA-07.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'SEA-10' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-16'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'SEA-20' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AU-08'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'SAT-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AT-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'SAT-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AT-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'SAT-02.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AT-02 (03)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'SAT-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AT-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'SAT-04' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AT-04'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TDA-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'PL-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TDA-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-01'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TDA-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-04'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TDA-02' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-04'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TDA-02.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-04 (09)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TDA-02.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'IA-02 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TDA-04' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-05'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TDA-04.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-04 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TDA-04.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-04 (02)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TDA-06' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TDA-06' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-15'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TDA-09' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-11'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TDA-14' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-10'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TDA-14.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-10 (01)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TDA-17' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-22'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TDA-17.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-22'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TDA-18' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TDA-18' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AC-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TDA-18' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TDA-18' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-04'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TDA-18' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-05'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TDA-18' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-07'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TDA-18' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-10'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TDA-19' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-11'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TDA-20' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-04 (02)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TPM-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-04'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TPM-04' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-09'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TPM-04.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-09 (02)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TPM-04.4' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-09 (05)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'TPM-10' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SA-04'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'THR-03' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-05'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'THR-05' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'AT-02 (02)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'VPM-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'VPM-01' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'VPM-05' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-02'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'VPM-05' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'SI-03'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'VPM-06' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'RA-05'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'VPM-06.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'RA-05'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'VPM-06.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'RA-05 (02)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'VPM-06.2' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'RA-05 (03)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'VPM-06.3' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'RA-05 (05)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;
INSERT INTO scf_mappings (scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official, status, is_synthetic)
SELECT
  r.scf_version_id,
  r.id,
  c.id,
  'related',
  'unknown',
  'official_scf',
  true,
  'active',
  false
FROM scf_framework_requirements r
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-2'
JOIN scf_controls c ON c.control_code = 'VPM-07' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'CA-08'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Framework: CD-2023 (CDPA 2023)
