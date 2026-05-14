/**
 * SCF Mapping Builder — builds mappings by re-reading the XLSX crosswalk tabs
 * and resolving all IDs directly against the production DB.
 * 
 * Strategy:
 * 1. Parse XLSX crosswalk tabs to get control_code ↔ requirement pairs
 * 2. Look up control_code → DB control_id
 * 3. Look up requirement_code + framework → DB requirement_id
 * 4. Insert mappings with the resolved DB IDs
 */
import "dotenv/config";
import * as fs from "fs";
import * as XLSX from "xlsx";
import { neon } from "@neondatabase/serverless";
import {
  classifyTab,
  getSheetHeaders,
  parseSheetToRows,
  normalizeHeader,
  extractDomainCode,
} from "../packages/scf-core/src/importers/xlsx-tab-parser";

const XLSX_PATH = "./assets/Secure Controls Framework (SCF) - 2026.1.1.xlsx";

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try { return await fn(); }
    catch (err: any) {
      const isTransient = err?.sourceError?.code === "ECONNRESET" || err?.message?.includes("fetch failed");
      if (isTransient && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, Math.min(1000 * 2 ** attempt, 15000)));
        continue;
      }
      throw err;
    }
  }
  throw new Error("unreachable");
}

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  // ── Load DB lookups ────────────────────────────────────────
  console.log("[1/3] Loading DB lookups...");
  const [ver] = await sql`SELECT id FROM scf_versions LIMIT 1`;
  const versionId = ver.id;
  
  // control_code → DB ID
  const dbControls = await sql`SELECT id, control_code FROM scf_controls`;
  const controlCodeToId = new Map<string, string>();
  for (const c of dbControls) controlCodeToId.set(c.control_code, c.id);
  console.log(`  Controls in DB: ${dbControls.length}`);
  
  // framework_id (text) → DB UUID
  const dbFrameworks = await sql`SELECT id, framework_id FROM scf_frameworks`;
  const fwCodeToId = new Map<string, string>();
  for (const f of dbFrameworks) fwCodeToId.set(f.framework_id, f.id);
  console.log(`  Frameworks in DB: ${dbFrameworks.length}`);
  
  // (framework_db_id, requirement_code) → DB requirement UUID
  const dbReqs = await sql`SELECT id, scf_framework_id, requirement_code FROM scf_framework_requirements`;
  const reqLookup = new Map<string, string>();
  for (const r of dbReqs) reqLookup.set(`${r.scf_framework_id}::${r.requirement_code}`, r.id);
  console.log(`  Requirements in DB: ${dbReqs.length}`);

  // ── Parse XLSX crosswalk tabs ──────────────────────────────
  console.log("[2/3] Parsing XLSX crosswalk tabs...");
  const data = fs.readFileSync(XLSX_PATH);
  const workbook = XLSX.read(data, { type: "buffer" });

  type MappingCandidate = { controlCode: string; reqCode: string; frameworkName: string };
  const candidates: MappingCandidate[] = [];

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]!;
    const headers = getSheetHeaders(sheet);
    const classification = classifyTab(name, headers);
    
    if (classification.type !== "crosswalk") continue;
    
    const rows = parseSheetToRows(sheet);
    const normalizedHeaders = headers.map(normalizeHeader);
    
    // Find the SCF control code column
    let scfColumnKey: string | null = null;
    for (const row of rows.slice(0, 20)) {
      for (const [key, value] of Object.entries(row)) {
        if (extractDomainCode(value)) { scfColumnKey = key; break; }
      }
      if (scfColumnKey) break;
    }
    if (!scfColumnKey) continue;
    
    // Find non-SCF reference columns
    const refColumns = normalizedHeaders.filter(h => h !== scfColumnKey && h.length > 0);
    if (refColumns.length === 0) continue;
    const primaryRefCol = refColumns[0]!;
    
    for (const row of rows) {
      const controlCode = row[scfColumnKey]?.trim();
      if (!controlCode || !extractDomainCode(controlCode)) continue;
      
      const reqCodeRaw = row[primaryRefCol]?.trim();
      if (!reqCodeRaw) continue;
      
      const reqCodes = reqCodeRaw.split(/[;\n\r]+/).map(s => s.trim()).filter(Boolean);
      for (const reqCode of reqCodes) {
        candidates.push({ controlCode, reqCode, frameworkName: name.trim() });
      }
    }
  }
  console.log(`  Crosswalk mapping candidates: ${candidates.length}`);

  // ── Insert Mappings ────────────────────────────────────────
  console.log("[3/3] Inserting mappings...");
  let inserted = 0;
  let noControl = 0;
  let noReq = 0;
  let fkError = 0;
  
  for (const c of candidates) {
    const controlId = controlCodeToId.get(c.controlCode);
    if (!controlId) { noControl++; continue; }
    
    // Look up framework + requirement
    const fwDbId = fwCodeToId.get(c.frameworkName);
    if (!fwDbId) { noReq++; continue; }
    
    const reqDbId = reqLookup.get(`${fwDbId}::${c.reqCode}`);
    if (!reqDbId) { noReq++; continue; }
    
    try {
      await withRetry(() => sql`
        INSERT INTO scf_mappings (id, scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, mapping_source, is_official)
        VALUES (${crypto.randomUUID()}, ${versionId}, ${reqDbId}, ${controlId}, 'related', 'official_scf', true)
        ON CONFLICT (scf_framework_requirement_id, scf_control_id) DO NOTHING
      `);
      inserted++;
    } catch (err: any) {
      if (err?.code === "23503") fkError++;
      else throw err;
    }
    
    if ((inserted + noControl + noReq + fkError) % 500 === 0) {
      process.stdout.write(`  ✓ ${inserted} inserted | ⊘ ${noControl} no-ctrl | ⊘ ${noReq} no-req | ✗ ${fkError} FK\r`);
    }
  }
  
  console.log(`\n  DONE: ${inserted} inserted | ${noControl} no-ctrl | ${noReq} no-req | ${fkError} FK errors`);

  // ── Verify ─────────────────────────────────────────────────
  const [mc] = await sql`SELECT count(*) FROM scf_mappings`;
  const [cc] = await sql`SELECT count(*) FROM scf_controls`;
  const [dc] = await sql`SELECT count(*) FROM scf_domains`;
  console.log(`\n=== FINAL STATE ===`);
  console.log(`  Domains:  ${dc.count}`);
  console.log(`  Controls: ${cc.count}`);
  console.log(`  Mappings: ${mc.count}`);
}

main().catch(err => { console.error("FATAL:", err); process.exit(1); });
