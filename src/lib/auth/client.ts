'use client';

import { createAuthClient } from '@neondatabase/auth/next';

/** Better Auth React client, talking to /api/auth/* (proxied to Neon Auth). */
export const authClient = createAuthClient();
