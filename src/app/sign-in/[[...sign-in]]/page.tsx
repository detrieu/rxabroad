import type { Metadata } from 'next';
import { SignIn } from '@clerk/nextjs';
import { CONTAINER } from '@/components/Masthead';
import { PageHero } from '@/components/PageHero';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

export default function SignInPage() {
  return (
    <main>
      <PageHero eyebrow="Your travel cards, on any device" title="Sign in">
        Save trips (your medicines and destinations) and open them on your phone, laptop, or anywhere.
      </PageHero>
      <div className={`${CONTAINER} flex justify-center pt-8`}>
        <SignIn fallbackRedirectUrl="/my-meds" />
      </div>
    </main>
  );
}
