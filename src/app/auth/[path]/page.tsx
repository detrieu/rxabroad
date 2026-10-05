import type { Metadata } from 'next';
import { AuthView } from '@neondatabase/auth-ui';
import { authViewPaths } from '@neondatabase/auth-ui/server';
import { CONTAINER } from '@/components/Masthead';
import { PageHero } from '@/components/PageHero';

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

const TITLES: Record<string, string> = {
  'sign-in': 'Sign in',
  'sign-up': 'Create your account',
  'forgot-password': 'Reset your password',
  'reset-password': 'Choose a new password',
};

export async function generateMetadata({ params }: PageProps<'/auth/[path]'>): Promise<Metadata> {
  const { path } = await params;
  return { title: TITLES[path] ?? 'Account', robots: { index: false } };
}

export default async function AuthPage({ params }: PageProps<'/auth/[path]'>) {
  const { path } = await params;
  return (
    <main>
      <PageHero eyebrow="Your travel cards, on any device" title={TITLES[path] ?? 'Account'}>
        Sign in to save trips (your medicines and destinations) and open them on your phone, laptop, or anywhere.
      </PageHero>
      <div className={`${CONTAINER} flex justify-center pt-8`}>
        <AuthView path={path} className="w-full max-w-md" />
      </div>
    </main>
  );
}
