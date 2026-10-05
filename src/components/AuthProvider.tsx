'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthUIProvider } from '@neondatabase/auth-ui';
import { Toaster } from 'sonner';
import { authClient } from '@/lib/auth/client';

/**
 * Better Auth UI wired to Neon Auth. We use AuthUIProvider directly instead of NeonAuthUIProvider:
 * the Neon wrapper adds its own next-themes provider, which would fight the app's theme toggle.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  return (
    <AuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={() => router.refresh()}
      Link={Link}
      redirectTo="/my-meds"
      social={{ providers: ['google'] }}
    >
      {children}
      <Toaster position="top-center" richColors closeButton />
    </AuthUIProvider>
  );
}
