const fs = require('fs');

const clientCode = fs.readFileSync('packages/sdk/src/client.ts', 'utf8');

const classRegex = /class\s+([A-Za-z0-9_]+)\s*(?:extends\s+[A-Za-z0-9_]+)?\s*{([^}]*)}/g;
let match;
let count = 0;
while ((match = classRegex.exec(clientCode)) !== null) {
  const className = match[1];
  const body = match[2];
  
  if (className === 'StandardClient' || className === 'BaseResource') continue;

  const methodRegex = /\s*(?:async\s+)?([a-zA-Z0-9_]+)\s*\(/g;
  let methodMatch;
  while ((methodMatch = methodRegex.exec(body)) !== null) {
    const methodName = methodMatch[1];
    if (['constructor', 'request', 'constructor', 'get', 'set'].includes(methodName)) continue;
    console.log(`${className}.${methodName}`);
    count++;
  }
}
console.log(`Total SDK methods: ${count}`);
