import type { ReactNode } from 'react';
import type { CountryCode } from '@/data';

/** Anchor the travel card links to: /country/<slug>#bringing */
export const BRINGING_ANCHOR = 'bringing';

type Section = { title: string; body: ReactNode; steps?: string[]; link: { label: string; href: string } };

// How to bring your own supply into a country, restating what its government publishes.
// Only countries whose rule is too involved for the one-line warning on the travel card have an entry.
const AEMPS = 'https://www.aemps.gob.es/industria-farmaceutica/comercio-exterior/medicamentos-destinados-al-tratamiento-de-los-viajeros/';
const SALUTE = 'https://www.salute.gov.it/new/en/tema/medicinali-stupefacenti-e-precursori-di-droghe/travelling-internationally-medicines-containing/';

const BFARM = 'https://www.bfarm.de/EN/Federal-Opium-Agency/Narcotic-drugs/Travelling-with-narcotic-drugs/_node.html';
const DOUANE = 'https://www.douane.gouv.fr/demarche/vous-voyagez-avec-des-medicaments';

const GUIDES: Partial<Record<CountryCode, { intro: string; sections: Section[] }>> = {
  DE: {
    intro: 'Germany asks for paperwork only for narcotic medicines.',
    sections: [
      {
        title: 'Narcotics',
        body: (
          <>
            Oxycodone, methylphenidate, dexamfetamine and similar. Officially, you need a doctor’s certificate for
            each one. At the least, carry the medicine in its original labeled container with your prescription.
          </>
        ),
        steps: [
          'Arriving from outside the Schengen area, such as from the US: Germany’s regulator recommends a multilingual certificate from your doctor giving the single and daily dose, the international name of the active substance and the length of your trip.',
          'The certificate should be endorsed by the health authority where you live.',
          'Arriving from another Schengen country: carry the Schengen certificate (Article 75), endorsed by your health authority.',
          'Either way it covers trips of up to 30 days, with a separate certificate for each medicine.',
        ],
        link: { label: 'German medicines regulator: travelling with narcotics', href: BFARM },
      },
      {
        title: 'Other medicines',
        body: <>The regulator’s guidance covers narcotics only. For other medicines, carrying your prescription is sensible in case you are asked.</>,
        link: { label: 'German medicines regulator: travelling with narcotics', href: BFARM },
      },
    ],
  },
  FR: {
    intro: 'France asks for your original prescription, and limits how much you bring.',
    sections: [
      {
        title: 'Narcotics and psychotropics',
        body: (
          <>
            Oxycodone, methylphenidate, alprazolam and similar. Officially, you must carry the medicine yourself and be
            able to show the original prescription. At the least, carry it in its original labeled container with
            your prescription.
          </>
        ),
        steps: [
          'Bring only the amount your prescription covers. If it does not state a duration, the limit is about four weeks of treatment.',
          'A translation of the prescription into English or French helps.',
          'France does not require a permit of its own to enter.',
        ],
        link: { label: 'French customs: travelling with medicines', href: DOUANE },
      },
      {
        title: 'Other medicines',
        body: (
          <>
            You may bring up to a three-month supply without paperwork. For more, carry the original prescription,
            which can cover up to one year of treatment.
          </>
        ),
        link: { label: 'French customs: travelling with medicines', href: DOUANE },
      },
    ],
  },
  ES: {
    intro: 'Spain asks for a permit only for controlled medicines.',
    sections: [
      {
        title: 'Narcotics and psychotropics',
        body: (
          <>
            Oxycodone, methylphenidate, lisdexamfetamine (Elvanse), alprazolam and similar. Officially, you need a
            permit from the Spanish medicines agency (AEMPS) before you travel. At the least, carry the medicine in
            its original labeled container with your prescription.
          </>
        ),
        steps: [
          'Email the agency’s narcotics and psychotropics unit, following the instructions on its page. Spanish consulates advise applying at least 10 days ahead.',
          'Send the application form, a signed medical certificate giving your diagnosis, treatment and daily dose, your prescription, a copy of your passport and your travel tickets.',
          'The permit covers up to three months of treatment and is valid for three months.',
          'Carry the permit with the medicine and show it if asked.',
        ],
        link: { label: 'Spanish medicines agency: travelers’ medicines', href: AEMPS },
      },
      {
        title: 'Other medicines',
        body: (
          <>
            You may bring up to a three-month supply, in line with your prescription. Carry the prescription or a
            doctor’s report, as border officials may ask for it.
          </>
        ),
        link: { label: 'Spanish medicines agency: travelers’ medicines', href: AEMPS },
      },
    ],
  },
  IT: {
    intro: 'Italy asks for paperwork only for controlled medicines.',
    sections: [
      {
        title: 'Narcotics and psychotropics',
        body: (
          <>
            Oxycodone, tramadol, methylphenidate, alprazolam and similar. Italy does not issue a permit in advance.
            Officially, you need a certificate showing the medicine was lawfully prescribed. At the least, carry the
            medicine in its original labeled container with your prescription.
          </>
        ),
        steps: [
          'The certificate is based on a valid prescription and names you, the prescriber, the medicine, its strength, the quantity and the length of treatment.',
          'Italy asks for it to be endorsed by the health authority of your home country, and treats it as valid for up to 30 days.',
          'If you carry only one package, a valid prescription is enough.',
          'Keep the documents with you for your whole stay.',
        ],
        link: { label: 'Italian Ministry of Health: travelling with controlled medicines', href: SALUTE },
      },
      {
        title: 'Other medicines',
        body: <>Italy has no specific rule for other medicines. Carrying your prescription is sensible in case you are asked.</>,
        link: { label: 'Italian Ministry of Health: travelling with controlled medicines', href: SALUTE },
      },
    ],
  },
  JP: {
    intro: 'Japan’s rule depends on the medicine, so find yours below.',
    sections: [
      {
        title: 'Narcotics and stimulant raw materials',
        body: (
          <>
            Oxycodone, hydrocodone, morphine, fentanyl, lisdexamfetamine (Vyvanse), and products with more than 10%
            pseudoephedrine. You need written permission before you travel, for any quantity.
          </>
        ),
        steps: [
          'Apply to the Narcotics Control Department at least 14 days before you travel. Last-minute applications are not accepted.',
          'Send the import application form, a doctor’s certificate and photos of the medicine packaging.',
          'The certificate must give your name, address, the specific medical reason, each medicine with its dose and strength, and the prescriber’s signature, dated within the last 3 months.',
          'Carry the permit and show it at customs.',
        ],
        link: { label: 'Narcotics Control Department: how to apply', href: 'https://www.ncd.mhlw.go.jp/en/application2.html' },
      },
      {
        title: 'Psychotropics',
        body: (
          <>
            Alprazolam, methylphenidate, zolpidem, diazepam and similar. No permission is needed up to a set total
            quantity (for example alprazolam 72 mg, methylphenidate 2.16 g, zolpidem 300 mg, diazepam 1.2 g). For more
            than that, or for injections, carry a doctor’s certificate stating your condition and the amount you need.
          </>
        ),
        link: { label: 'Quantity limit for each psychotropic', href: 'https://www.ncd.mhlw.go.jp/dl_data/keitai/total.pdf' },
      },
      {
        title: 'Other medicines above the free allowance',
        body: (
          <>
            Without paperwork you may bring a 1-month supply of prescription medicines or self-injection kits, a
            2-month supply of non-prescription medicines, and 24 units of each cream, drop or other external
            medicine. For more, you need an import confirmation (Yunyu Kakunin-sho, formerly Yakkan Shoumei) before
            you leave home.
          </>
        ),
        steps: [
          'Create an account on the health ministry’s online application system.',
          'Apply under “import for personal use” and attach the supporting files.',
          'A Regional Bureau of Health and Welfare reviews it and issues the certificate, which you download from the system.',
          'Show the certificate at customs when you arrive.',
        ],
        link: { label: 'Import confirmation: online application', href: 'https://impconf.mhlw.go.jp/about_en.htm' },
      },
      {
        title: 'Not allowed at all',
        body: (
          <>
            Amphetamine and methamphetamine medicines, including Adderall, cannot be brought in by any traveler, even
            with a prescription. Do not bring them.
          </>
        ),
        link: {
          label: 'Health ministry: bringing medicines into Japan',
          href: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iyakuhin/kojinyunyu/topics/tp010401-1_00001.html',
        },
      },
    ],
  },
};

export const hasBringingGuide = (code: CountryCode) => !!GUIDES[code];

export function BringingGuide({ code, name }: { code: CountryCode; name: string }) {
  const guide = GUIDES[code];
  if (!guide) return null;
  return (
    <section id={BRINGING_ANCHOR} aria-labelledby="bringing-heading" className="bg-card mt-6 scroll-mt-4 rounded-2xl border p-5 shadow-sm">
      <p className="text-muted-foreground mb-1 font-mono text-[0.65rem] tracking-[0.2em] uppercase">Customs</p>
      <h2 id="bringing-heading" className="font-heading text-xl font-bold">Bringing your own medicine into {name}</h2>
      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{guide.intro}</p>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        {guide.sections.map((s) => (
          <div key={s.title} className="min-w-0">
            <h3 className="font-heading text-[1.02rem] font-semibold">{s.title}</h3>
            <p className="mt-1 text-[0.86rem] leading-relaxed">{s.body}</p>
            {s.steps && (
              <ol className="text-muted-foreground mt-2 list-decimal space-y-1 pl-5 text-[0.84rem] leading-relaxed">
                {s.steps.map((step) => <li key={step}>{step}</li>)}
              </ol>
            )}
            <a
              href={s.link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block py-1 text-[0.82rem] font-medium underline underline-offset-2"
            >
              {s.link.label}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
