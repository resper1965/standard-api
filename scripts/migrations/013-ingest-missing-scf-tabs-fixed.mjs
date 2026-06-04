import XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../../.env") });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("❌ DATABASE_URL not found in environment");
  process.exit(1);
}

const sql = neon(dbUrl);

async function batchInsert(tableName, columns, rows, batchSize = 100) {
  if (rows.length === 0) return;
  console.log(`  Inserting ${rows.length} rows into ${tableName}...`);
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const placeholders = [];
    const values = [];
    
    chunk.forEach((row) => {
      const rowPlaceholders = [];
      row.forEach((val) => {
        values.push(val);
        rowPlaceholders.push(`$${values.length}`);
      });
      placeholders.push(`(${rowPlaceholders.join(', ')})`);
    });
    
    const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders.join(', ')}`;
    try {
      await sql(query, values);
    } catch (err) {
      console.warn(`  ⚠️ Batch insert failed for ${tableName} chunk (size ${chunk.length}). Falling back to row-by-row...`);
      for (const row of chunk) {
        const singlePlaceholders = row.map((_, idx) => `$${idx + 1}`);
        const singleQuery = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${singlePlaceholders.join(', ')})`;
        try {
          await sql(singleQuery, row);
        } catch (singleErr) {
          console.error(`  ❌ Individual insert failed: ${singleErr.message}`);
          console.error(`     Row values:`, row);
        }
      }
    }
  }
}

async function main() {
  console.log("🚀 Starting SCF support tables ingestion pipeline...");

  const xlsxPath = resolve(__dirname, "../../evals/fixtures/scf-2026.1.1.xlsx");
  console.log(`📂 Loading workbook: ${xlsxPath}`);
  const data = readFileSync(xlsxPath);
  const wb = XLSX.read(data, { type: 'buffer' });

  // 1. Dynamic lookup of the target version containing full controls list
  console.log("🔍 Finding the target SCF version containing the control catalog...");
  const verResult = await sql`
    SELECT scf_version_id, count(*) as count 
    FROM scf_controls 
    GROUP BY scf_version_id 
    ORDER BY count DESC 
    LIMIT 1
  `;
  
  if (verResult.length === 0) {
    throw new Error("No populated SCF version found in database controls catalog");
  }
  
  const scfVersionId = verResult[0].scf_version_id;
  const versionLabelRes = await sql`SELECT version FROM scf_versions WHERE id = ${scfVersionId}`;
  const versionLabel = versionLabelRes[0]?.version || 'Unknown';
  console.log(`🎯 Targeting SCF Version ID: ${scfVersionId} ("${versionLabel}") containing ${verResult[0].count} controls`);

  // Build a lookup map of control_code -> scf_controls.id for referential integrity
  console.log("🔍 Fetching scf_controls map from database...");
  const dbControls = await sql`SELECT id, control_code FROM scf_controls WHERE scf_version_id = ${scfVersionId}`;
  const controlMap = new Map(dbControls.map(c => [c.control_code.trim(), c.id]));
  console.log(`  Mapped ${controlMap.size} controls`);

  // Clear existing rows for this version to ensure idempotency and zero duplicates
  console.log("🧹 Clearing existing support tables data for this version...");
  await sql`DELETE FROM scf_assessment_objectives WHERE scf_version_id = ${scfVersionId}`;
  await sql`DELETE FROM scf_evidence_request_list WHERE scf_version_id = ${scfVersionId}`;
  await sql`DELETE FROM scf_compensating_controls WHERE scf_version_id = ${scfVersionId}`;
  await sql`DELETE FROM scf_threat_catalog WHERE scf_version_id = ${scfVersionId}`;
  await sql`DELETE FROM scf_risk_catalog WHERE scf_version_id = ${scfVersionId}`;
  await sql`DELETE FROM scf_control_metadata WHERE scf_version_id = ${scfVersionId}`;
  console.log("  Database cleared successfully.");

  // ═══════════════════════════════════════════════════════════════
  // 1. ASSESSMENT OBJECTIVES (AOs)
  // ═══════════════════════════════════════════════════════════════
  console.log("\n📦 Ingesting Assessment Objectives...");
  const aoSheet = wb.Sheets['Assessment Objectives 2026.1'];
  const aoRows = XLSX.utils.sheet_to_json(aoSheet, { defval: '', raw: false });
  
  // Find aoTextKey dynamically
  let aoTextKey = null;
  if (aoRows.length > 0) {
    aoTextKey = Object.keys(aoRows[0]).find(k => 
      k.toLowerCase().replace(/[^a-z0-9]/g, '').includes('assessmentobjectiveaoin')
    );
  }
  
  const aoInserts = [];
  for (const row of aoRows) {
    const controlCode = row['SCF #']?.trim();
    const aoNumber = row['SCF AO #']?.trim();
    const aoText = aoTextKey ? row[aoTextKey]?.trim() : '';
    if (!controlCode || !aoNumber || !aoText) continue;
    
    const pptdf = row['PPTDF | Applicability']?.trim() || '';
    const origin = row['SCF Assessment Objective (AO) Origin(s)']?.trim() || '';
    const rigor = row['Assessment | Rigor (AR)']?.trim() || '';
    const sdp = row['SCF Defined Parameters (SDP)']?.trim() || '';
    const odp = row['Organization Defined Parameters (ODP)']?.trim() || '';
    const notes = row['Notes / Errata']?.trim() || '';
    
    aoInserts.push([
      scfVersionId, controlCode, aoNumber, aoText, pptdf, origin, rigor, sdp, odp, notes
    ]);
  }
  
  await batchInsert('scf_assessment_objectives', [
    'scf_version_id', 'control_code', 'ao_number', 'ao_text', 'pptdf_applicability',
    'ao_origin', 'assessment_rigor', 'scf_defined_parameters', 'org_defined_parameters', 'notes'
  ], aoInserts, 200);

  // ═══════════════════════════════════════════════════════════════
  // 2. EVIDENCE REQUEST LIST (ERLs)
  // ═══════════════════════════════════════════════════════════════
  console.log("\n📦 Ingesting Evidence Request List...");
  const erlSheet = wb.Sheets['Evidence Request List 2026.1'];
  const erlRows = XLSX.utils.sheet_to_json(erlSheet, { defval: '', raw: false });
  
  const erlInserts = [];
  for (const row of erlRows) {
    const erlNumber = row['ERL #']?.trim();
    const areaOfFocus = row['Area of Focus']?.trim();
    const docArtifact = row['Documentation Artifact']?.trim();
    const description = row['Artifact Description']?.trim() || '';
    const mappings = row['SCF Control Mappings']?.trim() || '';
    const cmmc = row['Relevant | CMMC 2.0 L2 Control']?.trim() || '';
    
    if (!erlNumber || !areaOfFocus) continue;
    
    erlInserts.push([
      scfVersionId, erlNumber, areaOfFocus, docArtifact, description, mappings, cmmc
    ]);
  }
  
  await batchInsert('scf_evidence_request_list', [
    'scf_version_id', 'erl_number', 'area_of_focus', 'documentation_artifact',
    'artifact_description', 'scf_control_mappings', 'cmmc_l2_control'
  ], erlInserts, 150);

  // ═══════════════════════════════════════════════════════════════
  // 3. COMPENSATING CONTROLS
  // ═══════════════════════════════════════════════════════════════
  console.log("\n📦 Ingesting Compensating Controls...");
  const ccSheet = wb.Sheets['Compensating Controls 2026.1'];
  const ccRows = XLSX.utils.sheet_to_json(ccSheet, { defval: '', raw: false });
  
  const ccInserts = [];
  for (const row of ccRows) {
    const controlCode = row['SCF Control #']?.trim();
    if (!controlCode) continue;
    
    const controlName = row['SCF Control Name']?.trim() || '';
    const pptdf = row['PPTDF\nApplicability']?.trim() || row['PPTDF | Applicability']?.trim() || '';
    const risk = row['Risk if Primary Control\nNot Implemented']?.trim() || row['Risk if Primary Control | Not Implemented']?.trim() || '';
    
    const cc1Code = row['Compensating Control #']?.trim() || '';
    const cc1Name = row['Compensating Control Name']?.trim() || '';
    const cc1Just = row['Compensating Control Justification']?.trim() || '';
    
    const cc2Code = row['Compensating Control #_1']?.trim() || row['Compensating Control #_2']?.trim() || '';
    const cc2Name = row['Compensating Control Name_1']?.trim() || row['Compensating Control Name_2']?.trim() || '';
    const cc2Just = row['Compensating Control Justification_1']?.trim() || row['Compensating Control Justification_2']?.trim() || '';
    
    ccInserts.push([
      scfVersionId, controlCode, controlName, pptdf, risk,
      cc1Code, cc1Name, cc1Just,
      cc2Code, cc2Name, cc2Just
    ]);
  }
  
  await batchInsert('scf_compensating_controls', [
    'scf_version_id', 'control_code', 'control_name', 'pptdf_applicability', 'risk_if_not_implemented',
    'comp_control_1_code', 'comp_control_1_name', 'comp_control_1_justification',
    'comp_control_2_code', 'comp_control_2_name', 'comp_control_2_justification'
  ], ccInserts, 150);

  // ═══════════════════════════════════════════════════════════════
  // 4. THREAT CATALOG (Merged cell grouping handled correctly)
  // ═══════════════════════════════════════════════════════════════
  console.log("\n📦 Ingesting Threat Catalog...");
  const threatSheet = wb.Sheets['Threat Catalog'];
  const threatRange = XLSX.utils.decode_range(threatSheet['!ref'] ?? 'A1');
  
  let currentThreatGrouping = '';
  const threatInserts = [];
  
  for (let r = 6; r <= threatRange.e.r; r++) {
    const valA = threatSheet[XLSX.utils.encode_cell({ r, c: 0 })]?.v;
    if (valA !== undefined && valA !== null && String(valA).trim() !== '') {
      currentThreatGrouping = String(valA).trim();
    }
    
    const threatNo = threatSheet[XLSX.utils.encode_cell({ r, c: 1 })]?.v;
    const threatName = threatSheet[XLSX.utils.encode_cell({ r, c: 2 })]?.v;
    const threatDesc = threatSheet[XLSX.utils.encode_cell({ r, c: 3 })]?.v;
    
    const threatNoStr = threatNo ? String(threatNo).trim() : '';
    const threatNameStr = threatName ? String(threatName).trim() : '';
    const threatDescStr = threatDesc ? String(threatDesc).trim() : '';
    
    if (!threatNoStr || !threatNameStr) continue;
    
    const rawRow = {
      threat_grouping: currentThreatGrouping,
      threat_no: threatNoStr,
      threat_name: threatNameStr,
      threat_description: threatDescStr,
    };
    for (let c = 4; c <= threatRange.e.c; c++) {
      const cellVal = threatSheet[XLSX.utils.encode_cell({ r, c })]?.v;
      if (cellVal !== undefined && cellVal !== null) {
        rawRow[`col_${c}`] = String(cellVal).trim();
      }
    }
    
    threatInserts.push([
      scfVersionId, threatNameStr, threatDescStr, JSON.stringify(rawRow)
    ]);
  }
  
  await batchInsert('scf_threat_catalog', [
    'scf_version_id', 'threat_name', 'threat_description', 'raw_row'
  ], threatInserts, 50);

  // ═══════════════════════════════════════════════════════════════
  // 5. RISK CATALOG (Merged cell grouping handled correctly)
  // ═══════════════════════════════════════════════════════════════
  console.log("\n📦 Ingesting Risk Catalog...");
  const riskSheet = wb.Sheets['Risk Catalog'];
  const riskRange = XLSX.utils.decode_range(riskSheet['!ref'] ?? 'A1');
  
  let currentRiskGrouping = '';
  const riskInserts = [];
  
  for (let r = 6; r <= riskRange.e.r; r++) {
    const valA = riskSheet[XLSX.utils.encode_cell({ r, c: 0 })]?.v;
    if (valA !== undefined && valA !== null && String(valA).trim() !== '') {
      currentRiskGrouping = String(valA).trim();
    }
    
    const riskNo = riskSheet[XLSX.utils.encode_cell({ r, c: 1 })]?.v;
    const riskName = riskSheet[XLSX.utils.encode_cell({ r, c: 2 })]?.v;
    const riskDesc = riskSheet[XLSX.utils.encode_cell({ r, c: 3 })]?.v;
    
    const riskNoStr = riskNo ? String(riskNo).trim() : '';
    const riskNameStr = riskName ? String(riskName).trim() : '';
    const riskDescStr = riskDesc ? String(riskDesc).trim() : '';
    
    if (!riskNoStr || !riskNameStr) continue;
    
    const rawRow = {
      risk_grouping: currentRiskGrouping,
      risk_no: riskNoStr,
      risk_name: riskNameStr,
      risk_description: riskDescStr,
    };
    for (let c = 4; c <= riskRange.e.c; c++) {
      const cellVal = riskSheet[XLSX.utils.encode_cell({ r, c })]?.v;
      if (cellVal !== undefined && cellVal !== null) {
        rawRow[`col_${c}`] = String(cellVal).trim();
      }
    }
    
    riskInserts.push([
      scfVersionId, riskNameStr, riskDescStr, JSON.stringify(rawRow)
    ]);
  }
  
  await batchInsert('scf_risk_catalog', [
    'scf_version_id', 'risk_name', 'risk_description', 'raw_row'
  ], riskInserts, 50);

  // ═══════════════════════════════════════════════════════════════
  // 6. CONTROL METADATA (Linked to scf_controls.id)
  // ═══════════════════════════════════════════════════════════════
  console.log("\n📦 Ingesting Control Metadata...");
  const controlsSheet = wb.Sheets['SCF 2026.1'];
  const controlsRange = XLSX.utils.decode_range(controlsSheet['!ref'] ?? 'A1');
  
  const headers = [];
  for (let col = controlsRange.s.c; col <= controlsRange.e.c; col++) {
    const cell = controlsSheet[XLSX.utils.encode_cell({ r: controlsRange.s.r, c: col })];
    headers.push(cell?.v != null ? String(cell.v).trim() : "");
  }
  
  // Find Threat columns dynamically
  const threatCols = [];
  headers.forEach((h, colIdx) => {
    const cleanHeader = h.replace(/\r?\n/g, ' ').trim();
    if (cleanHeader.startsWith("Threat ")) {
      const threatCode = cleanHeader.substring(7).trim();
      threatCols.push({ colIdx, threatCode });
    }
  });
  console.log(`  Found ${threatCols.length} threat columns in controls sheet.`);

  const metadataInserts = [];
  let skipCount = 0;

  for (let r = controlsRange.s.r + 1; r <= controlsRange.e.r; r++) {
    const controlCodeVal = controlsSheet[XLSX.utils.encode_cell({ r, c: 2 })]?.v;
    if (!controlCodeVal || typeof controlCodeVal !== 'string' || !controlCodeVal.includes('-')) continue;
    
    const controlCode = controlCodeVal.trim();
    const controlId = controlMap.get(controlCode);
    
    if (!controlId) {
      skipCount++;
      continue;
    }
    
    // Relative Control Weighting (col index 12)
    const rawWeight = controlsSheet[XLSX.utils.encode_cell({ r, c: 12 })]?.v;
    const parsedWeight = parseFloat(rawWeight);
    const weight = isNaN(parsedWeight) ? 0.000 : parsedWeight;
    
    // Threat tags
    const threatTags = [];
    for (const { colIdx, threatCode } of threatCols) {
      const cellVal = controlsSheet[XLSX.utils.encode_cell({ r, c: colIdx })]?.v;
      if (cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== '') {
        threatTags.push(threatCode);
      }
    }
    
    // Maturity levels (levels 0-5)
    const maturityGuidance = {
      level_0: controlsSheet[XLSX.utils.encode_cell({ r, c: 18 })]?.v ? String(controlsSheet[XLSX.utils.encode_cell({ r, c: 18 })]?.v).trim() : '',
      level_1: controlsSheet[XLSX.utils.encode_cell({ r, c: 19 })]?.v ? String(controlsSheet[XLSX.utils.encode_cell({ r, c: 19 })]?.v).trim() : '',
      level_2: controlsSheet[XLSX.utils.encode_cell({ r, c: 20 })]?.v ? String(controlsSheet[XLSX.utils.encode_cell({ r, c: 20 })]?.v).trim() : '',
      level_3: controlsSheet[XLSX.utils.encode_cell({ r, c: 21 })]?.v ? String(controlsSheet[XLSX.utils.encode_cell({ r, c: 21 })]?.v).trim() : '',
      level_4: controlsSheet[XLSX.utils.encode_cell({ r, c: 22 })]?.v ? String(controlsSheet[XLSX.utils.encode_cell({ r, c: 22 })]?.v).trim() : '',
      level_5: controlsSheet[XLSX.utils.encode_cell({ r, c: 23 })]?.v ? String(controlsSheet[XLSX.utils.encode_cell({ r, c: 23 })]?.v).trim() : '',
    };
    
    // Official SCF records have tenant_id = null and organization_id = null
    metadataInserts.push([
      scfVersionId, controlId, weight, JSON.stringify(threatTags), JSON.stringify(maturityGuidance), null, null
    ]);
  }
  
  if (skipCount > 0) {
    console.warn(`  ⚠️ Skipped ${skipCount} metadata rows because control was not found in the db controls table`);
  }

  await batchInsert('scf_control_metadata', [
    'scf_version_id', 'scf_control_id', 'risk_weight', 'threat_tags', 'maturity_guidance', 'tenant_id', 'organization_id'
  ], metadataInserts, 150);

  // ═══════════════════════════════════════════════════════════════
  // VERIFICATION
  // ═══════════════════════════════════════════════════════════════
  console.log("\n📊 Verification: Checking counts in Neon database...");
  const verificationCounts = [
    ['scf_assessment_objectives', 'SELECT count(*) as count FROM scf_assessment_objectives'],
    ['scf_evidence_request_list', 'SELECT count(*) as count FROM scf_evidence_request_list'],
    ['scf_compensating_controls', 'SELECT count(*) as count FROM scf_compensating_controls'],
    ['scf_threat_catalog', 'SELECT count(*) as count FROM scf_threat_catalog'],
    ['scf_risk_catalog', 'SELECT count(*) as count FROM scf_risk_catalog'],
    ['scf_control_metadata', 'SELECT count(*) as count FROM scf_control_metadata']
  ];
  
  for (const [table, query] of verificationCounts) {
    const res = await sql(query);
    console.log(`  Count for ${table.padEnd(26)}: ${res[0].count} rows`);
  }

  console.log("\n🎉 SCF missing sub-tables ingestion complete!");
}

main().catch(err => {
  console.error("❌ Ingestion pipeline failed:", err);
  process.exit(1);
});
