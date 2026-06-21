const fs = require('fs');

const spec = JSON.parse(fs.readFileSync('docs/api/openapi.json', 'utf8'));
const openapiPaths = new Set();
for (const [path, methods] of Object.entries(spec.paths)) {
  for (const method of Object.keys(methods)) {
    // Normalize path by replacing {param} with just the path structure
    openapiPaths.add(`${method.toUpperCase()} ${path.replace(/\{[^}]+\}/g, '{}')}`);
  }
}

const clientCode = fs.readFileSync('packages/sdk/src/client.ts', 'utf8');
const sdkPaths = new Set();
// A robust regex to find all HTTP calls in client.ts
// Format: this.client._get<...>(`/path/${param}/...`)
const methodRegex = /_client\._(get|post|patch|delete)[^\(]*\(\s*[\`\"']([^\"'\`]+)[\`\"']/g;
let match;
while ((match = methodRegex.exec(clientCode)) !== null) {
  const method = match[1].toUpperCase();
  // The path in client.ts uses ${...} for params. Replace them with {} to match OpenAPI.
  let path = match[2];
  // Remove URL query params if any
  path = path.split('?')[0];
  // Strip ${qs(query)} if present
  path = path.replace(/\$\{qs\([^)]*\)\}/g, '');
  path = path.replace(/\$\{[^}]+\}/g, '{}');
  // Ensure path starts with /api/v1 (client.ts prepends it in _request)
  if (!path.startsWith('/api/v1')) {
     path = '/api/v1' + (path.startsWith('/') ? '' : '/') + path;
  }
  sdkPaths.add(`${method} ${path}`);
}

// Find intersections and differences
const openapiArr = Array.from(openapiPaths).sort();
const sdkArr = Array.from(sdkPaths).sort();

const missingInSdk = openapiArr.filter(p => !sdkPaths.has(p));
const missingInOpenAPI = sdkArr.filter(p => !openapiPaths.has(p));

console.log(`Total OpenAPI operations: ${openapiArr.length}`);
console.log(`Total SDK parsed calls: ${sdkArr.length}`);
console.log('\n--- Missing in SDK (OpenAPI has it, SDK does not): ---');
console.log(missingInSdk.join('\n'));

console.log('\n--- Extra in SDK (SDK has it, OpenAPI does not): ---');
console.log(missingInOpenAPI.join('\n'));
