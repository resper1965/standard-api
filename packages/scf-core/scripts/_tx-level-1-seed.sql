-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Framework: TX-LEVEL-1 (TX-RAMP Level 1)
-- Publisher: TX-RAMP | Jurisdiction: US - TX
-- Requirements: 117 | Mappings: 173
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

INSERT INTO scf_frameworks (scf_version_id, framework_id, name, publisher, jurisdiction, status, is_synthetic)
SELECT
  v.id,
  'TX-LEVEL-1',
  'TX-RAMP Level 1',
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
WHERE f.framework_id = 'TX-LEVEL-1'
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
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-03',
  'AC-03',
  3,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-07',
  'AC-07',
  4,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-14',
  'AC-14',
  5,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-17',
  'AC-17',
  6,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-18',
  'AC-18',
  7,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-19',
  'AC-19',
  8,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AC-20',
  'AC-20',
  9,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AT-01',
  'AT-01',
  10,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AT-02',
  'AT-02',
  11,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AT-03',
  'AT-03',
  12,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AT-04',
  'AT-04',
  13,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AU-01',
  'AU-01',
  14,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AU-02',
  'AU-02',
  15,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AU-03',
  'AU-03',
  16,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AU-04',
  'AU-04',
  17,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AU-05',
  'AU-05',
  18,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AU-06',
  'AU-06',
  19,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AU-08',
  'AU-08',
  20,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AU-09',
  'AU-09',
  21,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AU-11',
  'AU-11',
  22,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'AU-12',
  'AU-12',
  23,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CA-01',
  'CA-01',
  24,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CA-02',
  'CA-02',
  25,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CA-03',
  'CA-03',
  26,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CA-05',
  'CA-05',
  27,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CA-06',
  'CA-06',
  28,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CA-07',
  'CA-07',
  29,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CA-07 (04)',
  'CA-07 (04)',
  30,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CA-09',
  'CA-09',
  31,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-01',
  'CM-01',
  32,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-02',
  'CM-02',
  33,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-04',
  'CM-04',
  34,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-05',
  'CM-05',
  35,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-06',
  'CM-06',
  36,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-07',
  'CM-07',
  37,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-08',
  'CM-08',
  38,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-10',
  'CM-10',
  39,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CM-11',
  'CM-11',
  40,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CP-01',
  'CP-01',
  41,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CP-02',
  'CP-02',
  42,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CP-03',
  'CP-03',
  43,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CP-04',
  'CP-04',
  44,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CP-09',
  'CP-09',
  45,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'CP-10',
  'CP-10',
  46,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IA-01',
  'IA-01',
  47,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IA-02',
  'IA-02',
  48,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IA-02 (01)',
  'IA-02 (01)',
  49,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IA-04',
  'IA-04',
  50,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IA-05',
  'IA-05',
  51,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IA-05 (01)',
  'IA-05 (01)',
  52,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IA-06',
  'IA-06',
  53,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IA-07',
  'IA-07',
  54,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IA-08',
  'IA-08',
  55,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IA-11',
  'IA-11',
  56,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IR-01',
  'IR-01',
  57,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IR-02',
  'IR-02',
  58,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IR-04',
  'IR-04',
  59,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IR-05',
  'IR-05',
  60,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IR-06',
  'IR-06',
  61,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IR-07',
  'IR-07',
  62,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'IR-08',
  'IR-08',
  63,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'MA-01',
  'MA-01',
  64,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'MA-02',
  'MA-02',
  65,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'MA-04',
  'MA-04',
  66,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'MA-05',
  'MA-05',
  67,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'MP-01',
  'MP-01',
  68,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'MP-02',
  'MP-02',
  69,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'MP-06',
  'MP-06',
  70,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'MP-07',
  'MP-07',
  71,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PE-01',
  'PE-01',
  72,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PE-02',
  'PE-02',
  73,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PE-03',
  'PE-03',
  74,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PE-06',
  'PE-06',
  75,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PE-08',
  'PE-08',
  76,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PE-13',
  'PE-13',
  77,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PE-14',
  'PE-14',
  78,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PE-15',
  'PE-15',
  79,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PE-16',
  'PE-16',
  80,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PL-01',
  'PL-01',
  81,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PL-02',
  'PL-02',
  82,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PL-04',
  'PL-04',
  83,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PS-01',
  'PS-01',
  84,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PS-02',
  'PS-02',
  85,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PS-03',
  'PS-03',
  86,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PS-04',
  'PS-04',
  87,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PS-05',
  'PS-05',
  88,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PS-06',
  'PS-06',
  89,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PS-07',
  'PS-07',
  90,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'PS-08',
  'PS-08',
  91,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'RA-01',
  'RA-01',
  92,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'RA-02',
  'RA-02',
  93,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'RA-03',
  'RA-03',
  94,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'RA-05',
  'RA-05',
  95,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'RA-05 (02)',
  'RA-05 (02)',
  96,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'RA-07',
  'RA-07',
  97,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SA-01',
  'SA-01',
  98,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SA-03',
  'SA-03',
  99,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SA-04',
  'SA-04',
  100,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SA-05',
  'SA-05',
  101,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SA-09',
  'SA-09',
  102,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SA-22',
  'SA-22',
  103,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-01',
  'SC-01',
  104,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-05',
  'SC-05',
  105,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-07',
  'SC-07',
  106,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-12',
  'SC-12',
  107,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-20',
  'SC-20',
  108,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-21',
  'SC-21',
  109,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-22',
  'SC-22',
  110,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SC-39',
  'SC-39',
  111,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SI-01',
  'SI-01',
  112,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SI-02',
  'SI-02',
  113,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SI-03',
  'SI-03',
  114,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SI-04',
  'SI-04',
  115,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SI-05',
  'SI-05',
  116,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
ORDER BY f.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_id, requirement_code) DO NOTHING;
INSERT INTO scf_framework_requirements (scf_version_id, scf_framework_id, requirement_code, title, sort_order, status, is_synthetic)
SELECT
  f.scf_version_id,
  f.id,
  'SI-12',
  'SI-12',
  117,
  'active',
  false
FROM scf_frameworks f
WHERE f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
JOIN scf_controls c ON c.control_code = 'MON-07' AND c.scf_version_id = r.scf_version_id
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
JOIN scf_controls c ON c.control_code = 'TDA-06' AND c.scf_version_id = r.scf_version_id
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
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
JOIN scf_frameworks f ON f.id = r.scf_framework_id AND f.framework_id = 'TX-LEVEL-1'
JOIN scf_controls c ON c.control_code = 'VPM-06.1' AND c.scf_version_id = r.scf_version_id
WHERE r.requirement_code = 'RA-05 (02)'
ORDER BY r.created_at DESC
LIMIT 1
ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
