// Migration 009: Enrich framework names using XLSX column headers + Authoritative Sources
// Strategy: the DB has partial names like "21434 2021" — we match them to full XLSX names
import XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const H = 'ep-blue-breeze-anyfua57.c-6.us-east-1.aws.neon.tech';
const CS = 'postgresql://neondb_owner:npg_T8MHv6EoDIGh@' + H + '/neondb?sslmode=require';

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

const norm = (raw) => raw.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_#&-]/g, '');

async function main() {
  const xlsxPath = resolve('evals/fixtures/scf-2026.1.1.xlsx');
  console.log('[009] Reading:', xlsxPath);
  const data = readFileSync(xlsxPath);
  const wb = XLSX.read(data, { type: 'buffer' });

  // Build full reference from Authoritative Sources
  const asSheet = wb.Sheets['Authoritative Sources'];
  const asRows = XLSX.utils.sheet_to_json(asSheet, { defval: '', raw: false });
  
  // Build lookup: SCF Column Header raw → full document name + metadata
  const authSources = new Map();
  for (const row of asRows) {
    const colHeader = row['SCF Column Header']?.trim();
    const fdn = row['Focal Document Name (FDN)']?.trim();
    const source = row['Source']?.trim();
    const fdi = row['Focal Document Identifier (FDI)']?.trim();
    if (!colHeader) continue;
    const displayName = colHeader.replace(/[\r\n]+/g, ' ');
    authSources.set(displayName, { fdn, source, fdi });
  }
  console.log(`[009] Authoritative sources: ${authSources.size}`);

  // Get XLSX column headers from main controls tab
  const controlsTab = wb.Sheets['SCF 2026.1'];
  const range = XLSX.utils.decode_range(controlsTab['!ref'] ?? 'A1');
  const xlsxHeaders = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = controlsTab[XLSX.utils.encode_cell({ r: range.s.r, c })];
    if (cell?.v) {
      const raw = String(cell.v).trim();
      const display = raw.replace(/[\r\n]+/g, ' ');
      xlsxHeaders.push(display);
    }
  }
  console.log(`[009] XLSX headers: ${xlsxHeaders.length}`);

  // Fetch current DB frameworks
  const dbResult = await sql("SELECT id, framework_id, name FROM scf_frameworks ORDER BY framework_id");
  const dbFrameworks = dbResult.rows?.map(r => ({ id: r.id, fwId: r.framework_id, name: r.name })) ?? [];
  console.log(`[009] DB frameworks: ${dbFrameworks.length}`);

  // Strategy: match DB name (partial) → XLSX column header (full)
  // DB has names like "800-53B R5 (high)" → XLSX column is "NIST\n800-53B R5\n(high)"
  // We match by checking if the DB name appears within the XLSX column header text
  
  let updated = 0, unmatched = 0;
  const matchLog = [];
  
  for (const fw of dbFrameworks) {
    const dbName = fw.name;
    let bestMatch = null;
    
    // Try to find XLSX header that contains the DB name
    for (const header of xlsxHeaders) {
      const headerLower = header.toLowerCase();
      const dbNameLower = dbName.toLowerCase();
      
      // Exact substring match
      if (headerLower.includes(dbNameLower) || dbNameLower.includes(headerLower)) {
        bestMatch = header;
        break;
      }
      
      // Extract significant numbers/words from DB name and match
      const dbTokens = dbNameLower.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(t => t.length > 1);
      const headerTokens = headerLower.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(t => t.length > 1);
      
      // If all DB tokens appear in header, it's a match
      if (dbTokens.length > 0 && dbTokens.every(t => headerTokens.some(ht => ht.includes(t) || t.includes(ht)))) {
        bestMatch = header;
        break;
      }
    }

    if (!bestMatch) { unmatched++; continue; }

    // Get full name from authoritative sources if available
    const authInfo = authSources.get(bestMatch);
    const fullName = authInfo?.fdn || bestMatch;
    const publisher = authInfo?.source || null;
    const sourceRef = authInfo?.fdi || null;

    // Only update if the new name is better (longer/more descriptive)
    if (fullName.length > dbName.length || publisher) {
      const safeName = fullName.replace(/'/g, "''").substring(0, 500);
      const safePub = publisher ? `'${publisher.replace(/'/g, "''")}'` : 'NULL';
      const safeRef = sourceRef ? `'${sourceRef.replace(/'/g, "''")}'` : 'NULL';
      try {
        await sql(`UPDATE scf_frameworks SET name = '${safeName}', publisher = ${safePub}, source_reference = ${safeRef}, updated_at = NOW() WHERE id = '${fw.id}'`);
        updated++;
        matchLog.push(`  ✓ "${dbName}" → "${fullName}"`);
      } catch (e) {
        console.error(`  [FAIL] ${fw.fwId}: ${e.message}`);
      }
    }
  }

  console.log(`\n[009] Matched and updated: ${updated}`);
  console.log(`[009] Unmatched: ${unmatched}`);
  
  // Show some matches
  console.log('\nSample matches:');
  for (const log of matchLog.slice(0, 15)) {
    console.log(log);
  }
  console.log('...');

  // Verify
  const v = await sql("SELECT framework_id, name FROM scf_frameworks ORDER BY name LIMIT 10");
  console.log('\nSample enriched names:');
  for (const r of v.rows ?? []) {
    console.log(`  "${r.framework_id}" → "${r.name}"`);
  }
}

main().catch(e => { console.error('[FATAL]', e); process.exit(1); });
