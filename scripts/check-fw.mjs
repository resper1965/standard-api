const H='ep-REDACTED-endpoint.c-6.us-east-1.aws.neon.tech';
const CS='postgresql://neondb_owner:npg_REDACTED@'+H+'/neondb?sslmode=require';
async function q(s){const r=await fetch('https://'+H+'/sql',{method:'POST',headers:{'Content-Type':'application/json','Neon-Connection-String':CS},body:JSON.stringify({query:s})});return(await r.json()).rows}
(async()=>{
  const rows=await q("SELECT framework_id, name, version_label, publisher, category, jurisdiction FROM scf_frameworks ORDER BY framework_id LIMIT 30");
  rows.forEach(r=>{const v=Array.isArray(r)?r:Object.values(r);console.log(v.join(' | '))});
})()
