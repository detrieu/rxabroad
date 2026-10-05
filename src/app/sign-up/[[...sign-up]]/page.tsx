import type { Metadata } from 'next';
import { SignUp } from '@clerk/nextjs';
import { CONTAINER } from '@/components/Masthead';
import { PageHero } from '@/components/PageHero';

export const metadata: Metadata = { title: 'Create your account', robots: { index: false } };

export default function SignUpPage() {
  return (
    <main>
      <PageHero eyebrow="Your travel cards, on any device" title="Create your account">
        Save trips (your medicines and destinations) and open them on your phone, laptop, or anywhere.
      </PageHero>
      <div className={`${CONTAINER} flex justify-center pt-8`}>
        <SignUp fallbackRedirectUrl="/my-meds" />
      </div>
    </main>
  );
}
