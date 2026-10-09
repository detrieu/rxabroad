// Italy: the medicines database of the regulator AIFA. A free JSON service, no key.
// https://medicinali.aifa.gov.it · REST: https://api.aifa.gov.it/aifa-bdf-eif-be/1.0.0/formadosaggio/ricerca
//
// It only searches free text (a product or ingredient name), 20 results a page, so each medicine is searched
// by its Italian ingredient name and the results are kept where the ATC code or the ingredient matches.
// Every pack carries a supply class: OTC, SOP (no prescription, behind the counter), RR / RNR and the
// hospital classes (prescription), RMR (narcotic prescription).

import { aggregateStatus, brandMatches, leadingNames, norm, statusPool } from './lib.mjs';

const REST = 'https://api.aifa.gov.it/aifa-bdf-eif-be/1.0.0/formadosaggio/ricerca';
const SITE = 'https://medicinali.aifa.gov.it/';
const PAGE_SIZE = 20; // the most the service allows

export const registry = { code: 'IT', name: 'AIFA medicines database (Italy)' };
export const cannotDetect = [];

// The ingredient as AIFA writes it.
export const IT_NAMES = {
  paracetamol: 'Paracetamolo', ibuprofen: 'Ibuprofene', loratadine: 'Loratadina', cetirizine: 'Cetirizina', diphenhydramine: 'Difenidramina',
  loperamide: 'Loperamide', omeprazole: 'Omeprazolo', pseudoephedrine: 'Pseudoefedrina', melatonin: 'Melatonina', dimenhydrinate: 'Dimenidrinato',
  amoxicillin: 'Amoxicillina', metformin: 'Metformina', sertraline: 'Sertralina', albuterol: 'Salbutamolo', atorvastatin: 'Atorvastatina',
  levothyroxine: 'Levotiroxina', lisinopril: 'Lisinopril', amlodipine: 'Amlodipina', metoprolol: 'Metoprololo', losartan: 'Losartan',
  gabapentin: 'Gabapentin', rosuvastatin: 'Rosuvastatina', pantoprazole: 'Pantoprazolo', escitalopram: 'Escitalopram', amphetamine: 'Amfetamina',
  hydrochlorothiazide: 'Idroclorotiazide', bupropion: 'Bupropione', fluoxetine: 'Fluoxetina', semaglutide: 'Semaglutide', montelukast: 'Montelukast',
  trazodone: 'Trazodone', simvastatin: 'Simvastatina', tamsulosin: 'Tamsulosina', hydrocodone: 'Idrocodone', fluticasone: 'Fluticasone',
  meloxicam: 'Meloxicam', apixaban: 'Apixaban', furosemide: 'Furosemide', 'insulin-glargine': 'Insulina glargine', 'insulin-lispro': 'Insulina lispro',
  'insulin-aspart': 'Insulina aspart', 'insulin-regular': 'Insulina umana', 'insulin-nph': 'Insulina umana isofano', 'insulin-detemir': 'Insulina detemir',
  'insulin-degludec': 'Insulina degludec', duloxetine: 'Duloxetina', famotidine: 'Famotidina', empagliflozin: 'Empagliflozin', carvedilol: 'Carvedilolo',
  tramadol: 'Tramadolo', alprazolam: 'Alprazolam', prednisone: 'Prednisone', clopidogrel: 'Clopidogrel', aspirin: 'Acido acetilsalicilico',
  oxycodone: 'Ossicodone', methylphenidate: 'Metilfenidato', naproxen: 'Naprossene', 'diclofenac-gel': 'Diclofenac', fexofenadine: 'Fexofenadina',
  guaifenesin: 'Guaifenesina', dextromethorphan: 'Destrometorfano', oxymetazoline: 'Oximetazolina', 'bismuth-subsalicylate': 'Bismuto subsalicilato',
  'calcium-carbonate': 'Calcio carbonato', simeticone: 'Simeticone', 'oral-rehydration-salts': 'Sali per reidratazione orale', bisacodyl: 'Bisacodile',
  'polyethylene-glycol': 'Macrogol', meclozine: 'Meclozina', 'hydrocortisone-cream': 'Idrocortisone', clotrimazole: 'Clotrimazolo',
  'antibiotic-ointment': 'Bacitracina', doxylamine: 'Doxilamina', levonorgestrel: 'Levonorgestrel', 'atovaquone-proguanil': 'Atovaquone',
  doxycycline: 'Doxiciclina', azithromycin: 'Azitromicina', ciprofloxacin: 'Ciprofloxacina', acetazolamide: 'Acetazolamide', scopolamine: 'Scopolamina',
  ondansetron: 'Ondansetron', epinephrine: 'Adrenalina',
};

let client;

export async function open({ createClient }) {
  client = createClient({ perSecond: 4 });
  return {};
}

/** Every dosage form matching a free-text query, reduced to what the check needs. */
async function search(query) {
  const rows = [];
  for (let page = 0; page < 60; page++) {
    const r = await client.json(`${REST}?query=${encodeURIComponent(query)}&spellingCorrection=false&page=${page}&size=${PAGE_SIZE}`);
    const data = r?.data;
    for (const f of data?.content ?? []) {
      const packs = (f.confezioni ?? []).filter((c) => c.flagCommercio === 1);
      rows.push({
        id: packs[0]?.aic ?? f.id, name: f.medicinale?.denominazioneMedicinale ?? '', holder: f.medicinale?.aziendaTitolare ?? null,
        form: f.descrizioneFormaDosaggio ?? null, atc: f.codiceAtc ?? [], ingredients: f.principiAttiviIt ?? [],
        classes: packs.flatMap((c) => c.classiFornitura ?? []), marketed: packs.length > 0,
      });
    }
    if (!data || data.last !== false) break;
  }
  return rows;
}

const legal = (cls) => (cls === 'OTC' ? 'OTC' : cls === 'SOP' ? 'PHARMACY' : cls === 'RMR' ? 'CONTROLLED' : 'RX');
const isSingle = (p) => p.ingredients.length === 1;
const summarise = (p) => ({ aic: p.id, product: p.name, form: p.form, ingredients: p.ingredients.join(' + '), classes: [...new Set(p.classes)].join(', ') });

export async function verify({ drug, parsed }) {
  const it = IT_NAMES[drug.id];
  const key = it ? norm(it) : null;
  const has = (p) => (drug.atc && p.atc.some((a) => a.startsWith(drug.atc))) || (key && p.ingredients.some((i) => norm(i) === key || norm(i).startsWith(`${key} `)));
  const found = it ? (await search(it)).filter((p) => p.marketed && has(p)) : [];

  const brands = [];
  for (const name of parsed.names) {
    let rows = found.filter((p) => brandMatches(p.name, name));
    let note = null;
    if (!rows.length) {
      // The ingredient search can miss a brand (a long result list, another spelling), so look the brand up too.
      const named = (await search(name)).filter((p) => brandMatches(p.name, name));
      rows = named.filter((p) => p.marketed && has(p));
      if (!rows.length) {
        const listed = leadingNames(found.filter(isSingle).map((p) => p.name));
        const other = named.find((p) => p.marketed);
        note = other ? `marketed under this name with ${other.ingredients.join(' + ') || 'another ingredient'}, not this ingredient`
          : named.length ? 'in the AIFA database, but none of its packs is marketed'
          : `not in the AIFA database${listed.length ? ` (for this ingredient it lists ${listed.join(', ')})` : ''}`;
      }
    }
    brands.push(rows.length
      ? { name, id: rows[0].id, url: SITE, confirmed: true, note: null, matched: rows[0].name, rows }
      : { name, id: null, url: null, confirmed: false, note, rows: [] });
  }

  const scoped = parsed.kind === 'brand' ? brands.flatMap((b) => b.rows) : found;
  const classes = statusPool(drug, scoped, isSingle).flatMap((p) => p.classes);
  const tally = {};
  for (const c of classes) tally[c] = (tally[c] ?? 0) + 1;

  return {
    ingredient: { registered: found.length > 0, id: found[0]?.id ?? null, url: SITE, searched: it ?? null, marketedForms: found.length },
    brands: brands.map(({ rows, ...b }) => ({ ...b, products: rows.slice(0, 6).map(summarise) })),
    registryStatus: aggregateStatus(classes.map(legal)),
    statusEvidence: classes.length ? { source: 'AIFA supply class (classe di fornitura), per marketed pack', products: tally } : null,
    flags: [],
  };
}
