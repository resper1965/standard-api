import fs from 'fs';
import path from 'path';

const openapiPath = path.resolve('apps/api-gateway/src/openapi.ts');
const routesDir = path.resolve('apps/api-gateway/src/routes');

if (!fs.existsSync(openapiPath)) {
  console.log('openapi.ts not found');
  process.exit(1);
}

const content = fs.readFileSync(openapiPath, 'utf-8');

// Mapping of route prefix to route file name
const prefixToFileMap: Record<string, string> = {
  '/api/v1/privacy': 'privacy.routes.ts',
  '/api/v1/soc': 'soc.routes.ts',
  '/api/v1/executive': 'executive.routes.ts',
  '/api/v1/agent-runtime': 'agent-runtime.routes.ts',
  '/api/v1/agent-runs': 'agent-runtime.routes.ts',
  '/api/v1/assessments/{assessmentId}/agent-runs': 'agent-runtime.routes.ts',
  '/api/v1/jobs': 'jobs.routes.ts',
  '/api/v1/assessments/{assessmentId}/documents': 'documents.routes.ts',
  '/api/v1/kb': 'kb.routes.ts',
  '/api/v1/assessments/{assessmentId}/soa': 'soa.routes.ts',
  '/api/v1/soa': 'soa.routes.ts',
  '/api/v1/assessments/{assessmentId}/evidence-analysis': 'gap-analysis.routes.ts',
  '/api/v1/assessments/{assessmentId}/evidence-findings': 'gap-analysis.routes.ts',
  '/api/v1/assessments/{assessmentId}/gap-analysis': 'gap-analysis.routes.ts',
  '/api/v1/gap': 'gap-analysis.routes.ts', // Used by evaluate-evidence
  '/api/v1/assessments/{assessmentId}/poam': 'poam.routes.ts',
  '/api/v1/poam': 'poam.routes.ts',
  '/api/v1/assessments/{assessmentId}/reports': 'reporting.routes.ts',
  '/api/v1/webhooks': 'webhook.routes.ts',
  '/api/v1/health': 'health.routes.ts',
  '/api/v1/scf': 'scf.routes.ts',
  '/api/v1/intelligence': 'intelligence.routes.ts',
  '/api/v1/assessments': 'assessments.routes.ts',
};

// We will extract all schema definitions into a shared schemas file for now to avoid dependency hell
// then just append the registry.registerPath calls to their respective route files.

const sharedSchemasFile = path.resolve('apps/api-gateway/src/openapi/schemas.ts');
const schemasDir = path.resolve('apps/api-gateway/src/openapi');

if (!fs.existsSync(schemasDir)) {
  fs.mkdirSync(schemasDir, { recursive: true });
}

// Extract all lines that define Zod schemas or types.
// We'll use a hacky but effective way: copy from line 50 to 240 (schemas block)
const lines = content.split('\n');

let schemaLines = [];
let captureSchema = false;
let registryBlocks: Array<{ file: string, block: string }> = [];

let currentBlock = [];
let capturingRegistry = false;
let currentPathMatch: string | null = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Capture schemas
  if (line.includes('// ==========================================') && lines[i+1]?.includes('// Zod Schemas')) {
    captureSchema = true;
  }
  
  if (captureSchema && line.includes('registry.registerPath({')) {
    captureSchema = false;
  }
  
  if (captureSchema) {
    if (!line.includes('import {') && !line.includes('extendZodWithOpenApi')) {
      schemaLines.push(line);
    }
  }

  // Capture registry.registerPath
  if (line.includes('registry.registerPath({')) {
    capturingRegistry = true;
    currentBlock = [line];
    currentPathMatch = null;
    continue;
  }

  if (capturingRegistry) {
    currentBlock.push(line);
    const pathMatch = line.match(/path:\s*"([^"]+)"/);
    if (pathMatch && !currentPathMatch) {
      currentPathMatch = pathMatch[1];
    }
    
    // Check if this is the end of the registry.registerPath block
    if (line.startsWith('});')) {
      capturingRegistry = false;
      if (currentPathMatch) {
        // Find best matching prefix
        let targetFile = null;
        let longestPrefix = '';
        
        for (const prefix in prefixToFileMap) {
          if (currentPathMatch.startsWith(prefix) && prefix.length > longestPrefix.length) {
            longestPrefix = prefix;
            targetFile = prefixToFileMap[prefix];
          }
        }
        
        if (targetFile) {
          registryBlocks.push({ file: targetFile, block: currentBlock.join('\n') });
        } else {
          console.warn('NO TARGET FILE FOR PATH:', currentPathMatch);
        }
      }
    }
  }
}

// Fix schemaLines imports since they're isolated
const schemaImports = `import { z } from "zod";
import { PaginatedMeta, ApiErrorSchema } from "./registry";\n\n`;

const intelligenceImports = `import {
  GapAnalysisRequestSchema,
  ComplianceScoreRequestSchema,
  DpiaScoreRequestSchema,
  CrossCoverageRequestSchema,
  RoiPathRequestSchema,
  BlastRadiusRequestSchema,
  BlastRadiusOutputSchema,
  GapAnalysisOutputSchema,
  ComplianceScoreOutputSchema,
  DpiaScoreOutputSchema,
  CrossCoverageOutputSchema,
  RoiPathOutputSchema
} from "../schemas/intelligence.schema";\n\n`;

const finalSchemasFileContent = schemaImports + intelligenceImports + schemaLines.filter(l => !l.includes('import {') || l.includes('GapAnalysisRequestSchema')).join('\n');
fs.writeFileSync(sharedSchemasFile, finalSchemasFileContent);

// Determine which files need registry import
const filesToUpdate = new Set(registryBlocks.map(b => b.file));

for (const file of filesToUpdate) {
  const filePath = path.join(routesDir, file);
  if (!fs.existsSync(filePath)) {
    console.warn('File does not exist:', filePath);
    continue;
  }
  
  let routeContent = fs.readFileSync(filePath, 'utf-8');
  
  // Inject imports if not present
  if (!routeContent.includes('import { registry }')) {
    routeContent += `\n\nimport { registry } from "../openapi/registry";\n`;
    routeContent += `import * as OpenApiSchemas from "../openapi/schemas";\n\n`;
  }
  
  // Inject blocks
  const blocksForFile = registryBlocks.filter(b => b.file === file);
  for (const block of blocksForFile) {
    // We need to replace local schema references with OpenApiSchemas
    // e.g. RopaAnalysisOutputSchema -> OpenApiSchemas.RopaAnalysisOutputSchema
    let adjustedBlock = block.block.replace(/([A-Z][a-zA-Z0-9_]*Schema)/g, 'OpenApiSchemas.$1');
    adjustedBlock = adjustedBlock.replace(/PaginatedMeta/g, 'OpenApiSchemas.PaginatedMeta');
    adjustedBlock = adjustedBlock.replace(/ApiErrorSchema/g, 'OpenApiSchemas.ApiErrorSchema');
    adjustedBlock = adjustedBlock.replace(/StartAgentRunInput/g, 'OpenApiSchemas.StartAgentRunInput');
    adjustedBlock = adjustedBlock.replace(/CreateAssessmentInput/g, 'OpenApiSchemas.CreateAssessmentInput');
    adjustedBlock = adjustedBlock.replace(/AgentRunSchema/g, 'OpenApiSchemas.AgentRunSchema');
    
    // Some schemas might be manually skipped. I'll just append it:
    routeContent += `\n${adjustedBlock}\n`;
  }
  
  fs.writeFileSync(filePath, routeContent);
  console.log('Appended paths to', file);
}

console.log('Migration complete. You can now delete openapi.ts');
