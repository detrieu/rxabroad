import { DRUGS } from '@/data';
import { sql } from '@/lib/db';
import { drugMatches } from '@/lib/search';

/**
 * POST /api/search-miss { q } → counts a search that matched nothing, so the next medicines added are the ones
 * people look for. Anonymous: only the search text and a count are kept, no user, IP or session.
 */

const VALID = /^[\p{L}\p{N}][\p{L}\p{N} .'/+-]{2,59}$/u;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const q = String(body?.q ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  // Recheck on the server: only a real miss is counted, whatever the client sends.
  if (!VALID.test(q) || DRUGS.some((d) => drugMatches(d, q).matches)) return new Response(null, { status: 204 });
  try {
    await sql`insert into public.search_misses (query) values (${q})
      on conflict (query) do update set count = search_misses.count + 1, last_seen = now()`;
  } catch (err) {
    console.error('search miss not recorded:', err instanceof Error ? err.message : err);
  }
  return new Response(null, { status: 204 });
}
