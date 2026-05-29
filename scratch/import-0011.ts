import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';

const sql = neon(process.env.DATABASE_URL!);
let content = readFileSync('infra/docker/postgres/seeds/0011_pt_qnrcs_derived_seed.sql', 'utf8');

// Strip out BEGIN; and COMMIT; to make it a single command
content = content.replace(/^BEGIN\s*;\s*$/gm, '');
content = content.replace(/^COMMIT\s*;\s*$/gm, '');

async function main() {
  await sql(content);
  console.log('✅ 0011 PT-QNRCS imported');
}

main().catch(console.error);
