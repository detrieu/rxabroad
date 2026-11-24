import type { CountryCode, CountryEntry, Drug, Status } from './types';

// What a traveler bringing their own supply needs to know, shown on the travel card and the medicine pages.

/** The general caution for a status, used where the country has no rule of its own. */
export const CAUTION_TEXT: Partial<Record<Status, string>> = {
  BANNED: 'Banned here. Do not bring it. Ask your doctor about an alternative before you travel.',
  CONTROLLED: 'Controlled here. Carry your prescription and a doctor’s letter, in original packaging. Some countries require advance permission.',
};

// Country-specific advice for travelers carrying controlled medicines, replacing the generic caution.
// `source` is set where the text restates a rule the country publishes. `byDrug` covers countries whose
// rule differs by medicine (Japan treats narcotics, psychotropics and stimulants differently).
// `permit`, `maxSupply` and `documents` pull the key facts out of `text` for the quick reference on the medicine pages.
export type Rule = {
  text: string;
  source?: string;
  /** Whether you need the country's permission before you travel. */
  permit?: boolean;
  maxSupply?: string;
  documents?: string;
};
const JP_PERMIT = 'https://www.ncd.mhlw.go.jp/en/application2.html';
const JP_NARCOTIC: Rule = {
  text: 'Controlled here as a narcotic under Japanese law. You need written permission from a Regional Bureau of Health and Welfare before you travel: apply at least 14 days ahead with a doctor’s certificate. Without it you cannot bring it in, even with a prescription. Bring no more than a one-month supply.',
  source: JP_PERMIT,
  permit: true,
  maxSupply: 'One month',
  documents: 'Written permission from a Regional Bureau of Health and Welfare, and a doctor’s certificate',
};
const jpPsychotropic = (limit: string): Rule => ({
  text: `Controlled here as a psychotropic under Japanese law. You may carry up to ${limit} in total without permission (not injections). For more, carry a doctor’s certificate stating your condition and the amount you need. Bring no more than a one-month supply.`,
  source: 'https://www.ncd.mhlw.go.jp/dl_data/keitai/total.pdf',
  permit: false,
  maxSupply: `One month, and up to ${limit} in total without a certificate`,
  documents: `A doctor’s certificate if you carry more than ${limit}`,
});
export const CONTROLLED_RULE: Partial<Record<CountryCode, Rule & { byDrug?: Record<string, Rule> }>> = {
  DE: {
    text: 'Controlled here. Officially, you need a doctor’s certificate giving the dose, the active substance and the length of your trip, endorsed by your home health authority, for trips of up to 30 days. At the least, carry it in its original labeled container with your prescription.',
    source: 'https://www.bfarm.de/EN/Federal-Opium-Agency/Narcotic-drugs/Travelling-with-narcotic-drugs/_node.html',
    permit: false,
    maxSupply: 'Up to 30 days',
    documents: 'A doctor’s certificate endorsed by your home health authority, and your prescription',
  },
  FR: {
    text: 'Controlled here. Officially, you must carry it yourself and be able to show the original prescription, with no more than the prescription covers (about four weeks if it gives no duration). At the least, carry it in its original labeled container with your prescription.',
    source: 'https://www.douane.gouv.fr/demarche/vous-voyagez-avec-des-medicaments',
    permit: false,
    maxSupply: 'What your prescription covers (about four weeks if it gives no duration)',
    documents: 'Your original prescription',
  },
  ES: {
    text: 'Controlled here. Officially, you need a permit from the Spanish medicines agency (AEMPS) before you travel, covering up to three months of treatment. At the least, carry it in its original labeled container with your prescription.',
    source: 'https://www.aemps.gob.es/industria-farmaceutica/comercio-exterior/medicamentos-destinados-al-tratamiento-de-los-viajeros/',
    permit: true,
    maxSupply: 'Up to three months',
    documents: 'A permit from the Spanish medicines agency (AEMPS), and your prescription',
  },
  IT: {
    text: 'Controlled here. Officially, you need a certificate based on a valid prescription, endorsed by your home health authority and valid for up to 30 days. With only one package, a valid prescription is enough. At the least, carry it in its original labeled container with your prescription.',
    source: 'https://www.salute.gov.it/new/en/tema/medicinali-stupefacenti-e-precursori-di-droghe/travelling-internationally-medicines-containing/',
    permit: false,
    maxSupply: 'Up to 30 days',
    documents: 'A certificate endorsed by your home health authority, or just a valid prescription for one package',
  },
  US: {
    text: 'Controlled here. Keep it in the original labeled pharmacy container and bring only what you need (generally no more than a 90-day supply). Arriving from abroad, declare it at customs and carry a prescription or doctor’s note in English.',
    source: 'https://www.cbp.gov/travel/us-citizens/know-before-you-go/prohibited-and-restricted-items',
    permit: false,
    maxSupply: 'Generally up to 90 days',
    documents: 'A prescription or doctor’s note in English. Declare it at customs.',
  },
  SG: {
    text: 'Controlled here. You need approval from Singapore’s Health Sciences Authority before you travel, and may bring at most a 3-month supply, in the original labeled container. No approval is needed if you stay inside the airport transit zone.',
    source: 'https://file.go.gov.sg/document-guide-for-bringing-in-personal-medications.pdf',
    permit: true,
    maxSupply: 'Up to three months',
    documents: 'Approval from the Health Sciences Authority, and your prescription',
  },
  VN: {
    text: 'Controlled here. Without an import licence, bring no more than 7 days’ dose of a narcotic or 10 days’ dose of a psychotropic, as on your prescription, and carry the prescription.',
    source: 'https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=123255',
    permit: false,
    maxSupply: '7 days of a narcotic or 10 days of a psychotropic, without an import licence',
    documents: 'Your prescription',
  },
  TR: {
    text: 'Controlled here, on a red or green prescription. Carry it in its original labeled packaging with your prescription or a doctor’s report giving the medicine and your dose, and bring only enough for your stay. Show them at customs if asked.',
    source: 'https://www.incb.org/documents/Travellers/files/TUR_ENG_2017.pdf',
    permit: false,
    maxSupply: 'Enough for your stay',
    documents: 'Your prescription or a doctor’s report giving the medicine and your dose',
  },
  CA: {
    text: 'Controlled here. Bring no more than a 90-day supply, in the labeled container your pharmacy dispensed it in, and declare it to customs on arrival. A doctor’s letter is optional.',
    source: 'https://www.canada.ca/en/health-canada/services/health-concerns/controlled-substances-precursor-chemicals/controlled-substances/compliance-monitoring/travelling-into-and-out-of-canada-with-prescription-medication-containing-controlled-substances.html',
    permit: false,
    maxSupply: 'Up to 90 days',
    documents: 'Your pharmacy-labeled container. Declare it at customs.',
  },
  JP: {
    text: 'Controlled here. Japan’s rule depends on the medicine. Narcotics and stimulant raw materials need written permission before you travel (apply at least 14 days ahead); psychotropics are allowed up to a set quantity. Check which applies to yours. Bring no more than a one-month supply.',
    source: JP_PERMIT,
    maxSupply: 'One month',
    byDrug: {
      oxycodone: JP_NARCOTIC,
      hydrocodone: JP_NARCOTIC,
      alprazolam: jpPsychotropic('72 mg'),
      methylphenidate: jpPsychotropic('2.16 g'),
      pseudoephedrine: {
        text: 'Controlled here. Products with more than 10% pseudoephedrine count as a stimulant raw material and need written permission before you travel (apply at least 14 days ahead with a doctor’s certificate). Products with 10% or less are outside that rule. Bring no more than a one-month supply.',
        source: JP_PERMIT,
        maxSupply: 'One month',
        documents: 'Written permission and a doctor’s certificate, for products over 10% pseudoephedrine',
      },
      amphetamine: {
        text: 'Banned here. Do not bring it. Japan does not let any traveler bring in amphetamine or methamphetamine medicines, even with a prescription. Ask your doctor about an alternative before you travel.',
        source: JP_PERMIT,
      },
    },
  },
};

/**
 * The rule for carrying this medicine into this country, and which caution it falls under.
 * A medicine that isn't sold here can still be controlled for travelers carrying their own.
 */
export function carryRuleFor(drug: Drug, code: CountryCode, entry: CountryEntry): { rule?: Rule; caution?: 'BANNED' | 'CONTROLLED' } {
  const countryRule = CONTROLLED_RULE[code];
  const rule = countryRule?.byDrug?.[drug.id] ?? (entry.status === 'CONTROLLED' ? countryRule : undefined);
  const caution = entry.status === 'BANNED' || entry.status === 'CONTROLLED' ? entry.status : rule ? 'CONTROLLED' : undefined;
  const own = rule && { text: rule.text, source: rule.source, permit: rule.permit, maxSupply: rule.maxSupply, documents: rule.documents };
  return { rule: own, caution };
}
