// Applies db/migrations/*.sql in order, once each, recording them in public.schema_migrations.
// Usage: node --env-file=.env.local scripts/migrate.mjs   (uses DATABASE_URL_UNPOOLED, falling back to DATABASE_URL)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from '@neondatabase/serverless';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error('Set DATABASE_URL (e.g. node --env-file=.env.local scripts/migrate.mjs)');

const pool = new Pool({ connectionString: url });
const client = await pool.connect();
try {
  await client.query(`create table if not exists public.schema_migrations (
    name text primary key, applied_at timestamptz not null default now())`);
  const { rows } = await client.query('select name from public.schema_migrations');
  const applied = new Set(rows.map((r) => r.name));
  const dir = path.join(ROOT, 'db/migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query('insert into public.schema_migrations (name) values ($1)', [file]);
      await client.query('commit');
      console.log('applied', file);
    } catch (e) {
      await client.query('rollback');
      throw e;
    }
  }
  console.log(`up to date (${files.length} migration${files.length === 1 ? '' : 's'})`);
} finally {
  client.release();
  await pool.end();
}
