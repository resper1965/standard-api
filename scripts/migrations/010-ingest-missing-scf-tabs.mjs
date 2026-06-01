// Migration 010: Create tables + ingest SCF Assessment Objectives, ERL, and Compensating Controls
// Direct to Neon SQL API
import XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const H = 'ep-blue-breeze-anyfua57.c-6.us-east-1.aws.neon.tech';
const CS = 'postgresql://neondb_owner:npg_REDACTED@' + H + '/neondb?sslmode=require';

async function sql(text) {
  const r = await fetch('https://' + H + '/sql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': CS },
    body: JSON.stringify({ query: text }),
  });
  const d = await r.json();
  if (d.message) throw new Error(d.message);
  return d;
}

const esc = (s) => (s ?? '').replace(/'/g, "''");
const norm = (raw) => raw.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_#&-]/g, '');

async function main() {
  const xlsxPath = resolve('evals/fixtures/scf-2026.1.1.xlsx');
  const data = readFileSync(xlsxPath);
  const wb = XLSX.read(data, { type: 'buffer' });

  // Get the current SCF version ID
  const verResult = await sql("SELECT id FROM scf_versions ORDER BY created_at DESC LIMIT 1");
  const scfVersionId = verResult.rows?.[0]?.id;
  if (!scfVersionId) throw new Error("No SCF version found in DB");
  console.log(`[010] SCF Version ID: ${scfVersionId}`);

  // ═══════════════════════════════════════════════════════════════
  // 1. ASSESSMENT OBJECTIVES (5,783 AOs)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n[010] === ASSESSMENT OBJECTIVES ===');
  
  await sql(`
    CREATE TABLE IF NOT EXISTS scf_assessment_objectives (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      scf_version_id TEXT NOT NULL,
      control_code TEXT NOT NULL,
      ao_number TEXT NOT NULL,
      ao_text TEXT NOT NULL,
      pptdf_applicability TEXT,
      ao_origin TEXT,
      assessment_rigor TEXT,
      scf_defined_parameters TEXT,
      org_defined_parameters TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(scf_version_id, ao_number)
    )
  `);
  await sql("CREATE INDEX IF NOT EXISTS idx_scf_ao_control ON scf_assessment_objectives(control_code)");
  await sql("CREATE INDEX IF NOT EXISTS idx_scf_ao_version ON scf_assessment_objectives(scf_version_id)");
  console.log('[010] Table scf_assessment_objectives created');

  const aoSheet = wb.Sheets['Assessment Objectives 2026.1'];
  const aoRows = XLSX.utils.sheet_to_json(aoSheet, { defval: '', raw: false });
  
  let aoCount = 0, aoFail = 0;
  // The header for AO text is very long — find it by position
  const aoTextKey = Object.keys(aoRows[0]).find(k => norm(k).includes('assessment_objective_ao_in'));
  
  for (const row of aoRows) {
    const controlCode = row['SCF #']?.trim();
    const aoNumber = row['SCF AO #']?.trim();
    const aoText = row[aoTextKey]?.trim();
    if (!controlCode || !aoNumber || !aoText) continue;
    
    const pptdf = row['PPTDF | Applicability']?.trim() || '';
    const origin = row['SCF Assessment Objective (AO) Origin(s)']?.trim() || '';
    const rigor = row['Assessment | Rigor (AR)']?.trim() || '';
    const sdp = row['SCF Defined Parameters (SDP)']?.trim() || '';
    const odp = row['Organization Defined Parameters (ODP)']?.trim() || '';
    const notes = row['Notes / Errata']?.trim() || '';

    try {
      await sql(`INSERT INTO scf_assessment_objectives 
        (scf_version_id, control_code, ao_number, ao_text, pptdf_applicability, ao_origin, assessment_rigor, scf_defined_parameters, org_defined_parameters, notes) 
        VALUES ('${esc(scfVersionId)}', '${esc(controlCode)}', '${esc(aoNumber)}', '${esc(aoText)}', '${esc(pptdf)}', '${esc(origin)}', '${esc(rigor)}', '${esc(sdp)}', '${esc(odp)}', '${esc(notes)}')
        ON CONFLICT (scf_version_id, ao_number) DO UPDATE SET ao_text = EXCLUDED.ao_text, updated_at = NOW()`);
      aoCount++;
    } catch (e) {
      if (aoFail < 3) console.error(`  [AO FAIL] ${aoNumber}: ${e.message}`);
      aoFail++;
    }
    if (aoCount % 500 === 0) process.stdout.write(`  [AO: ${aoCount}/${aoRows.length}]\r`);
  }
  console.log(`\n[010] AOs: ${aoCount} ok, ${aoFail} failed`);

  // ═══════════════════════════════════════════════════════════════
  // 2. EVIDENCE REQUEST LIST (303 ERLs)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n[010] === EVIDENCE REQUEST LIST ===');
  
  await sql(`
    CREATE TABLE IF NOT EXISTS scf_evidence_request_list (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      scf_version_id TEXT NOT NULL,
      erl_number TEXT NOT NULL,
      area_of_focus TEXT NOT NULL,
      documentation_artifact TEXT NOT NULL,
      artifact_description TEXT,
      scf_control_mappings TEXT,
      cmmc_l2_control TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(scf_version_id, erl_number)
    )
  `);
  await sql("CREATE INDEX IF NOT EXISTS idx_scf_erl_version ON scf_evidence_request_list(scf_version_id)");
  console.log('[010] Table scf_evidence_request_list created');

  const erlSheet = wb.Sheets['Evidence Request List 2026.1'];
  const erlRows = XLSX.utils.sheet_to_json(erlSheet, { defval: '', raw: false });
  
  let erlCount = 0, erlFail = 0;
  for (const row of erlRows) {
    const erlNumber = row['ERL #']?.trim();
    const areaOfFocus = row['Area of Focus']?.trim();
    const docArtifact = row['Documentation Artifact']?.trim();
    const description = row['Artifact Description']?.trim() || '';
    const mappings = row['SCF Control Mappings']?.trim() || '';
    const cmmc = row['Relevant | CMMC 2.0 L2 Control']?.trim() || '';
    
    if (!erlNumber || !areaOfFocus) continue;

    try {
      await sql(`INSERT INTO scf_evidence_request_list
        (scf_version_id, erl_number, area_of_focus, documentation_artifact, artifact_description, scf_control_mappings, cmmc_l2_control)
        VALUES ('${esc(scfVersionId)}', '${esc(erlNumber)}', '${esc(areaOfFocus)}', '${esc(docArtifact)}', '${esc(description)}', '${esc(mappings)}', '${esc(cmmc)}')
        ON CONFLICT (scf_version_id, erl_number) DO UPDATE SET artifact_description = EXCLUDED.artifact_description, updated_at = NOW()`);
      erlCount++;
    } catch (e) {
      if (erlFail < 3) console.error(`  [ERL FAIL] ${erlNumber}: ${e.message}`);
      erlFail++;
    }
  }
  console.log(`[010] ERLs: ${erlCount} ok, ${erlFail} failed`);

  // ═══════════════════════════════════════════════════════════════
  // 3. COMPENSATING CONTROLS (1,468)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n[010] === COMPENSATING CONTROLS ===');
  
  await sql(`
    CREATE TABLE IF NOT EXISTS scf_compensating_controls (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      scf_version_id TEXT NOT NULL,
      control_code TEXT NOT NULL,
      control_name TEXT,
      pptdf_applicability TEXT,
      risk_if_not_implemented TEXT,
      comp_control_1_code TEXT,
      comp_control_1_name TEXT,
      comp_control_1_justification TEXT,
      comp_control_2_code TEXT,
      comp_control_2_name TEXT,
      comp_control_2_justification TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(scf_version_id, control_code)
    )
  `);
  await sql("CREATE INDEX IF NOT EXISTS idx_scf_cc_control ON scf_compensating_controls(control_code)");
  console.log('[010] Table scf_compensating_controls created');

  const ccSheet = wb.Sheets['Compensating Controls 2026.1'];
  const ccRows = XLSX.utils.sheet_to_json(ccSheet, { defval: '', raw: false });
  
  // Handle duplicate column names (Compensating Control Name appears twice)
  // SheetJS auto-suffixes with _1 for duplicates
  let ccCount = 0, ccFail = 0;
  for (const row of ccRows) {
    const controlCode = row['SCF Control #']?.trim();
    if (!controlCode) continue;
    
    const controlName = row['SCF Control Name']?.trim() || '';
    const pptdf = row['PPTDF | Applicability']?.trim() || '';
    const risk = row['Risk if Primary Control | Not Implemented']?.trim() || '';
    
    // First compensating control
    const cc1Code = row['Compensating Control #']?.trim() || '';
    const cc1Name = row['Compensating Control Name']?.trim() || '';
    const cc1Just = row['Compensating Control Justification']?.trim() || '';
    
    // Second compensating control (SheetJS adds _1 suffix for duplicates)
    const cc2Code = row['Compensating Control #_1']?.trim() || row['Compensating Control #_2']?.trim() || '';
    const cc2Name = row['Compensating Control Name_1']?.trim() || row['Compensating Control Name_2']?.trim() || '';
    const cc2Just = row['Compensating Control Justification_1']?.trim() || row['Compensating Control Justification_2']?.trim() || '';

    try {
      await sql(`INSERT INTO scf_compensating_controls
        (scf_version_id, control_code, control_name, pptdf_applicability, risk_if_not_implemented,
         comp_control_1_code, comp_control_1_name, comp_control_1_justification,
         comp_control_2_code, comp_control_2_name, comp_control_2_justification)
        VALUES ('${esc(scfVersionId)}', '${esc(controlCode)}', '${esc(controlName)}', '${esc(pptdf)}', '${esc(risk)}',
                '${esc(cc1Code)}', '${esc(cc1Name)}', '${esc(cc1Just)}',
                '${esc(cc2Code)}', '${esc(cc2Name)}', '${esc(cc2Just)}')
        ON CONFLICT (scf_version_id, control_code) DO UPDATE SET risk_if_not_implemented = EXCLUDED.risk_if_not_implemented, updated_at = NOW()`);
      ccCount++;
    } catch (e) {
      if (ccFail < 3) console.error(`  [CC FAIL] ${controlCode}: ${e.message}`);
      ccFail++;
    }
    if (ccCount % 200 === 0) process.stdout.write(`  [CC: ${ccCount}/${ccRows.length}]\r`);
  }
  console.log(`\n[010] Compensating Controls: ${ccCount} ok, ${ccFail} failed`);

  // ═══════════════════════════════════════════════════════════════
  // 4. THREAT CATALOG (49 entries — semi-structured)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n[010] === THREAT CATALOG ===');
  
  await sql(`
    CREATE TABLE IF NOT EXISTS scf_threat_catalog (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      scf_version_id TEXT NOT NULL,
      threat_name TEXT NOT NULL,
      threat_description TEXT,
      raw_row JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('[010] Table scf_threat_catalog created');

  const threatSheet = wb.Sheets['Threat Catalog'];
  const threatRange = XLSX.utils.decode_range(threatSheet['!ref'] ?? 'A1');
  
  // Parse manually — merged cells, irregular structure
  let threatCount = 0;
  for (let r = 1; r <= threatRange.e.r; r++) {
    const cellA = threatSheet[XLSX.utils.encode_cell({ r, c: 0 })];
    const text = cellA?.v ? String(cellA.v).trim() : '';
    if (!text || text.startsWith('*') || text.startsWith('noun')) continue;
    
    // Collect all non-empty cells in this row
    const rowData = {};
    for (let c = 0; c <= threatRange.e.c; c++) {
      const cell = threatSheet[XLSX.utils.encode_cell({ r, c })];
      if (cell?.v) rowData[`col_${c}`] = String(cell.v).trim();
    }
    
    try {
      await sql(`INSERT INTO scf_threat_catalog (scf_version_id, threat_name, threat_description, raw_row) 
        VALUES ('${esc(scfVersionId)}', '${esc(text.substring(0, 200))}', '${esc(text)}', '${esc(JSON.stringify(rowData))}')`);
      threatCount++;
    } catch (e) {
      // skip
    }
  }
  console.log(`[010] Threats: ${threatCount}`);

  // ═══════════════════════════════════════════════════════════════
  // 5. RISK CATALOG (47 entries — semi-structured)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n[010] === RISK CATALOG ===');
  
  await sql(`
    CREATE TABLE IF NOT EXISTS scf_risk_catalog (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      scf_version_id TEXT NOT NULL,
      risk_name TEXT NOT NULL,
      risk_description TEXT,
      raw_row JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('[010] Table scf_risk_catalog created');

  const riskSheet = wb.Sheets['Risk Catalog'];
  const riskRange = XLSX.utils.decode_range(riskSheet['!ref'] ?? 'A1');
  
  let riskCount = 0;
  for (let r = 1; r <= riskRange.e.r; r++) {
    const cellA = riskSheet[XLSX.utils.encode_cell({ r, c: 0 })];
    const text = cellA?.v ? String(cellA.v).trim() : '';
    if (!text || text.startsWith('*') || text.startsWith('noun')) continue;
    
    const rowData = {};
    for (let c = 0; c <= riskRange.e.c; c++) {
      const cell = riskSheet[XLSX.utils.encode_cell({ r, c })];
      if (cell?.v) rowData[`col_${c}`] = String(cell.v).trim();
    }
    
    try {
      await sql(`INSERT INTO scf_risk_catalog (scf_version_id, risk_name, risk_description, raw_row) 
        VALUES ('${esc(scfVersionId)}', '${esc(text.substring(0, 200))}', '${esc(text)}', '${esc(JSON.stringify(rowData))}')`);
      riskCount++;
    } catch (e) {
      // skip
    }
  }
  console.log(`[010] Risks: ${riskCount}`);

  // ═══════════════════════════════════════════════════════════════
  // FINAL VERIFICATION
  // ═══════════════════════════════════════════════════════════════
  console.log('\n[010] ═══ FINAL VERIFICATION ═══');
  const counts = [
    ['scf_controls', 'SELECT count(*) as n FROM scf_controls'],
    ['scf_frameworks', 'SELECT count(*) as n FROM scf_frameworks'],
    ['scf_mappings', 'SELECT count(*) as n FROM scf_mappings'],
    ['scf_assessment_objectives', 'SELECT count(*) as n FROM scf_assessment_objectives'],
    ['scf_evidence_request_list', 'SELECT count(*) as n FROM scf_evidence_request_list'],
    ['scf_compensating_controls', 'SELECT count(*) as n FROM scf_compensating_controls'],
    ['scf_threat_catalog', 'SELECT count(*) as n FROM scf_threat_catalog'],
    ['scf_risk_catalog', 'SELECT count(*) as n FROM scf_risk_catalog'],
  ];
  for (const [name, query] of counts) {
    const r = await sql(query);
    console.log(`  ${name}: ${r.rows?.[0]?.n ?? 'error'}`);
  }
}

main().catch(e => { console.error('[FATAL]', e); process.exit(1); });
