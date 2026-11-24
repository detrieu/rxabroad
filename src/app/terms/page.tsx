import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection, LIST } from '@/components/LegalPage';
import { CONTACT_EMAIL, SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Terms of use',
  description: `The terms for using ${SITE_NAME}, a reference for medicine names, prescription rules and what you can bring when you travel.`,
  alternates: { canonical: '/terms' },
};

const LINK = 'text-primary underline underline-offset-4';

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      updated="2026-11-24"
      intro={<>By using {SITE_NAME}, you agree to these terms. If you don&apos;t agree, please don&apos;t use the site.</>}
    >
      <LegalSection id="what" title="What Rx Abroad is">
        <p>
          {SITE_NAME} is general information about what medicines are called in other countries, whether they need a
          prescription there, and what travelers can bring in. It isn&apos;t a pharmacy, it doesn&apos;t sell medicines,
          and it isn&apos;t medical or legal advice.
        </p>
      </LegalSection>

      <LegalSection id="rely" title="Check before you rely on it">
        <ul className={LIST}>
          <li>
            Brand names, stock and prescription rules change and vary by pharmacy. We check entries against official
            registries (see <Link href="/how-we-check" className={LINK}>How we check</Link>), but we can&apos;t promise
            every entry is complete or current.
          </li>
          <li>
            Before you take, buy or carry a medicine, confirm with a local pharmacist or doctor. For what you can bring
            across a border, the destination country&apos;s embassy or customs authority has the final word.
          </li>
          <li>
            Using {SITE_NAME} doesn&apos;t create a pharmacist or doctor relationship with anyone, including the
            pharmacists who review entries.
          </li>
          <li>In an emergency, call the local emergency number.</li>
        </ul>
      </LegalSection>

      <LegalSection id="account" title="Your account">
        <p>
          You need to be at least 16 to create an account. Keep your sign-in secure, and you&apos;re responsible for what
          happens under your account. You can delete it at any time from Manage account.
        </p>
      </LegalSection>

      <LegalSection id="use" title="Using the site fairly">
        <p>Please don&apos;t:</p>
        <ul className={LIST}>
          <li>use {SITE_NAME} to break the law, including laws on importing or buying controlled medicines</li>
          <li>try to break into, overload or disrupt the site, or get around its limits</li>
          <li>copy the data in bulk with automated tools, or republish it as your own</li>
          <li>send reports that are false, abusive or full of spam</li>
        </ul>
        <p>We may suspend accounts or block access that breaks these terms.</p>
      </LegalSection>

      <LegalSection id="content" title="Our content and yours">
        <ul className={LIST}>
          <li>
            The {SITE_NAME} data, writing and design belong to us. You&apos;re welcome to share links and quote short
            parts with credit.
          </li>
          <li>Registry records and other sources we link to belong to the people who publish them.</li>
          <li>When you send a report, you let us use it to correct and improve {SITE_NAME}.</li>
        </ul>
      </LegalSection>

      <LegalSection id="links" title="Other sites">
        <p>
          We link to registries, government pages and other sites we don&apos;t control, and we&apos;re not responsible
          for what they say or do.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="No guarantees">
        <p>
          {SITE_NAME} is provided as is and as available, without warranties of any kind. To the fullest extent the law
          allows, we&apos;re not liable for any loss or harm from using the site or relying on its information, including
          a medicine being unavailable, refused at a pharmacy or stopped at a border. Some places don&apos;t allow these
          limits, so they may not all apply to you.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes">
        <p>
          We may change {SITE_NAME} or these terms. If the terms change, we&apos;ll update the date at the top, and
          continuing to use the site means you accept the new version.
        </p>
      </LegalSection>

      <LegalSection id="law" title="Law and contact">
        <p>
          These terms are governed by the laws of California, United States. Questions go to{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>{CONTACT_EMAIL}</a>. See also our{' '}
          <Link href="/privacy" className={LINK}>privacy policy</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
