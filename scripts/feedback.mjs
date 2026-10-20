// What people searched for and didn't find, and the problems they reported, newest first.
// Usage: npm run feedback [-- --days 30]

import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('Set DATABASE_URL (npm run feedback reads .env.local)');
const sql = neon(url);
const at = process.argv.indexOf('--days');
const days = at > 0 ? Number(process.argv[at + 1]) || 30 : 30;

const misses = await sql`select query, count, last_seen from public.search_misses
  where last_seen > now() - make_interval(days => ${days}) order by count desc, last_seen desc limit 50`;
console.log(`\nSearches that found nothing, last ${days} days (${misses.length})`);
for (const m of misses) console.log(`  ${String(m.count).padStart(4)}  ${m.query}`);

const reports = await sql`select drug_id, country, message, created_at from public.feedback
  where created_at > now() - make_interval(days => ${days}) order by created_at desc limit 100`;
console.log(`\nReported problems, last ${days} days (${reports.length})`);
for (const r of reports) {
  console.log(`\n  ${r.created_at.toISOString().slice(0, 10)}  ${r.drug_id} · ${r.country}`);
  console.log(`  ${r.message.replace(/\n/g, '\n  ')}`);
}
console.log();
