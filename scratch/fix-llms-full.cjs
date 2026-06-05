const fs = require('fs');
const files = ['docs/api/llms-full.txt'];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let c = fs.readFileSync(file, 'utf8');
    c = c.replace(/ -H "x-standard-tenant-id: YOUR_ORG_ID" \\/g, '');
    c = c.replace(/ -H "x-standard-tenant-id: YOUR_ORG_ID"/g, '');
    c = c.replace(/x-standard-tenant-id: org_pa5khl/g, '');
    c = c.replace(/\n\n\n/g, '\n\n'); // clean up empty lines
    fs.writeFileSync(file, c);
    console.log('Fixed', file);
  }
});
