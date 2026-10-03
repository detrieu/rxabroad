import type { Metadata } from 'next';
import { MyMedsCard } from '@/components/MyMedsCard';
import { CONTAINER } from '@/components/Masthead';
import { PageHero } from '@/components/PageHero';

export const metadata: Metadata = {
  title: 'My meds travel card',
  description: 'Pick your medicines and a destination to get a printable card of what to ask for at the pharmacy.',
  alternates: { canonical: '/my-meds' },
};

export default function MyMedsPage() {
  return (
    <main>
      <div className="no-print">
        <PageHero eyebrow="Boarding pass for your medicine bag" title="My travel card">
          Choose where you&apos;re going and what you take. You&apos;ll get a one-page card with the local name to ask
          for and any cautions. Your list stays in this browser only.
        </PageHero>
      </div>
      <div className={`${CONTAINER} pt-6`}>
        <MyMedsCard />
      </div>
    </main>
  );
}
