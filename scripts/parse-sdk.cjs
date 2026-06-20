const fs = require('fs');
const content = fs.readFileSync('packages/sdk/src/client.ts', 'utf8');

// Also look at OpenAPI
const spec = JSON.parse(fs.readFileSync('docs/api/openapi.json', 'utf8'));
let openapiCount = 0;
for (const methods of Object.values(spec.paths)) {
  openapiCount += Object.keys(methods).length;
}

const methodRegex = /this\.client\._(get|post|patch|delete)(?:<[^>]+>)?\(\s*[\`\"']([^\"'\`]+)[\`\"']/g;
let match;
let count = 0;
const sdkPaths = [];
while((match = methodRegex.exec(content)) !== null) {
  count++;
  sdkPaths.push(`${match[1].toUpperCase()} ${match[2]}`);
}

console.log(`Total OpenAPI operations: ${openapiCount}`);
console.log(`Total SDK calls directly: ${count}`);
// fs.writeFileSync('scripts/sdk-paths.txt', sdkPaths.join('\n'));
