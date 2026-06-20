const fs = require('fs');
const yaml = require('js-yaml');

const json = JSON.parse(fs.readFileSync('docs/api/openapi.json', 'utf8'));
const yamlStr = yaml.dump(json, { noRefs: true, skipInvalid: true });

fs.writeFileSync('docs/api/openapi.yaml', yamlStr);
console.log('Generated openapi.yaml');
