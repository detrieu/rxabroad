import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection, LIST } from '@/components/LegalPage';
import { CONTACT_EMAIL, SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: `What ${SITE_NAME} collects, why, and how to see or delete it. No ads, no tracking, and nothing is sold.`,
  alternates: { canonical: '/privacy' },
};

const UPDATED = '2026-11-24';

const LINK = 'text-primary underline underline-offset-4';
const Email = () => <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>{CONTACT_EMAIL}</a>;

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated={UPDATED}
      intro={<>You can use {SITE_NAME} without an account. There are no ads or tracking, and we don&apos;t sell or share your data.</>}
    >
      <LegalSection id="who" title="Who we are">
        <p>
          {SITE_NAME} (&ldquo;we&rdquo;, &ldquo;us&rdquo; or &ldquo;our&rdquo;) is based in California, United States, and
          is the controller of the personal data described here. For anything about your data, email <Email />.
        </p>
      </LegalSection>

      <LegalSection id="device" title="What stays on your device">
        <p>
          The medicines and destinations you add to My Meds, and the offline copy of your travel card, are saved in your
          browser. They aren&apos;t sent to us. Remove them on the My Meds page, or clear this site&apos;s data in your
          browser.
        </p>
      </LegalSection>

      <LegalSection id="collect" title="What we collect, why, and on what basis">
        <ul className={LIST}>
          <li>
            <strong>Your account</strong> (optional). Your email address and, if you sign in with Google, the name and
            profile photo Google shares. Used to sign you in. Basis: providing the service you asked for (GDPR art.
            6(1)(b)).
          </li>
          <li id="health">
            <strong>Saved trips</strong> (optional). Each trip&apos;s name, destinations and medicine list. A medicine
            list is health data, so we store it only after you tick the consent box, and use it only to show your trips
            back to you. Basis: providing the service (art. 6(1)(b)) and your explicit consent (art. 9(2)(a)). You can
            withdraw consent at any time on the My Meds page, which deletes all your trips.
          </li>
          <li>
            <strong>Reports.</strong> When you use Report a problem, we keep the medicine, the country and your message,
            with no account, IP address or session attached. Please don&apos;t include personal or health details. Basis:
            our legitimate interest in keeping the data accurate (art. 6(1)(f)).
          </li>
          <li>
            <strong>Searches with no results.</strong> Only the search text and a count, so we know which medicines to add
            next. This isn&apos;t linked to anyone.
          </li>
          <li>
            <strong>US medicine names.</strong> When you look up a US brand name, our server sends only that name to
            RxNorm at the U.S. National Library of Medicine. We don&apos;t log these lookups.
          </li>
          <li>
            <strong>Server logs.</strong> Our host keeps short-lived logs, including IP addresses, to run the site and
            protect it from abuse. Basis: legitimate interest in security (art. 6(1)(f)).
          </li>
        </ul>
        <p>
          Giving us data is never required to use the site. An email address is needed only if you want an account. We
          don&apos;t use your data for advertising, profiling or automated decisions.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="Cookies and browser storage">
        <p>
          We use only what&apos;s strictly needed for features you ask for: Clerk&apos;s sign-in cookies, and browser
          storage for your My Meds card and its offline copy. There are no analytics, advertising or tracking cookies, so
          there&apos;s nothing to opt in or out of.
        </p>
      </LegalSection>

      <LegalSection id="providers" title="Who handles your data">
        <p>These services process data for us under data processing agreements, and only to run {SITE_NAME}:</p>
        <ul className={LIST}>
          <li><strong>Clerk</strong>: accounts and sign-in</li>
          <li><strong>Neon</strong>: our database, hosted in the United States</li>
          <li><strong>Vercel</strong>: hosting and server logs</li>
          <li><strong>Google</strong>: only if you choose to sign in with Google</li>
        </ul>
        <p>
          We may also disclose data if the law requires it. We don&apos;t sell personal information or share it for
          cross-context behavioral advertising, and we haven&apos;t in the past 12 months.
        </p>
      </LegalSection>

      <LegalSection id="transfers" title="International transfers">
        <p>
          Your data is stored and processed in the United States. For people in the EU, EEA, UK and Switzerland, transfers
          rely on the EU-U.S. Data Privacy Framework where a provider is certified, or on the European Commission&apos;s
          Standard Contractual Clauses.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="How long we keep it">
        <ul className={LIST}>
          <li>Your account and saved trips: until you delete them, withdraw consent, or delete your account.</li>
          <li>Deleting your account from Manage account deletes your account and all your saved trips.</li>
          <li>Server logs: a short time, under our host&apos;s retention limits.</li>
          <li>Reports and search counts: as long as they help correct the data. They aren&apos;t linked to you.</li>
        </ul>
      </LegalSection>

      <LegalSection id="rights" title="Your rights">
        <p>Wherever you live, you can ask us to:</p>
        <ul className={LIST}>
          <li>tell you what personal data we hold about you, and give you a copy in a portable format</li>
          <li>correct it, or delete it</li>
          <li>restrict or object to how we use it</li>
          <li>withdraw consent at any time, without affecting what happened before</li>
        </ul>
        <p>
          Most of this you can do yourself on <Link href="/my-meds" className={LINK}>My Meds</Link> and in Manage account.
          Otherwise, email <Email /> from the address on your account so we can confirm it&apos;s you. We&apos;ll reply
          within one month (45 days for US state law requests). We won&apos;t treat you differently for using these
          rights.
        </p>
        <p>
          <strong>In the EU, EEA or UK</strong>, you can also complain to your local data protection authority, or the
          UK Information Commissioner&apos;s Office.
        </p>
      </LegalSection>

      <LegalSection id="california" title="California and other US states">
        <p>
          Under the California Consumer Privacy Act and similar laws in other states, here is what we collected in the
          past 12 months:
        </p>
        <ul className={LIST}>
          <li><strong>Identifiers</strong>, like your email address: from you or Google, to run your account.</li>
          <li>
            <strong>Sensitive personal information</strong>, namely the medicines in your saved trips: from you, only to
            show your trips back to you. We don&apos;t use it to infer anything about you.
          </li>
          <li><strong>Internet activity</strong>, like server logs: to keep the site working and secure.</li>
        </ul>
        <p>
          These are disclosed only to the service providers listed above. You have the rights to know, delete and correct
          your information, and to not be discriminated against for using them. An authorized agent can make a request
          for you with your signed permission. Because we don&apos;t sell or share personal information, or use sensitive
          information beyond what the law allows, there&apos;s nothing to opt out of. We still honor Global Privacy Control
          and Do Not Track signals. We don&apos;t track you across other sites.
        </p>
        <p>
          If we turn down a request, you can appeal by replying to our answer. If we still say no, you can contact your
          state attorney general. Residents of Washington, Nevada and Connecticut should also see our{' '}
          <Link href="/consumer-health-data" className={LINK}>consumer health data policy</Link>.
        </p>
      </LegalSection>

      <LegalSection id="children" title="Children">
        <p>
          {SITE_NAME} isn&apos;t meant for children. You must be at least 16 to create an account, and we don&apos;t
          knowingly collect data from anyone younger.
        </p>
      </LegalSection>

      <LegalSection id="security" title="Security">
        <p>
          Data is encrypted in transit and at rest, and each saved trip can only be read by the account that owns it. If a
          breach affects your data, we&apos;ll tell you and the authorities as the law requires.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes">
        <p>
          We&apos;ll update the date at the top when this policy changes. If a change affects how we use your saved
          medicines, we&apos;ll ask for your consent again before it applies.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
