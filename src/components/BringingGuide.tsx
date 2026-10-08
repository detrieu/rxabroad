import type { ReactNode } from 'react';
import type { CountryCode } from '@/data';

/** Anchor the travel card links to: /country/<slug>#bringing */
export const BRINGING_ANCHOR = 'bringing';

type Section = { title: string; body: ReactNode; steps?: string[]; link: { label: string; href: string } };

// How to bring your own supply into a country, restating what its government publishes.
// Only countries whose rule is too involved for the one-line warning on the travel card have an entry.
const GUIDES: Partial<Record<CountryCode, { intro: string; sections: Section[] }>> = {
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
