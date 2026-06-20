const fs = require('fs'); 
const file = 'apps/api-gateway/src/openapi/docs/llms-constants.ts'; 
let content = fs.readFileSync(file, 'utf8'); 
content = content.replace(/\\\$\{baseUrl\}/g, '${baseUrl}'); 
fs.writeFileSync(file, content);
