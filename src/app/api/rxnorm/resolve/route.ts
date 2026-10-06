import type { NextRequest } from 'next/server';
import { resolveUsName } from '@/lib/rxnorm';

/**
 * GET /api/rxnorm/resolve?q=zestoretic → which ingredients a US medicine name contains, and which of
 * them Rx Abroad covers. A thin front for RxNorm: the browser could call RxNorm directly (it allows any
 * origin and needs no key), but one lookup is three chained requests, and answering from here lets the
 * CDN keep each answer for a day, as NLM asks of API users.
 *
 * Anonymous by design: the route is left out of the Clerk matcher in src/proxy.ts, and queries aren't logged.
 */

// A medicine name: starts with a letter or digit, 2–60 characters.
const VALID = /^[\p{L}\p{N}][\p{L}\p{N} .'/-]{1,59}$/u;

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  if (!VALID.test(q)) {
    return Response.json({ error: 'Enter a medicine name of 2 to 60 characters.' }, { status: 400 });
  }
  try {
    const match = await resolveUsName(q);
    return Response.json(
      { query: q, match },
      { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' } },
    );
  } catch (err) {
    console.error('RxNorm lookup failed:', err instanceof Error ? err.message : err);
    return Response.json({ error: 'Lookup unavailable.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
