import type { Metadata } from 'next';
import { AccountView } from '@neondatabase/auth-ui';
import { accountViewPaths } from '@neondatabase/auth-ui/server';
import { CONTAINER } from '@/components/Masthead';
import { PageHero } from '@/components/PageHero';

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(accountViewPaths).map((path) => ({ path }));
}

export const metadata: Metadata = { title: 'Account settings', robots: { index: false } };

export default async function AccountPage({ params }: PageProps<'/account/[path]'>) {
  const { path } = await params;
  return (
    <main>
      <PageHero eyebrow="Account" title="Account settings" />
      <div className={`${CONTAINER} pt-8`}>
        <AccountView path={path} />
      </div>
    </main>
  );
}
