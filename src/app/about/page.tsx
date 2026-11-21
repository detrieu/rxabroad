import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTAINER } from '@/components/Masthead';
import { PageHero } from '@/components/PageHero';
import { SITE_NAME, SITE_URL } from '@/lib/site';

const AUTHOR = {
  name: 'Desmond Trieu',
  credentials: 'PharmD, RPh',
  license: 'Pharmacist licensed in the United States (California)',
};

export const metadata: Metadata = {
  title: 'About',
  description: `${SITE_NAME} is built and reviewed by ${AUTHOR.name}, ${AUTHOR.credentials}. ${AUTHOR.license}.`,
  alternates: { canonical: '/about' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: `About ${SITE_NAME}`,
  url: `${SITE_URL}/about`,
  mainEntity: {
    '@type': 'Person',
    name: AUTHOR.name,
    honorificSuffix: AUTHOR.credentials,
    jobTitle: 'Pharmacist',
    hasCredential: { '@type': 'EducationalOccupationalCredential', credentialCategory: 'license', name: 'Pharmacist license', recognizedBy: { '@type': 'GovernmentOrganization', name: 'California State Board of Pharmacy' } },
  },
  isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
};

export default function AboutPage() {
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <PageHero eyebrow={`About ${SITE_NAME}`} title={<>{AUTHOR.name}, {AUTHOR.credentials}</>}>
        {AUTHOR.license}
      </PageHero>

      <div className={`${CONTAINER} pt-6`}>
        <section className="bg-card text-card-foreground max-w-2xl space-y-4 rounded-2xl border p-6 text-[0.98rem] leading-relaxed shadow-sm">
          <p>
            When I travel, the information I need about medicines and healthcare abroad is spread across many different
            sites. The hardest part is working out what my usual medicine is called in another country, what the local
            equivalent is, and most importantly, whether it&apos;s available at all.
          </p>
          <p>
            When friends fell ill on a trip and needed medicine, knowing what treatment options were available made those
            moments easier. On a trip to{' '}
            <Link href="/country/vietnam" className="text-primary underline underline-offset-4">Vietnam</Link>, I helped a
            fellow traveler I&apos;d never met who has type 1 diabetes and needed insulin, and that moment is a big part of
            what inspired {SITE_NAME}.
          </p>
          <p>
            {SITE_NAME} is the pocket-sized resource I wish I&apos;d had with me every time I traveled: what to ask for at
            the pharmacy, whether you need a prescription, and what you can bring with you.
          </p>
        </section>
        <Link href="/how-we-check" className="text-primary mt-4 inline-block text-sm underline underline-offset-4">How we check each entry</Link>
      </div>
    </main>
  );
}
