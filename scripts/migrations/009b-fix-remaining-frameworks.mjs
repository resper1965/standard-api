// Migration 009b: Fix remaining framework name issues — manual corrections
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

// Curated corrections for frameworks that fuzzy matching got wrong or missed
const corrections = [
  // 4 frameworks missing publisher
  { fwId: 'CM-LEVEL-1', name: 'SCR-CMM Level 1 - Performed Informally', publisher: 'SCF' },
  { fwId: 'CM-LEVEL-2', name: 'SCR-CMM Level 2 - Planned & Tracked', publisher: 'SCF' },
  { fwId: 'CM-LEVEL-3', name: 'SCR-CMM Level 3 - Well Defined', publisher: 'SCF' },
  { fwId: 'CS-2.0', name: 'NIST Cybersecurity Framework (CSF) 2.0', publisher: 'NIST' },
  // GovRAMP duplicates — they all got the same name, differentiate them
  { fwId: 'GOVRAMP', name: 'GovRAMP', publisher: 'GovRAMP' },
  { fwId: 'GOVRAMP-CORE', name: 'GovRAMP - Core', publisher: 'GovRAMP' },
  { fwId: 'GOVRAMP-HIGH', name: 'GovRAMP - High', publisher: 'GovRAMP' },
  { fwId: 'GOVRAMP-LOW', name: 'GovRAMP - Low', publisher: 'GovRAMP' },
  { fwId: 'GOVRAMP-LOW+', name: 'GovRAMP - Low+', publisher: 'GovRAMP' },
  { fwId: 'GOVRAMP-MODERATE', name: 'GovRAMP - Moderate', publisher: 'GovRAMP' },
  // NIST with better full names
  { fwId: '80-R2', name: 'NIST SP 800-171 Revision 2', publisher: 'NIST' },
  { fwId: '80-R3', name: 'NIST SP 800-171 Revision 3', publisher: 'NIST' },
  { fwId: '80-R4', name: 'NIST SP 800-53 Revision 4', publisher: 'NIST' },
  { fwId: '80-R5', name: 'NIST SP 800-53 Revision 5', publisher: 'NIST' },
  { fwId: 'NIST-800-171A', name: 'NIST SP 800-171A (Assessment Procedures)', publisher: 'NIST' },
  { fwId: 'NIST-800-172', name: 'NIST SP 800-172 (Enhanced Security Requirements)', publisher: 'NIST' },
  { fwId: 'NIST-800-207', name: 'NIST SP 800-207 (Zero Trust Architecture)', publisher: 'NIST' },
  { fwId: 'NIST-800-218', name: 'NIST SP 800-218 (SSDF - Secure Software Development)', publisher: 'NIST' },
  { fwId: 'NIST-800-39', name: 'NIST SP 800-39 (Managing Information Security Risk)', publisher: 'NIST' },
  { fwId: 'NIST-800-82-R3', name: 'NIST SP 800-82 Revision 3 (OT Security)', publisher: 'NIST' },
  { fwId: 'NIST-AI-600-1', name: 'NIST AI 600-1 (AI Risk Management)', publisher: 'NIST' },
  { fwId: 'NIST-SP-800-66-R2', name: 'NIST SP 800-66 Revision 2 (HIPAA Security Rule)', publisher: 'NIST' },
  { fwId: 'HI-SECURITY-RULE-/-NIST-SP-800-66-R2', name: 'HIPAA Security Rule / NIST SP 800-66 R2', publisher: 'US HHS / NIST' },
  // ISO with full org prefixes
  { fwId: '21-2021', name: 'ISO/SAE 21434:2021 (Road Vehicles Cybersecurity)', publisher: 'ISO/SAE' },
  { fwId: '22-2019', name: 'ISO 22301:2019 (Business Continuity)', publisher: 'ISO' },
  { fwId: '27-2015', name: 'ISO 27017:2015 (Cloud Security)', publisher: 'ISO' },
  { fwId: '27-2022', name: 'ISO 27002:2022 (Information Security Controls)', publisher: 'ISO' },
  { fwId: '27-2025', name: 'ISO 27701:2025 (Privacy Information Management)', publisher: 'ISO' },
  { fwId: '29-2024', name: 'ISO 29100:2024 (Privacy Framework)', publisher: 'ISO' },
  { fwId: '31-2009', name: 'ISO 31010:2009 (Risk Assessment Techniques)', publisher: 'ISO' },
  { fwId: '31-2018', name: 'ISO 31000:2018 (Risk Management)', publisher: 'ISO' },
  { fwId: '42-2023', name: 'ISO 42001:2023 (AI Management System)', publisher: 'ISO' },
  // US regulations
  { fwId: 'DF-CYBERSECURITY-252.204-7012', name: 'DFARS 252.204-7012 (Safeguarding Covered Defense Information)', publisher: 'US DoD' },
  { fwId: 'FA-52.204-21', name: 'FAR 52.204-21 (Basic Safeguarding)', publisher: 'US GSA' },
  { fwId: 'FA-52.204-27', name: 'FAR 52.204-27 (Prohibition on Covered Equipment)', publisher: 'US GSA' },
  { fwId: 'CE-1.2', name: 'CERT Resilience Management Model (CERT-RMM) v1.2', publisher: 'US CERT' },
  { fwId: 'US-IRS-1075', name: 'IRS Publication 1075 (Tax Information Security)', publisher: 'US IRS' },
  { fwId: 'US-SOX', name: 'Sarbanes-Oxley Act (SOX)', publisher: 'US Congress' },
  { fwId: 'TO-2025', name: 'OWASP Top 10:2025 (Web Application Security Risks)', publisher: 'OWASP' },
  { fwId: 'US---NV-SB220', name: 'Nevada SB 220 (Privacy of Consumer Information)', publisher: 'US - Nevada' },
  { fwId: 'US---TX-SB-820', name: 'Texas SB 820 (Cybersecurity)', publisher: 'US - Texas' },
];

async function main() {
  console.log(`[009b] Fixing ${corrections.length} frameworks...`);
  let ok = 0, fail = 0;
  for (const c of corrections) {
    const safeName = c.name.replace(/'/g, "''");
    const safePub = c.publisher.replace(/'/g, "''");
    try {
      await sql(`UPDATE scf_frameworks SET name = '${safeName}', publisher = '${safePub}', updated_at = NOW() WHERE framework_id = '${c.fwId}'`);
      ok++;
    } catch (e) {
      console.error(`  [FAIL] ${c.fwId}: ${e.message}`);
      fail++;
    }
  }
  console.log(`[009b] Done: ${ok} ok, ${fail} failed`);

  // Final stats
  const q1 = await sql("SELECT count(*) FILTER (WHERE publisher IS NULL) as no_pub, count(*) as total FROM scf_frameworks");
  console.log(`[009b] Frameworks without publisher: ${q1.rows[0].no_pub}/${q1.rows[0].total}`);

  const q2 = await sql("SELECT count(*) FILTER (WHERE length(name) < 15) as short_names, count(*) as total FROM scf_frameworks");
  console.log(`[009b] Frameworks with very short names (<15 chars): ${q2.rows[0].short_names}/${q2.rows[0].total}`);

  // Show all frameworks alphabetically to verify
  const q3 = await sql("SELECT framework_id, name, publisher FROM scf_frameworks ORDER BY name LIMIT 20");
  console.log('\n[009b] Sample (alphabetical):');
  for (const r of q3.rows) {
    console.log(`  ${r.framework_id} → "${r.name}" [${r.publisher || 'no publisher'}]`);
  }
}
main().catch(e => { console.error('[FATAL]', e); process.exit(1); });
