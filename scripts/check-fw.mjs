const CS = process.env.DATABASE_URL;
if (!CS) {
  console.error("DATABASE_URL env var is required");
  process.exit(1);
}
const H = new URL(CS).hostname;
async function q(s){const r=await fetch('https://'+H+'/sql',{method:'POST',headers:{'Content-Type':'application/json','Neon-Connection-String':CS},body:JSON.stringify({query:s})});return(await r.json()).rows}
(async()=>{
  const rows=await q("SELECT framework_id, name, version_label, publisher, category, jurisdiction FROM scf_frameworks ORDER BY framework_id LIMIT 30");
  rows.forEach(r=>{const v=Array.isArray(r)?r:Object.values(r);console.log(v.join(' | '))});
})()
