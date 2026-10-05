import { createNeonAuth } from '@neondatabase/auth/next/server';

/** Neon Auth (managed Better Auth). Server-only: route handler, server components, server actions. */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});

/** The signed-in user's id, or null. */
export async function currentUserId(): Promise<string | null> {
  const { data } = await auth.getSession();
  return data?.user?.id ?? null;
}
