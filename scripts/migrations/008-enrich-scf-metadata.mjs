// Migration 008: Enrich SCF controls with metadata from XLSX 2026.1.1
// Standalone script — no TS imports needed
import XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const H = 'ep-blue-breeze-anyfua57.c-6.us-east-1.aws.neon.tech';
const CS = 'postgresql://neondb_owner:npg_T8MHv6EoDIGh@' + H + '/neondb?sslmode=require';

async function sql(text, params = []) {
  const body = params.length > 0 ? { query: text, params } : { query: text };
  const r = await fetch('https://' + H + '/sql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': CS },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (d.message) throw new Error(d.message);
  return d;
}

// Header normalization (same as xlsx-tab-parser.ts)
const norm = (raw) => raw.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_#&-]/g, '');

function parseSheetToRows(sheet) {
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
  return rawRows.map(raw => {
    const normalized = {};
    for (const [key, value] of Object.entries(raw)) {
      normalized[norm(key)] = String(value ?? '').trim();
    }
    return normalized;
  });
}

function findControlCode(row) {
  for (const key of ['scf_#', 'scf_control_#', 'control_#', 'scf_identifier', 'control_code']) {
    if (row[key]?.trim()) return row[key].trim();
  }
  return null;
}

function findDescription(row) {
  for (const key of ['scf_control_description', 'control_description', 'secure_controls_framework_scf_control_description']) {
    if (row[key]?.trim()?.length > 10) return row[key].trim();
  }
  // Fallback: any key with "control_description" 
  for (const [key, value] of Object.entries(row)) {
    if (key.includes('control_description') && value?.trim()?.length > 20) return value.trim();
  }
  return null;
}

function findQuestion(row) {
  for (const key of ['scf_control_question', 'control_question']) {
    if (row[key]?.trim()?.length > 5) return row[key].trim();
  }
  for (const [key, value] of Object.entries(row)) {
    if (key.includes('control_question') && value?.trim()?.length > 5) return value.trim();
  }
  return null;
}

function findWeight(row) {
  for (const key of ['relative_control_weighting', 'scf_control_weighting', 'control_weight']) {
    if (row[key]) {
      const v = parseFloat(row[key]);
      if (!isNaN(v)) return v;
    }
  }
  for (const [key, value] of Object.entries(row)) {
    if ((key.includes('weighting') || key === 'weight') && value) {
      const v = parseFloat(value);
      if (!isNaN(v)) return v;
    }
  }
  return null;
}

function findMaturity(row) {
  const levels = {};
  for (const [key, value] of Object.entries(row)) {
    if (!key.includes('scr-cmm') && !key.includes('spcmm') && !key.includes('sp-cmm')) continue;
    const v = value?.trim();
    if (!v) continue;
    if (key.includes('level_0') || key.includes('not_performed')) levels.L0 = v;
    else if (key.includes('level_1') || key.includes('performed_informally')) levels.L1 = v;
    else if (key.includes('level_2') || key.includes('planned')) levels.L2 = v;
    else if (key.includes('level_3') || key.includes('well_defined')) levels.L3 = v;
    else if (key.includes('level_4') || key.includes('quantitatively')) levels.L4 = v;
    else if (key.includes('level_5') || key.includes('continuously')) levels.L5 = v;
  }
  return Object.keys(levels).length > 0 ? JSON.stringify(levels) : null;
}

function extractDomain(controlCode) {
  const match = controlCode.match(/^([A-Z]{2,4})-\d+/);
  return match?.[1] ?? null;
}

async function main() {
  const xlsxPath = resolve('evals/fixtures/scf-2026.1.1.xlsx');
  console.log('[008] Reading:', xlsxPath);
  const data = readFileSync(xlsxPath);
  const wb = XLSX.read(data, { type: 'buffer' });
  console.log(`[008] Tabs: ${wb.SheetNames.length}`);

  // Find controls tab — the one with BOTH SCF # AND SCF Control AND description columns (369 cols)
  let sheet = null, tabName = null;
  for (const name of wb.SheetNames) {
    const s = wb.Sheets[name];
    if (!s) continue;
    const range = XLSX.utils.decode_range(s['!ref'] ?? 'A1');
    const headers = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = s[XLSX.utils.encode_cell({ r: range.s.r, c })];
      headers.push(cell?.v != null ? norm(String(cell.v)) : '');
    }
    const hasId = headers.some(h => h === 'scf_#' || h === 'scf_control_#');
    const hasControl = headers.some(h => h === 'scf_control');
    const hasDescription = headers.some(h => h.includes('control_description'));
    // Must have id + control name; prefer tabs with description column (the main catalog)
    if (hasId && hasControl && hasDescription) { sheet = s; tabName = name; break; }
    if (hasId && hasControl && !sheet) { sheet = s; tabName = name; }
  }

  if (!sheet) { console.error('[008] No controls tab!'); process.exit(1); }
  console.log(`[008] Controls tab: "${tabName}"`);

  const rows = parseSheetToRows(sheet);
  console.log(`[008] Parsed: ${rows.length} rows`);

  // Debug first control row
  const sample = rows.find(r => findControlCode(r));
  if (sample) {
    const code = findControlCode(sample);
    const desc = findDescription(sample);
    const q = findQuestion(sample);
    const w = findWeight(sample);
    const m = findMaturity(sample);
    console.log(`[008] Sample "${code}": desc=${desc?.length ?? 'null'} chars, q=${q?.length ?? 'null'} chars, w=${w ?? 'null'}, maturity=${m ? 'yes' : 'no'}`);
  }

  // Build updates
  const updates = [];
  for (const row of rows) {
    const code = findControlCode(row);
    if (!code || !extractDomain(code)) continue;
    const desc = findDescription(row);
    const q = findQuestion(row);
    const w = findWeight(row);
    const m = findMaturity(row);
    if (desc || q || w !== null || m) {
      updates.push({ code, desc, q, w, m });
    }
  }
  console.log(`[008] Controls to enrich: ${updates.length}`);

  let ok = 0, fail = 0;
  for (const u of updates) {
    try {
      // Build dynamic UPDATE using string interpolation (safe — values are from trusted XLSX)
      const parts = [];
      if (u.desc) parts.push(`description = '${u.desc.replace(/'/g, "''")}'`);
      if (u.q) parts.push(`control_question = '${u.q.replace(/'/g, "''")}'`);
      if (u.w !== null) parts.push(`control_weight = '${u.w}'`);
      if (u.m) parts.push(`maturity_criteria_ref = '${u.m.replace(/'/g, "''")}'`);
      parts.push(`updated_at = NOW()`);
      
      const query = `UPDATE scf_controls SET ${parts.join(', ')} WHERE control_code = '${u.code.replace(/'/g, "''")}'`;
      await sql(query);
      ok++;
    } catch (e) {
      console.error(`  [FAIL] ${u.code}: ${e.message}`);
      fail++;
    }
    if (ok % 200 === 0) process.stdout.write(`  [${ok}/${updates.length}]\r`);
  }
  console.log(`\n[008] Done: ${ok} ok, ${fail} failed`);

  // Verify
  const v = await sql(`
    SELECT 
      count(*) FILTER (WHERE description IS NOT NULL AND description != '') as with_desc,
      count(*) FILTER (WHERE control_question IS NOT NULL AND control_question != '') as with_question,
      count(*) FILTER (WHERE control_weight IS NOT NULL) as with_weight,
      count(*) FILTER (WHERE maturity_criteria_ref IS NOT NULL) as with_maturity,
      count(*) as total
    FROM scf_controls
  `);
  console.log('[008] Final stats:', JSON.stringify(v.rows?.[0]));
}

main().catch(e => { console.error('[FATAL]', e); process.exit(1); });
