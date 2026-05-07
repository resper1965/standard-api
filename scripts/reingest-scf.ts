/**
 * SCF Clean Re-import
 * 
 * Nuclear option: wipe ALL SCF data and re-import from scratch.
 * This avoids UUID mismatch issues from partial imports.
 * 
 * Strategy:
 * 1. Delete ALL SCF data in FK-safe order  
 * 2. Re-parse XLSX with fresh UUIDs
 * 3. Insert everything from scratch
 * 4. The existing 231 frameworks + 32,903 requirements stay (they have no FK deps on controls)
 *    Actually, mappings → requirements → frameworks, and mappings → controls → domains
 *    So we need to preserve frameworks/requirements and only rebuild domains/controls/mappings.
 * 
 * Wait — the frameworks/requirements in the DB came from a PREVIOUS CSV import,
 * not from the XLSX. The XLSX only produces 2 frameworks (the secondary tabs).
 * The CSV import produced 231 frameworks with their requirements.
 * Those are INDEPENDENT of controls — they link through mappings.
 * 
 * So the plan is:
 * 1. Delete mappings (they reference both controls and requirements)
 * 2. Delete controls
 * 3. Delete domains  
 * 4. Re-insert domains from XLSX
 * 5. Re-insert controls from XLSX (all 1468 unique + deduped)
 * 6. Build mappings by reading the XLSX main tab's framework columns
 */
import "dotenv/config";
import * as fs from "fs";
import * as XLSX from "xlsx";
import { neon } from "@neondatabase/serverless";
import {
  getSheetHeaders,
  parseSheetToRows,
  normalizeHeader,
  extractDomainCode,
  findControlCode,
  findControlTitle,
  findControlDescription,
  findDomainName,
  classifyTab,
} from "../packages/scf-core/src/importers/xlsx-tab-parser";

const XLSX_PATH = "./assets/Secure Controls Framework (SCF) - 2026.1.1.xlsx";

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try { return await fn(); }
    catch (err: any) {
      const isTransient = err?.sourceError?.code === "ECONNRESET" || err?.message?.includes("fetch failed");
      if (isTransient && attempt < maxRetries) {
        const delay = Math.min(2000 * attempt, 15000);
        process.stdout.write(`  ⚠ retry ${attempt}/${maxRetries} in ${delay}ms\n`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error("unreachable");
}

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  // ── Step 1: Read XLSX ──────────────────────────────────
  console.log("[1/5] Reading XLSX...");
  const data = fs.readFileSync(XLSX_PATH);
  const workbook = XLSX.read(data, { type: "buffer" });

  // Find the main controls tab
  let mainTab: string | null = null;
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]!;
    const headers = getSheetHeaders(sheet);
    const cls = classifyTab(name, headers);
    if (cls.type === "controls" && name.startsWith("SCF 20")) {
      mainTab = name;
      break;
    }
  }
  if (!mainTab) throw new Error("No main SCF controls tab found");
  console.log(`  Main tab: "${mainTab}"`);

  const sheet = workbook.Sheets[mainTab]!;
  const headers = getSheetHeaders(sheet);
  const normalizedHeaders = headers.map(normalizeHeader);
  const rows = parseSheetToRows(sheet);
  console.log(`  Rows: ${rows.length}, Columns: ${headers.length}`);

  // ── Step 2: Parse domains & controls ───────────────────
  console.log("[2/5] Parsing domains & controls...");
  type Domain = { id: string; code: string; name: string; };
  type Control = { id: string; domainId: string; code: string; title: string; desc: string | null; };

  const domains: Domain[] = [];
  const controls: Control[] = [];
  const domainByCode = new Map<string, string>();
  const controlByCode = new Map<string, string>();

  for (const row of rows) {
    const code = findControlCode(row);
    if (!code) continue;
    const domainCode = extractDomainCode(code);
    if (!domainCode) continue;
    const title = findControlTitle(row);
    if (!title) continue;

    // Domain
    if (!domainByCode.has(domainCode)) {
      const did = crypto.randomUUID();
      domainByCode.set(domainCode, did);
      const dname = findDomainName(row) ?? domainCode;
      domains.push({ id: did, code: domainCode, name: dname });
    }

    // Control (dedup by code)
    if (!controlByCode.has(code)) {
      const cid = crypto.randomUUID();
      controlByCode.set(code, cid);
      controls.push({
        id: cid,
        domainId: domainByCode.get(domainCode)!,
        code,
        title,
        desc: findControlDescription(row),
      });
    }
  }
  console.log(`  Domains: ${domains.length}, Controls: ${controls.length}`);

  // ── Step 3: Identify framework columns for mappings ────
  // The main SCF tab has framework columns embedded.
  // Each framework column header = framework name, cell value = requirement code(s)
  // DB has framework_id which was set from a CSV import.
  // We need the XLSX column header to match the DB framework_id.
  
  // Load DB frameworks
  const dbFrameworks = await sql`SELECT id, framework_id, name FROM scf_frameworks`;
  const fwNameToId = new Map<string, string>();
  for (const f of dbFrameworks) {
    fwNameToId.set(f.framework_id, f.id);
    fwNameToId.set(f.name, f.id);
  }

  // Load DB requirements: (framework_db_id, requirement_code) → requirement_db_id
  const dbReqs = await sql`SELECT id, scf_framework_id, requirement_code FROM scf_framework_requirements`;
  const reqLookup = new Map<string, string>();
  for (const r of dbReqs) reqLookup.set(`${r.scf_framework_id}::${r.requirement_code}`, r.id);

  // Try to match XLSX column headers to DB framework_id or name
  console.log("  Matching framework columns...");
  
  // The DB framework_ids look like "21-2021", "27-2022", etc. 
  // These are abbreviated ISO numbers. The XLSX headers are like "ISO\n27001\n2022"
  // We need a fuzzy matching approach.
  
  // Build normalized lookup: strip "ISO", whitespace, newlines, etc.
  const normFw = (s: string) => s.replace(/[\s\n\r]/g, "").replace(/^iso/i, "").toLowerCase();
  const fwNormToId = new Map<string, string>();
  for (const f of dbFrameworks) {
    fwNormToId.set(normFw(f.framework_id), f.id);
    fwNormToId.set(normFw(f.name), f.id);
  }

  // Match XLSX headers
  type FwColumnMatch = { headerIdx: number; normalizedKey: string; dbFrameworkId: string; };
  const fwMatches: FwColumnMatch[] = [];
  const unmatchedHeaders: string[] = [];
  
  // Skip known non-framework columns
  const skipColumns = new Set([
    "scf_control_#", "scf_#", "control_#", "scf_control", "control_name", "control_title",
    "scf_control_name", "scf_control_description", "control_description", "description",
    "scf_domain", "domain", "domain_name", "scf_domain_name", "scf_control_question",
    "control_question", "question", "scf_control_weighting", "control_weight", "weight",
    "scf_weighting", "#", "principle_name",
  ]);

  for (let i = 0; i < normalizedHeaders.length; i++) {
    const nh = normalizedHeaders[i]!;
    if (!nh || skipColumns.has(nh)) continue;
    
    // Try direct match
    let dbId = fwNameToId.get(headers[i]!.trim());
    if (!dbId) dbId = fwNormToId.get(normFw(headers[i]!));
    if (!dbId) dbId = fwNormToId.get(normFw(nh));
    
    if (dbId) {
      fwMatches.push({ headerIdx: i, normalizedKey: nh, dbFrameworkId: dbId });
    } else {
      // Only track if it looks like it has data
      const hasData = rows.slice(0, 10).some(r => r[nh]?.trim());
      if (hasData) unmatchedHeaders.push(`"${headers[i]?.trim()}" → "${nh}"`);
    }
  }
  
  console.log(`  Framework columns matched: ${fwMatches.length}/${fwMatches.length + unmatchedHeaders.length}`);
  if (unmatchedHeaders.length > 0 && unmatchedHeaders.length <= 10) {
    for (const u of unmatchedHeaders) console.log(`    unmatched: ${u}`);
  }

  // ── Step 4: Wipe & Insert ──────────────────────────────
  const [ver] = await sql`SELECT id FROM scf_versions LIMIT 1`;
  const versionId = ver.id;
  
  console.log("[3/5] Wiping stale SCF data...");
  await sql`DELETE FROM scf_mappings WHERE scf_version_id = ${versionId}`;
  console.log("  ✓ mappings deleted");
  await sql`DELETE FROM scf_control_metadata`;
  console.log("  ✓ control_metadata deleted");
  await sql`DELETE FROM scf_controls WHERE scf_version_id = ${versionId}`;
  console.log("  ✓ controls deleted");
  await sql`DELETE FROM scf_domains WHERE scf_version_id = ${versionId}`;
  console.log("  ✓ domains deleted");

  console.log("[4/5] Inserting fresh data...");
  // Domains
  for (const d of domains) {
    await withRetry(() => sql`
      INSERT INTO scf_domains (id, scf_version_id, domain_code, name, description)
      VALUES (${d.id}, ${versionId}, ${d.code}, ${d.name}, ${'SCF domain: ' + d.name})
      ON CONFLICT (scf_version_id, domain_code) DO UPDATE SET name = EXCLUDED.name
    `);
  }
  console.log(`  ✓ ${domains.length} domains`);

  // Controls
  let ctrlDone = 0;
  for (const c of controls) {
    await withRetry(() => sql`
      INSERT INTO scf_controls (id, scf_version_id, scf_domain_id, control_code, title, description)
      VALUES (${c.id}, ${versionId}, ${c.domainId}, ${c.code}, ${c.title}, ${c.desc})
      ON CONFLICT (scf_version_id, control_code) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description
    `);
    ctrlDone++;
    if (ctrlDone % 100 === 0) process.stdout.write(`  controls: ${ctrlDone}/${controls.length}\r`);
  }
  console.log(`  ✓ ${controls.length} controls                    `);

  // Mappings from framework columns
  console.log("[5/5] Building mappings from framework columns...");
  let mapInserted = 0;
  let mapNoReq = 0;
  let mapFk = 0;
  
  for (const row of rows) {
    const code = findControlCode(row);
    if (!code) continue;
    const controlId = controlByCode.get(code);
    if (!controlId) continue;
    
    for (const fm of fwMatches) {
      const cellValue = row[fm.normalizedKey]?.trim();
      if (!cellValue) continue;
      
      // Split multi-value cells
      const reqCodes = cellValue.split(/[;\n\r]+/).map(s => s.trim()).filter(Boolean);
      
      for (const reqCode of reqCodes) {
        const reqDbId = reqLookup.get(`${fm.dbFrameworkId}::${reqCode}`);
        if (!reqDbId) { mapNoReq++; continue; }
        
        try {
          await withRetry(() => sql`
            INSERT INTO scf_mappings (id, scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_source, is_official)
            VALUES (${crypto.randomUUID()}, ${versionId}, ${reqDbId}, ${controlId}, 'related', 'strong', 'official_scf', true)
            ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING
          `);
          mapInserted++;
        } catch (err: any) {
          if (err?.code === "23503") mapFk++;
          else throw err;
        }
      }
    }
    
    if ((mapInserted + mapNoReq + mapFk) % 500 === 0 && (mapInserted + mapNoReq + mapFk) > 0) {
      process.stdout.write(`  mappings: ${mapInserted} ok | ${mapNoReq} no-req | ${mapFk} FK\r`);
    }
  }
  console.log(`  ✓ mappings: ${mapInserted} inserted | ${mapNoReq} no-req | ${mapFk} FK errors`);

  // ── Verify ─────────────────────────────────────────────
  console.log("\n=== FINAL VERIFICATION ===");
  const [dc] = await sql`SELECT count(*) FROM scf_domains`;
  const [cc] = await sql`SELECT count(*) FROM scf_controls`;
  const [fc] = await sql`SELECT count(*) FROM scf_frameworks`;
  const [rc] = await sql`SELECT count(*) FROM scf_framework_requirements`;
  const [mc] = await sql`SELECT count(*) FROM scf_mappings`;
  console.log(`  Domains:      ${dc.count}`);
  console.log(`  Controls:     ${cc.count}`);
  console.log(`  Frameworks:   ${fc.count}`);
  console.log(`  Requirements: ${rc.count}`);
  console.log(`  Mappings:     ${mc.count}`);
}

main().catch(err => { console.error("FATAL:", err); process.exit(1); });
