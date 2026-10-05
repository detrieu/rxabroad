import { verifyWebhook } from '@clerk/nextjs/webhooks';
import type { NextRequest } from 'next/server';
import { sql } from '@/lib/db';

/**
 * Clerk → Neon cleanup. When a Clerk user is deleted (by themselves from "Manage account", or by an admin),
 * delete their saved trips. Trips have no foreign key to Clerk, so this is what keeps data from lingering.
 *
 * Signature-verified with CLERK_WEBHOOK_SIGNING_SECRET. Deleting is idempotent, so Svix retries are safe.
 * The route is public in src/proxy.ts (clerkMiddleware protects nothing by default).
 */
export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error('Clerk webhook verification failed:', err instanceof Error ? err.message : err);
    return new Response('Verification failed', { status: 400 });
  }

  if (evt.type === 'user.deleted') {
    const userId = evt.data.id;
    if (userId) {
      const deleted = await sql`delete from public.trips where user_id = ${userId} returning id`;
      console.log(`Clerk user.deleted ${userId}: removed ${deleted.length} trip(s)`);
    }
  }

  return new Response('OK', { status: 200 });
}
