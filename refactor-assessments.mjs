import fs from 'fs';
import path from 'path';

const routesDir = 'apps/api-gateway/src/routes';
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace deps.assessments.get(assessmentId, tenantId)
  // Usually it looks like: await deps.assessments.get(assessmentId, tenantId)
  // Or: await deps.assessments.get(routeParam(params, "assessmentId"), tenantId!)
  content = content.replace(
    /await deps\.assessments\.get\((.*?),\s*([a-zA-Z0-9_!]+)\)/g,
    'await deps.assessments.withTenant($2).get($1)'
  );

  // Replace await deps.assessments.save(...)
  // Usually we have assessment object with tenant_id or something in context
  // Let's replace simple cases if we can.
  // In soa.routes.ts e.g., we do `await deps.assessments.save(assessment);`
  // We can change this to `await deps.assessments.withTenant(assessment.tenant_id).save(assessment);`
  content = content.replace(
    /await deps\.assessments\.save\((assessment|updated)\)/g,
    'await deps.assessments.withTenant($1.tenant_id).save($1)'
  );

  // In `assessments.routes.ts`, `save(assessment)` occurs but what about the first argument?
  // Let's just catch the exact text.
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated', file);
  }
});
