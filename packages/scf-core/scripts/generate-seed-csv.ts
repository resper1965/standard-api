/**
 * SCF Realistic Seed Generator
 * 
 * Generates a comprehensive CSV file based on the official SCF 2024.4 structure.
 * Uses only factual domain names and framework references from securecontrolsframework.com.
 * Control descriptions are illustrative/representative, not verbatim SCF content.
 * 
 * This file is NOT the official SCF — it's a realistic seed for the Aegis platform.
 * Official SCF data must be obtained from https://securecontrolsframework.com/scf-download/
 */

// ---------- 33 Official SCF Domains ----------
const DOMAINS = [
  { code: "GOV", name: "Security, Compliance & Resilience Governance", sort: 1 },
  { code: "AAT", name: "Artificial Intelligence & Autonomous Technology", sort: 2 },
  { code: "AST", name: "Asset Management", sort: 3 },
  { code: "BCD", name: "Business Continuity & Disaster Recovery", sort: 4 },
  { code: "CAP", name: "Capacity & Performance Planning", sort: 5 },
  { code: "CHG", name: "Change Management", sort: 6 },
  { code: "CLD", name: "Cloud Security", sort: 7 },
  { code: "CPL", name: "Compliance", sort: 8 },
  { code: "CFG", name: "Configuration Management", sort: 9 },
  { code: "MON", name: "Continuous Monitoring", sort: 10 },
  { code: "CRY", name: "Cryptographic Protections", sort: 11 },
  { code: "DCH", name: "Data Classification & Handling", sort: 12 },
  { code: "EMB", name: "Embedded Technology", sort: 13 },
  { code: "END", name: "Endpoint Security", sort: 14 },
  { code: "HRS", name: "Human Resources Security", sort: 15 },
  { code: "IAC", name: "Identification & Authentication", sort: 16 },
  { code: "IRO", name: "Incident Response", sort: 17 },
  { code: "IAO", name: "Information Assurance", sort: 18 },
  { code: "MNT", name: "Maintenance", sort: 19 },
  { code: "MDM", name: "Mobile Device Management", sort: 20 },
  { code: "NET", name: "Network Security", sort: 21 },
  { code: "PES", name: "Physical & Environmental Security", sort: 22 },
  { code: "PRI", name: "Data Privacy", sort: 23 },
  { code: "PRM", name: "Project & Resource Management", sort: 24 },
  { code: "RSK", name: "Risk Management", sort: 25 },
  { code: "SEA", name: "Secure Engineering & Architecture", sort: 26 },
  { code: "OPS", name: "Security Operations", sort: 27 },
  { code: "SAT", name: "Security Awareness & Training", sort: 28 },
  { code: "TDA", name: "Technology Development & Acquisition", sort: 29 },
  { code: "TPM", name: "Third-Party Management", sort: 30 },
  { code: "THR", name: "Threat Management", sort: 31 },
  { code: "VPM", name: "Vulnerability & Patch Management", sort: 32 },
  { code: "WEB", name: "Web Security", sort: 33 },
] as const;

// ---------- Representative Controls per Domain (illustrative, not verbatim) ----------
type ControlDef = { code: string; title: string; description: string };

const CONTROLS: ControlDef[] = [
  // GOV
  { code: "GOV-01", title: "Cybersecurity & Data Privacy Governance Program", description: "Establish and maintain a cybersecurity and data privacy governance program." },
  { code: "GOV-02", title: "Publishing Cybersecurity & Data Privacy Documentation", description: "Publish and make available cybersecurity and data privacy policies, standards and procedures." },
  { code: "GOV-03", title: "Periodic Review & Update of Cybersecurity & Data Privacy Program", description: "Review and update the cybersecurity and data privacy program on a defined frequency." },
  { code: "GOV-04", title: "Assigned Cybersecurity & Data Privacy Responsibilities", description: "Assign a qualified individual to lead and be accountable for the cybersecurity program." },
  { code: "GOV-05", title: "Measures of Performance", description: "Establish measures of performance to evaluate the effectiveness of the cybersecurity program." },
  // AAT
  { code: "AAT-01", title: "AI & Autonomous Technology Governance", description: "Implement governance for AI and autonomous technologies." },
  { code: "AAT-02", title: "AI Risk Assessment", description: "Assess risks associated with AI and autonomous technology deployments." },
  { code: "AAT-03", title: "AI Transparency & Explainability", description: "Ensure AI systems are transparent and provide explainable outputs." },
  // AST
  { code: "AST-01", title: "Asset Governance", description: "Establish asset management governance including inventories and ownership." },
  { code: "AST-02", title: "Asset Inventories", description: "Maintain detailed inventories of all technology assets." },
  { code: "AST-03", title: "Asset Categorization", description: "Categorize assets based on criticality and sensitivity." },
  // BCD
  { code: "BCD-01", title: "Business Continuity Management", description: "Develop and maintain a business continuity management capability." },
  { code: "BCD-02", title: "Business Impact Analysis", description: "Conduct business impact analyses to identify critical processes." },
  { code: "BCD-03", title: "Disaster Recovery Planning", description: "Develop and maintain disaster recovery plans for critical systems." },
  // CAP
  { code: "CAP-01", title: "Capacity & Performance Management", description: "Govern current and future capacities and performance of technology assets." },
  // CHG
  { code: "CHG-01", title: "Change Management Program", description: "Establish and maintain a change management program for technology changes." },
  { code: "CHG-02", title: "Change Approval Authority", description: "Define change approval authorities based on risk and impact." },
  { code: "CHG-03", title: "Configuration Change Control", description: "Control and document configuration changes to information systems." },
  // CLD
  { code: "CLD-01", title: "Cloud Security Governance", description: "Govern cloud instances as an extension of on-premise technologies." },
  { code: "CLD-02", title: "Cloud Security Architecture", description: "Implement cloud security architecture aligned with security requirements." },
  { code: "CLD-03", title: "Cloud Data Protection", description: "Protect data in cloud environments through appropriate controls." },
  // CPL
  { code: "CPL-01", title: "Statutory, Regulatory & Contractual Compliance", description: "Identify and comply with applicable statutory, regulatory and contractual requirements." },
  { code: "CPL-02", title: "Compliance Monitoring", description: "Monitor compliance with cybersecurity and data privacy requirements." },
  { code: "CPL-03", title: "Compliance Remediation", description: "Remediate identified compliance deficiencies in a timely manner." },
  // CFG
  { code: "CFG-01", title: "Configuration Management Program", description: "Enforce secure configurations according to vendor and industry recommendations." },
  { code: "CFG-02", title: "System Hardening", description: "Apply system hardening through secure configuration baselines." },
  // MON
  { code: "MON-01", title: "Continuous Monitoring", description: "Maintain situational awareness through centralized event log collection and analysis." },
  { code: "MON-02", title: "Centralized Event Log Collection", description: "Implement centralized event log collection from systems and services." },
  { code: "MON-03", title: "Content of Audit Records", description: "Ensure audit records contain sufficient information for forensic analysis." },
  // CRY
  { code: "CRY-01", title: "Use of Cryptographic Controls", description: "Utilize appropriate cryptographic solutions to protect data confidentiality and integrity." },
  { code: "CRY-02", title: "Cryptographic Key Management", description: "Implement industry-recognized key management practices." },
  // DCH
  { code: "DCH-01", title: "Data Protection", description: "Enforce a standardized data classification methodology." },
  { code: "DCH-02", title: "Data Classification", description: "Classify data based on sensitivity and criticality." },
  { code: "DCH-03", title: "Media Protection", description: "Protect media containing sensitive information throughout its lifecycle." },
  // EMB
  { code: "EMB-01", title: "Embedded Technology Security", description: "Apply additional scrutiny to reduce risks associated with embedded technology." },
  // END
  { code: "END-01", title: "Endpoint Protection", description: "Implement endpoint protection solutions on all endpoint devices." },
  { code: "END-02", title: "Malicious Code Protection", description: "Deploy and maintain anti-malware solutions on appropriate systems." },
  // HRS
  { code: "HRS-01", title: "Human Resources Security Management", description: "Execute sound hiring practices and ongoing personnel management." },
  { code: "HRS-02", title: "Personnel Screening", description: "Screen personnel prior to granting access to organizational systems." },
  { code: "HRS-03", title: "Terms & Conditions of Employment", description: "Establish terms and conditions of employment addressing security responsibilities." },
  // IAC
  { code: "IAC-01", title: "Identity & Access Management", description: "Enforce least privilege through documented IAM capability." },
  { code: "IAC-02", title: "Identification & Authentication for Organizational Users", description: "Uniquely identify and authenticate organizational users." },
  { code: "IAC-03", title: "Multi-Factor Authentication", description: "Implement MFA for privileged and remote access." },
  { code: "IAC-04", title: "Access Enforcement", description: "Enforce approved authorizations for logical access to information systems." },
  { code: "IAC-05", title: "Least Privilege", description: "Employ the principle of least privilege for all system access." },
  // IRO
  { code: "IRO-01", title: "Incident Response Operations", description: "Maintain a viable incident response capability." },
  { code: "IRO-02", title: "Incident Handling", description: "Handle incidents in accordance with a documented Incident Response Plan." },
  { code: "IRO-03", title: "Incident Reporting", description: "Report cybersecurity incidents to appropriate authorities." },
  // IAO
  { code: "IAO-01", title: "Information Assurance Program", description: "Execute impartial assessment processes to validate cybersecurity controls." },
  { code: "IAO-02", title: "Assessments", description: "Conduct security assessments on a defined frequency." },
  // MNT
  { code: "MNT-01", title: "System Maintenance", description: "Proactively maintain technology assets according to vendor recommendations." },
  { code: "MNT-02", title: "Controlled Maintenance", description: "Schedule and control maintenance activities." },
  // MDM
  { code: "MDM-01", title: "Mobile Device Security", description: "Implement measures to restrict mobile device connectivity with critical infrastructure." },
  // NET
  { code: "NET-01", title: "Network Security Management", description: "Implement secure defense-in-depth network architecture." },
  { code: "NET-02", title: "Network Segmentation", description: "Segment networks based on security requirements and data classification." },
  { code: "NET-03", title: "Boundary Protection", description: "Monitor and control communications at the network boundary." },
  // PES
  { code: "PES-01", title: "Physical & Environmental Protection", description: "Protect physical environments through layers of physical security." },
  { code: "PES-02", title: "Physical Access Controls", description: "Enforce physical access authorizations at defined entry points." },
  // PRI
  { code: "PRI-01", title: "Data Privacy Program", description: "Align data privacy practices with industry-recognized principles." },
  { code: "PRI-02", title: "Data Privacy Impact Assessment", description: "Conduct data privacy impact assessments for systems processing personal data." },
  { code: "PRI-03", title: "Data Subject Rights", description: "Implement processes to respond to data subject rights requests." },
  // PRM
  { code: "PRM-01", title: "Project & Resource Management", description: "Operationalize a viable strategy to achieve cybersecurity objectives." },
  // RSK
  { code: "RSK-01", title: "Risk Management Program", description: "Proactively identify, assess, prioritize and remediate risk." },
  { code: "RSK-02", title: "Risk Assessment", description: "Conduct risk assessments and evaluate risk against organizational risk threshold." },
  { code: "RSK-03", title: "Risk Response", description: "Respond to risk based on the organization's risk appetite." },
  // SEA
  { code: "SEA-01", title: "Secure Engineering Principles", description: "Utilize industry-recognized secure engineering and architecture principles." },
  { code: "SEA-02", title: "Security Architecture", description: "Design and implement security architectures for information systems." },
  // OPS
  { code: "OPS-01", title: "Security Operations", description: "Execute cybersecurity operations to provide quality security services." },
  { code: "OPS-02", title: "Security Concept of Operations", description: "Develop security concepts of operations for information systems." },
  // SAT
  { code: "SAT-01", title: "Security Awareness Program", description: "Foster a cybersecurity-minded workforce through ongoing education." },
  { code: "SAT-02", title: "Role-Based Security Training", description: "Provide role-based security training for personnel with significant security roles." },
  // TDA
  { code: "TDA-01", title: "Technology Development & Acquisition", description: "Develop and acquire systems according to a Secure Software Development Framework." },
  { code: "TDA-02", title: "Secure Software Development", description: "Apply secure coding practices in software development." },
  // TPM
  { code: "TPM-01", title: "Third-Party Management", description: "Execute Supply Chain Risk Management practices for trustworthy third parties." },
  { code: "TPM-02", title: "Third-Party Assessments", description: "Assess the cybersecurity posture of third parties." },
  // THR
  { code: "THR-01", title: "Threat Intelligence Program", description: "Proactively identify and assess technology-related threats." },
  { code: "THR-02", title: "Threat Awareness", description: "Maintain awareness of the current threat landscape." },
  // VPM
  { code: "VPM-01", title: "Vulnerability & Patch Management", description: "Leverage Attack Surface Management practices to strengthen security." },
  { code: "VPM-02", title: "Vulnerability Scanning", description: "Conduct vulnerability scanning on a regular basis." },
  { code: "VPM-03", title: "Patch Management", description: "Apply security patches within defined timeframes." },
  // WEB
  { code: "WEB-01", title: "Web Security", description: "Ensure security and resilience of Internet-facing technologies." },
  { code: "WEB-02", title: "Web Application Firewall", description: "Implement web application firewalls for Internet-facing applications." },
];

// ---------- Major Frameworks ----------
type FrameworkDef = { code: string; name: string; version: string; publisher: string; category: string };

const FRAMEWORKS: FrameworkDef[] = [
  { code: "ISO-27001", name: "ISO/IEC 27001:2022", version: "2022", publisher: "ISO/IEC", category: "framework" },
  { code: "NIST-CSF-2", name: "NIST Cybersecurity Framework 2.0", version: "2.0", publisher: "NIST", category: "framework" },
  { code: "NIST-800-53", name: "NIST SP 800-53 Rev. 5", version: "Rev. 5", publisher: "NIST", category: "framework" },
  { code: "SOC2-TSC", name: "Trust Services Criteria (SOC 2)", version: "2017", publisher: "AICPA", category: "framework" },
  { code: "PCI-DSS-4", name: "PCI DSS v4.0.1", version: "4.0.1", publisher: "PCI SSC", category: "regulation" },
  { code: "EU-GDPR", name: "EU General Data Protection Regulation", version: "2016/679", publisher: "European Parliament", category: "law" },
  { code: "CIS-CSC-8", name: "CIS Critical Security Controls v8", version: "8", publisher: "CIS", category: "framework" },
  { code: "CMMC-2", name: "CMMC Level 2", version: "2.0", publisher: "US DoD", category: "regulation" },
  { code: "HIPAA", name: "HIPAA Security Rule", version: "2003", publisher: "HHS", category: "law" },
  { code: "EU-NIS2", name: "EU NIS2 Directive", version: "2022/2555", publisher: "European Parliament", category: "law" },
];

// ---------- Representative Requirements & Mappings ----------
type RequirementDef = { code: string; title: string; frameworkCode: string; controlCodes: string[] };

const REQUIREMENTS: RequirementDef[] = [
  // ISO 27001
  { code: "A.5.1", title: "Policies for information security", frameworkCode: "ISO-27001", controlCodes: ["GOV-01", "GOV-02"] },
  { code: "A.5.2", title: "Information security roles and responsibilities", frameworkCode: "ISO-27001", controlCodes: ["GOV-04"] },
  { code: "A.6.1", title: "Screening", frameworkCode: "ISO-27001", controlCodes: ["HRS-02"] },
  { code: "A.7.1", title: "Physical security perimeters", frameworkCode: "ISO-27001", controlCodes: ["PES-01", "PES-02"] },
  { code: "A.8.1", title: "User endpoint devices", frameworkCode: "ISO-27001", controlCodes: ["END-01", "MDM-01"] },
  { code: "A.8.3", title: "Information access restriction", frameworkCode: "ISO-27001", controlCodes: ["IAC-04", "IAC-05"] },
  { code: "A.8.5", title: "Secure authentication", frameworkCode: "ISO-27001", controlCodes: ["IAC-02", "IAC-03"] },
  { code: "A.8.9", title: "Configuration management", frameworkCode: "ISO-27001", controlCodes: ["CFG-01", "CFG-02"] },
  { code: "A.8.15", title: "Logging", frameworkCode: "ISO-27001", controlCodes: ["MON-01", "MON-02"] },
  { code: "A.8.24", title: "Use of cryptography", frameworkCode: "ISO-27001", controlCodes: ["CRY-01", "CRY-02"] },
  { code: "A.8.28", title: "Secure coding", frameworkCode: "ISO-27001", controlCodes: ["TDA-02"] },
  // NIST CSF 2.0
  { code: "GV.OC-01", title: "Organizational context is understood", frameworkCode: "NIST-CSF-2", controlCodes: ["GOV-01", "RSK-01"] },
  { code: "ID.AM-01", title: "Hardware assets are inventoried", frameworkCode: "NIST-CSF-2", controlCodes: ["AST-01", "AST-02"] },
  { code: "PR.AA-01", title: "Identities and credentials are managed", frameworkCode: "NIST-CSF-2", controlCodes: ["IAC-01", "IAC-02"] },
  { code: "PR.DS-01", title: "Data-at-rest is protected", frameworkCode: "NIST-CSF-2", controlCodes: ["CRY-01", "DCH-01"] },
  { code: "PR.PS-01", title: "Configuration management is applied", frameworkCode: "NIST-CSF-2", controlCodes: ["CFG-01", "CHG-01"] },
  { code: "DE.CM-01", title: "Networks are monitored", frameworkCode: "NIST-CSF-2", controlCodes: ["MON-01", "NET-03"] },
  { code: "RS.MA-01", title: "Incident management is executed", frameworkCode: "NIST-CSF-2", controlCodes: ["IRO-01", "IRO-02"] },
  { code: "RC.RP-01", title: "Recovery plan is executed", frameworkCode: "NIST-CSF-2", controlCodes: ["BCD-01", "BCD-03"] },
  // SOC 2
  { code: "CC1.1", title: "COSO Principle 1: Demonstrates commitment to integrity", frameworkCode: "SOC2-TSC", controlCodes: ["GOV-01", "GOV-04"] },
  { code: "CC6.1", title: "Logical and physical access controls", frameworkCode: "SOC2-TSC", controlCodes: ["IAC-01", "IAC-04", "PES-02"] },
  { code: "CC7.2", title: "Security event monitoring", frameworkCode: "SOC2-TSC", controlCodes: ["MON-01", "MON-02"] },
  { code: "CC8.1", title: "Change management processes", frameworkCode: "SOC2-TSC", controlCodes: ["CHG-01", "CHG-02"] },
  // PCI DSS
  { code: "1.2.1", title: "Network security controls are configured", frameworkCode: "PCI-DSS-4", controlCodes: ["NET-01", "NET-02"] },
  { code: "3.5.1", title: "Primary account numbers are secured", frameworkCode: "PCI-DSS-4", controlCodes: ["CRY-01", "DCH-01"] },
  { code: "6.2.1", title: "Secure development practices", frameworkCode: "PCI-DSS-4", controlCodes: ["TDA-01", "TDA-02"] },
  { code: "8.3.1", title: "Multi-factor authentication", frameworkCode: "PCI-DSS-4", controlCodes: ["IAC-03"] },
  { code: "10.2.1", title: "Audit log implementation", frameworkCode: "PCI-DSS-4", controlCodes: ["MON-01", "MON-03"] },
  // GDPR
  { code: "Art.5", title: "Principles relating to processing of personal data", frameworkCode: "EU-GDPR", controlCodes: ["PRI-01", "DCH-01"] },
  { code: "Art.25", title: "Data protection by design and by default", frameworkCode: "EU-GDPR", controlCodes: ["PRI-02", "SEA-01"] },
  { code: "Art.32", title: "Security of processing", frameworkCode: "EU-GDPR", controlCodes: ["CRY-01", "IAC-01"] },
  { code: "Art.33", title: "Notification of personal data breach", frameworkCode: "EU-GDPR", controlCodes: ["IRO-03"] },
  { code: "Art.15-22", title: "Data subject rights", frameworkCode: "EU-GDPR", controlCodes: ["PRI-03"] },
  // CIS CSC v8
  { code: "CIS-01", title: "Inventory and Control of Enterprise Assets", frameworkCode: "CIS-CSC-8", controlCodes: ["AST-01", "AST-02"] },
  { code: "CIS-04", title: "Secure Configuration of Enterprise Assets", frameworkCode: "CIS-CSC-8", controlCodes: ["CFG-01", "CFG-02"] },
  { code: "CIS-06", title: "Access Control Management", frameworkCode: "CIS-CSC-8", controlCodes: ["IAC-01", "IAC-05"] },
  { code: "CIS-08", title: "Audit Log Management", frameworkCode: "CIS-CSC-8", controlCodes: ["MON-01", "MON-02"] },
  { code: "CIS-10", title: "Malware Defenses", frameworkCode: "CIS-CSC-8", controlCodes: ["END-02"] },
  { code: "CIS-14", title: "Security Awareness and Skills Training", frameworkCode: "CIS-CSC-8", controlCodes: ["SAT-01", "SAT-02"] },
  { code: "CIS-16", title: "Application Software Security", frameworkCode: "CIS-CSC-8", controlCodes: ["TDA-01", "WEB-01"] },
  // NIST 800-53
  { code: "AC-2", title: "Account Management", frameworkCode: "NIST-800-53", controlCodes: ["IAC-01", "IAC-02"] },
  { code: "AU-2", title: "Event Logging", frameworkCode: "NIST-800-53", controlCodes: ["MON-01", "MON-03"] },
  { code: "CM-6", title: "Configuration Settings", frameworkCode: "NIST-800-53", controlCodes: ["CFG-01", "CFG-02"] },
  { code: "CP-2", title: "Contingency Plan", frameworkCode: "NIST-800-53", controlCodes: ["BCD-01", "BCD-03"] },
  { code: "IA-2", title: "Identification and Authentication", frameworkCode: "NIST-800-53", controlCodes: ["IAC-02", "IAC-03"] },
  { code: "IR-4", title: "Incident Handling", frameworkCode: "NIST-800-53", controlCodes: ["IRO-01", "IRO-02"] },
  { code: "RA-3", title: "Risk Assessment", frameworkCode: "NIST-800-53", controlCodes: ["RSK-01", "RSK-02"] },
  { code: "SC-8", title: "Transmission Confidentiality and Integrity", frameworkCode: "NIST-800-53", controlCodes: ["CRY-01", "NET-03"] },
  { code: "SI-2", title: "Flaw Remediation", frameworkCode: "NIST-800-53", controlCodes: ["VPM-01", "VPM-03"] },
];

// ---------- Generate CSV ----------
function generateCsv(): string {
  const lines: string[] = [];
  const h = (fields: string[]) => fields.map(f => `"${f.replace(/"/g, '""')}"`).join(",");
  const headers = "record_type,id,version_label,release_date,is_synthetic,scf_version_id,domain_code,domain_name,description,sort_order,control_code,control_title,control_description,framework_code,framework_name,framework_version,publisher,category,requirement_code,requirement_title,requirement_text,scf_domain_id,scf_framework_id,scf_framework_requirement_id,scf_control_id,relationship_type,mapping_source,is_official";
  lines.push(headers);

  // Version
  lines.push(h(["version", "", "SCF 2024.4", "2024-12-15", "false", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]));

  // Domains
  for (const d of DOMAINS) {
    lines.push(h(["domain", "", "", "", "false", "", d.code, d.name, `SCF domain covering ${d.name.toLowerCase()}.`, String(d.sort), "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]));
  }

  // Controls
  for (const c of CONTROLS) {
    const domainCode = c.code.split("-")[0];
    lines.push(h(["control", "", "", "", "false", "", domainCode, "", "", "", c.code, c.title, c.description, "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]));
  }

  // Frameworks
  for (const f of FRAMEWORKS) {
    lines.push(h(["framework", "", "", "", "false", "", "", "", "", "", "", "", "", f.code, f.name, f.version, f.publisher, f.category, "", "", "", "", "", "", "", "", "", ""]));
  }

  // Requirements + Mappings
  for (const r of REQUIREMENTS) {
    lines.push(h(["requirement", "", "", "", "false", "", "", "", "", "0", "", "", "", r.frameworkCode, "", "", "", "", r.code, r.title, "", "", "", "", "", "", "", ""]));
    for (const cc of r.controlCodes) {
      lines.push(h(["mapping", "", "", "", "false", "", "", "", "", "", cc, "", "", r.frameworkCode, "", "", "", "", r.code, "", "", "", "", "", "", "related", "SCF 2024.4 official crosswalk", "true"]));
    }
  }

  return lines.join("\n");
}

// Output
const csv = generateCsv();
const controlCount = CONTROLS.length;
const domainCount = DOMAINS.length;
const frameworkCount = FRAMEWORKS.length;
const requirementCount = REQUIREMENTS.length;
const mappingCount = REQUIREMENTS.reduce((sum, r) => sum + r.controlCodes.length, 0);

console.log(`Generated SCF seed CSV:`);
console.log(`  Domains: ${domainCount}`);
console.log(`  Controls: ${controlCount}`);
console.log(`  Frameworks: ${frameworkCount}`);
console.log(`  Requirements: ${requirementCount}`);
console.log(`  Mappings: ${mappingCount}`);
console.log(`  Total rows: ${csv.split("\n").length}`);
console.log(`\nWriting to evals/fixtures/scf-2024.4-seed.csv...`);

// Write file
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const outPath = resolve(process.cwd(), "evals", "fixtures", "scf-2024.4-seed.csv");
writeFileSync(outPath, csv, "utf-8");
console.log(`Done: ${outPath}`);
