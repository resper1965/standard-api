const fs = require('fs');
const path = require('path');

const filePath = path.resolve('apps/api-gateway/src/routes/intelligence.routes.ts');
let content = fs.readFileSync(filePath, 'utf-8');

const replacements = [
  {
    schema: 'BlastRadiusRequestSchema',
    openapi: `openapi: {
      tags: ["Intelligence"],
      summary: "Calculate Control Blast Radius",
      description: "Determines the impact radius of a control across risks, regulations, and data categories.",
      responses: {
        200: {
          description: "Blast Radius Results",
          content: { "application/json": { schema: z.object({ data: BlastRadiusOutputSchema, trace_id: z.string() }) } }
        }
      }
    },`
  },
  {
    schema: 'GapAnalysisRequestSchema',
    openapi: `openapi: {
      tags: ["Intelligence"],
      summary: "Perform Gap Analysis",
      description: "Analyzes implemented controls against a target framework to identify gaps.",
      responses: {
        200: {
          description: "Gap Analysis Results",
          content: { "application/json": { schema: z.object({ data: GapAnalysisOutputSchema, trace_id: z.string() }) } }
        }
      }
    },`
  },
  {
    schema: 'DpiaScoreRequestSchema',
    openapi: `openapi: {
      tags: ["Intelligence"],
      summary: "Calculate DPIA Score",
      description: "Calculates the DPIA risk score based on data categories and implemented controls.",
      responses: {
        200: {
          description: "DPIA Score Results",
          content: { "application/json": { schema: z.object({ data: DpiaScoreOutputSchema, trace_id: z.string() }) } }
        }
      }
    },`
  },
  {
    schema: 'ComplianceScoreRequestSchema',
    openapi: `openapi: {
      tags: ["Intelligence"],
      summary: "Calculate Compliance Score",
      description: "Calculates compliance score against a specific regulation based on implemented controls.",
      responses: {
        200: {
          description: "Compliance Score Results",
          content: { "application/json": { schema: z.object({ data: ComplianceScoreOutputSchema, trace_id: z.string() }) } }
        }
      }
    },`
  },
  {
    schema: 'RetentionCheckRequestSchema',
    openapi: `openapi: {
      tags: ["Intelligence"],
      summary: "Check Data Retention Rules",
      description: "Checks data retention rules based on category, purpose, and jurisdiction.",
      responses: {
        200: {
          description: "Retention Rules Results",
          content: { "application/json": { schema: z.object({ data: RetentionCheckOutputSchema, trace_id: z.string() }) } }
        }
      }
    },`
  },
  {
    schema: 'BreachSlaRequestSchema',
    openapi: `openapi: {
      tags: ["Intelligence"],
      summary: "Check Breach Notification SLA",
      description: "Determines breach notification SLA based on regulation and severity.",
      responses: {
        200: {
          description: "Breach SLA Results",
          content: { "application/json": { schema: z.object({ data: BreachSlaOutputSchema, trace_id: z.string() }) } }
        }
      }
    },`
  },
  {
    schema: 'CrossCoverageRequestSchema',
    openapi: `openapi: {
      tags: ["Intelligence"],
      summary: "Calculate Cross-Framework Coverage",
      description: "Calculates coverage mapping between a source framework and a target framework.",
      responses: {
        200: {
          description: "Cross Coverage Results",
          content: { "application/json": { schema: z.object({ data: CrossCoverageOutputSchema, trace_id: z.string() }) } }
        }
      }
    },`
  },
  {
    schema: 'RoiPathRequestSchema',
    openapi: `openapi: {
      tags: ["Intelligence"],
      summary: "Calculate ROI Path for Controls",
      description: "Recommends the most impactful controls to implement based on ROI.",
      responses: {
        200: {
          description: "ROI Path Results",
          content: { "application/json": { schema: z.object({ data: RoiPathOutputSchema, trace_id: z.string() }) } }
        }
      }
    },`
  }
];

for (const rep of replacements) {
  content = content.replace(
    new RegExp(\`bodySchema: \${rep.schema},\`),
    \`bodySchema: \${rep.schema},\n    \${rep.openapi}\`
  );
}

fs.writeFileSync(filePath, content);
console.log("Updated intelligence.routes.ts");
