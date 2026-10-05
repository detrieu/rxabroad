import { auth } from '@clerk/nextjs/server';

/** The signed-in Clerk user's id ("user_..."), or null. Server-only. */
export async function currentUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}
