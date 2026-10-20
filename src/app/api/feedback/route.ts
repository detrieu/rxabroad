import { COUNTRIES, DRUGS } from '@/data';
import { sql } from '@/lib/db';

/**
 * POST /api/feedback { drugId, country, message } → stores a problem someone reports with one entry.
 * Anonymous: no user, IP or session is kept. `website` is a field people never see; bots that fill it are ignored.
 */

const DRUG_IDS = new Set(DRUGS.map((d) => d.id));
const CODES = new Set<string>(COUNTRIES.map((c) => c.code));

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const drugId = String(body?.drugId ?? '');
  const country = String(body?.country ?? '');
  const message = String(body?.message ?? '').trim().replace(/\s+\n/g, '\n');
  if (body?.website) return new Response(null, { status: 204 });
  if (!DRUG_IDS.has(drugId) || !CODES.has(country) || message.length < 3 || message.length > 1000) {
    return Response.json({ error: 'Write a few words about what is wrong (up to 1000 characters).' }, { status: 400 });
  }
  try {
    await sql`insert into public.feedback (drug_id, country, message) values (${drugId}, ${country}, ${message})`;
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error('feedback not saved:', err instanceof Error ? err.message : err);
    return Response.json({ error: 'Could not send it. Try again later.' }, { status: 502 });
  }
}
