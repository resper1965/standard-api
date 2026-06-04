import {
  LLMS_FULL_HEADER,
  getLlmsFullCookbook,
  getLlmsFullCookbookOps,
  getLlmsFullQuickRef,
} from "./llms-constants";

/** Extract example values from an OpenAPI schema object */
function extractExample(schema: any): any {
  if (!schema || typeof schema !== 'object') return {};
  if (schema.example !== undefined) return schema.example;
  if (schema.type === 'string') return schema.example ?? "string";
  if (schema.type === 'number' || schema.type === 'integer') return schema.example ?? 0;
  if (schema.type === 'boolean') return schema.example ?? false;
  if (schema.type === 'array') return [extractExample(schema.items)];
  if (schema.properties) {
    const obj: Record<string, any> = {};
    for (const [key, val] of Object.entries(schema.properties)) {
      obj[key] = extractExample(val);
    }
    return obj;
  }
  if (schema.$ref) return `<see ${schema.$ref}>`;
  return {};
}

let cachedLlmsFullTxt: string | null = null;

export function generateLlmsFullTxt(spec: any, baseUrl: string = "https://standard-api.bekaa.eu"): string {
  if (cachedLlmsFullTxt) {
    return cachedLlmsFullTxt;
  }

  const header = LLMS_FULL_HEADER(spec, baseUrl);
  const cookbook = getLlmsFullCookbook(baseUrl);
  const cookbookOps = getLlmsFullCookbookOps(baseUrl);
  const quickRef = getLlmsFullQuickRef();

  const refLines: string[] = [
    `## Endpoint Reference`,
    ``,
    `> Auto-generated from OpenAPI spec. For full schemas, see /docs/openapi.json`,
    ``,
  ];

  const paths = spec.paths || {};
  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, details] of Object.entries(methods as Record<string, any>)) {
      if (typeof details !== 'object' || !details.summary) continue;
      refLines.push(`### ${method.toUpperCase()} \`${path}\``);
      refLines.push(``);
      refLines.push(`**${details.summary}**`);
      if (details.description) {
        refLines.push(``);
        refLines.push(details.description);
      }
      refLines.push(``);

      const body = details.requestBody?.content?.['application/json']?.schema;
      if (body) {
        refLines.push(`**Request Body:**`);
        refLines.push('```json');
        try {
          refLines.push(JSON.stringify(extractExample(body), null, 2));
        } catch {
          refLines.push('{ /* see /docs/openapi.json */ }');
        }
        refLines.push('```');
        refLines.push(``);
      }

      const responses = details.responses || {};
      for (const [status, resp] of Object.entries(responses as Record<string, any>)) {
        refLines.push(`**${status}**: ${resp.description || ''}`);
      }
      refLines.push(``);
      refLines.push(`---`);
      refLines.push(``);
    }
  }

  const fullContent = [header, cookbook, cookbookOps, refLines.join("\n"), quickRef].join("\n");
  cachedLlmsFullTxt = fullContent;
  
  return fullContent;
}
