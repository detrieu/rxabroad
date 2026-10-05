import { neon } from '@neondatabase/serverless';

/** Neon over HTTP: one round-trip per query, no connection pool to manage on serverless. */
export const sql = neon(process.env.DATABASE_URL!);
