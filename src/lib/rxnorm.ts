import 'server-only';
import { DRUGS } from '@/data';

/**
 * Resolves a US medicine name through RxNorm (U.S. National Library of Medicine) to its ingredients,
 * and those to Rx Abroad drugs via the `rxcui` that scripts/verify writes into drugs.json.
 *
 * RxNorm is free and needs no key. NLM asks for results to be cached 12–24 hours, hence the revalidate.
 * https://lhncbc.nlm.nih.gov/RxNav/APIs/RxNormAPIs.html
 */

const RX = 'https://rxnav.nlm.nih.gov/REST';
const DAY = 60 * 60 * 24;

// Below this, approximate matches are noise ("japan" → a dye); typos of real brands score 8.5 and up.
const MIN_APPROXIMATE_SCORE = 8;

export interface UsNameIngredient {
  /** The name the US uses, e.g. "acetaminophen". */
  name: string;
  /** The matching Rx Abroad drug, when the formulary has it. */
  drugId: string | null;
  generic: string | null;
}

export interface UsNameMatch {
  /** What RxNorm matched: the brand where there is one, otherwise the concept name. */
  name: string;
  /** False when RxNorm had no entry by that exact name and this is its closest match. */
  exact: boolean;
  ingredients: UsNameIngredient[];
}

const DRUG_BY_RXCUI = new Map(DRUGS.flatMap((d) => (d.rxcui ? [[d.rxcui, d] as const] : [])));

async function rx<T>(path: string): Promise<T> {
  const res = await fetch(`${RX}${path}`, { next: { revalidate: DAY } });
  if (!res.ok) throw new Error(`RxNorm responded ${res.status}`);
  return res.json() as Promise<T>;
}

interface Concept { rxcui: string; name: string; tty: string }

async function findConcept(term: string): Promise<{ rxcui: string; exact: boolean } | null> {
  const q = encodeURIComponent(term);
  const byName = await rx<{ idGroup?: { rxnormId?: string[] } }>(`/rxcui.json?name=${q}&search=2`);
  const id = byName.idGroup?.rxnormId?.[0];
  if (id) return { rxcui: id, exact: true };

  const approx = await rx<{ approximateGroup?: { candidate?: { rxcui: string; score: string }[] } }>(
    `/approximateTerm.json?term=${q}&maxEntries=1&option=1`,
  );
  const best = approx.approximateGroup?.candidate?.[0];
  return best && Number(best.score) >= MIN_APPROXIMATE_SCORE ? { rxcui: best.rxcui, exact: false } : null;
}

export async function resolveUsName(term: string): Promise<UsNameMatch | null> {
  const found = await findConcept(term);
  if (!found) return null;

  const [props, related] = await Promise.all([
    rx<{ properties?: Concept }>(`/rxcui/${found.rxcui}/properties.json`),
    rx<{ relatedGroup?: { conceptGroup?: { conceptProperties?: Concept[] }[] } }>(`/rxcui/${found.rxcui}/related.json?tty=IN`),
  ]);
  const concept = props.properties;
  if (!concept) return null;

  let ingredients = (related.relatedGroup?.conceptGroup ?? []).flatMap((g) => g.conceptProperties ?? []);
  if (ingredients.length === 0 && concept.tty === 'IN') ingredients = [concept];
  if (ingredients.length === 0) return null;

  return {
    // Product names end with the brand in brackets: "acetaminophen 500 MG Oral Tablet [Tylenol]".
    name: concept.name.match(/\[([^\]]+)\]$/)?.[1] ?? concept.name,
    exact: found.exact,
    ingredients: ingredients.map((i) => {
      const drug = DRUG_BY_RXCUI.get(i.rxcui);
      return { name: i.name, drugId: drug?.id ?? null, generic: drug?.generic ?? null };
    }),
  };
}
