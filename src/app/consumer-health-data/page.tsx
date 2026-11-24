import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection, LIST } from '@/components/LegalPage';
import { CONTACT_EMAIL, SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Consumer health data policy',
  description: `How ${SITE_NAME} handles consumer health data under Washington's My Health My Data Act and similar laws.`,
  alternates: { canonical: '/consumer-health-data' },
};

const LINK = 'text-primary underline underline-offset-4';
const Email = () => <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>{CONTACT_EMAIL}</a>;

// Washington's My Health My Data Act wants this as its own policy, linked from the homepage (the footer does that).
export default function ConsumerHealthDataPage() {
  return (
    <LegalPage
      title="Consumer health data policy"
      updated="2026-11-24"
      intro={<>For residents of Washington, Nevada, Connecticut and other states with consumer health data laws.</>}
    >
      <LegalSection id="what" title="What we collect">
        <p>
          The only consumer health data we collect is the list of medicines in trips you save to an account. Anything you
          put in a Report a problem message is not linked to you, but please don&apos;t include health details there.
          Medicines you add without an account stay in your browser and never reach us.
        </p>
      </LegalSection>

      <LegalSection id="source" title="Where it comes from and why">
        <p>
          It comes only from you, when you save a trip. We collect it only after you consent, and use it only to show your
          saved trips back to you on any device.
        </p>
      </LegalSection>

      <LegalSection id="sharing" title="Who it's shared with">
        <ul className={LIST}>
          <li>Neon, our database host, and Vercel, our web host, which process it only on our instructions.</li>
          <li>No one else. We don&apos;t sell consumer health data, and we don&apos;t use geofencing.</li>
        </ul>
      </LegalSection>

      <LegalSection id="rights" title="Your rights">
        <p>You can:</p>
        <ul className={LIST}>
          <li>confirm whether we hold your consumer health data, and get a copy</li>
          <li>get a list of everyone it has been shared with</li>
          <li>withdraw consent, which deletes all your saved trips</li>
          <li>have it deleted, including from our service providers</li>
        </ul>
        <p>
          Withdraw consent or delete trips yourself on <Link href="/my-meds" className={LINK}>My Meds</Link>, or delete
          your account from Manage account. For anything else, email <Email /> from the address on your account. We&apos;ll
          reply within 45 days. If we turn down a request, you can appeal by replying to our answer, and if we still say
          no, you can contact your state attorney general.
        </p>
        <p>
          See the full <Link href="/privacy" className={LINK}>privacy policy</Link> for everything else.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
