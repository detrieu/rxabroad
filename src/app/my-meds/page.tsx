import type { Metadata } from 'next';
import Link from 'next/link';
import { MyMedsCard } from '@/components/MyMedsCard';

export const metadata: Metadata = {
  title: 'My meds travel card',
  description: 'Pick your medicines and a destination to get a printable card of what to ask for at the pharmacy.',
  alternates: { canonical: '/my-meds' },
};

export default function MyMedsPage() {
  return (
    <main>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">All medicines</Link> / My meds
      </nav>
      <h1 className="page-title">My meds travel card</h1>
      <p className="page-sub no-print">
        Choose where you&apos;re going and what you take. Pill Trotter builds a one-page card with the local name
        to ask for and any cautions. Your list stays in this browser only.
      </p>
      <MyMedsCard />
    </main>
  );
}
