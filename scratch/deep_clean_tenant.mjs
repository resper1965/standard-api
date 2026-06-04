import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targets = [
  path.join(__dirname, '../packages/mcp-server'),
  path.join(__dirname, '../packages/sdk'),
  path.join(__dirname, '../apps/api-gateway/src'),
  path.join(__dirname, '../apps/api-gateway/tests')
];

const replacements = [
  { from: /x-standard-tenant-id/g, to: 'x-standard-organization-id' },
  { from: /STANDARD_TENANT_ID/g, to: 'STANDARD_ORGANIZATION_ID' },
  { from: /--tenant-id/g, to: '--organization-id' },
  { from: /tenantId/g, to: 'organizationId' },
  { from: /tenant_id/g, to: 'organization_id' },
  { from: /TenantId/g, to: 'OrganizationId' },
  { from: /TENANT_ID/g, to: 'ORGANIZATION_ID' },
  { from: /tenant/g, to: 'organization' },
  { from: /Tenant/g, to: 'Organization' },
  { from: /TENANT/g, to: 'ORGANIZATION' }
];

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === 'dist' || file === '.turbo' || file === '.git' || file === 'scratch') continue;
    
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    
    if (stat.isDirectory()) {
      walk(filepath);
    } else if (stat.isFile()) {
      if (!filepath.endsWith('.ts') && !filepath.endsWith('.md') && !filepath.endsWith('.json')) continue;
      
      let content = fs.readFileSync(filepath, 'utf8');
      let changed = false;
      for (const { from, to } of replacements) {
        if (from.test(content)) {
          content = content.replace(from, to);
          changed = true;
        }
      }
      
      if (changed) {
        fs.writeFileSync(filepath, content, 'utf8');
        console.log(`Updated: ${filepath}`);
      }
    }
  }
}

for (const target of targets) {
  if (fs.existsSync(target)) {
    walk(target);
  }
}

// Rename files
function renameFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === 'dist' || file === '.turbo' || file === '.git' || file === 'scratch') continue;
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      renameFiles(filepath);
    }
    
    if (file.includes('tenant')) {
      const newName = file.replace(/tenant/g, 'organization');
      fs.renameSync(filepath, path.join(dir, newName));
      console.log(`Renamed: ${file} -> ${newName}`);
    }
  }
}

for (const target of targets) {
  if (fs.existsSync(target)) {
    renameFiles(target);
  }
}

console.log('Cleanup complete.');
