// Japan: the Ministry of Health, Labour and Welfare's drug price list (薬価基準収載品目リスト), every
// prescription product covered by national health insurance, published as three spreadsheets
// (oral, injectable, external). https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000078916.html
//
// A product on this list is a prescription medicine (医療用医薬品), so it confirms brand, ingredient and
// an RX status. It says nothing about over-the-counter products: an OTC brand is simply absent, and an
// ingredient on the list may also have an OTC twin (Gaster / Gaster 10) that this check cannot see.
// Narcotic, psychotropic and stimulant-raw-material scheduling isn't here either; those entries are
// checked by hand against the Narcotics Control Department's list.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';

const INDEX = 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000078916.html';
const DIR = path.join(ROOT, 'node_modules/.cache/rxabroad-verify/jp');
const TABLE = path.join(DIR, 'table.json');
const CHECK_EVERY_MS = 24 * 60 * 60 * 1000;
const UA = { 'User-Agent': 'rxabroad-verify (+https://rxabroad.vercel.app)' };

export const registry = { code: 'JP', name: 'MHLW drug price list (Japan, prescription medicines)' };
// The list holds prescription products only, so it can agree with an RX claim and nothing else.
export const cannotDetect = ['OTC', 'PHARMACY', 'MIXED', 'CONTROLLED'];

// The ingredient as the list writes it (成分名), matched at the start of the name so that
// オメプラゾール doesn't match エソメプラゾール.
const JP_NAMES = {
  paracetamol: ['アセトアミノフェン'], ibuprofen: ['イブプロフェン'], loratadine: ['ロラタジン'], cetirizine: ['セチリジン'],
  diphenhydramine: ['ジフェンヒドラミン'], loperamide: ['ロペラミド'], omeprazole: ['オメプラゾール'],
  pseudoephedrine: ['プソイドエフェドリン', '塩酸プソイドエフェドリン'], melatonin: ['メラトニン'], dimenhydrinate: ['ジメンヒドリナート'],
  amoxicillin: ['アモキシシリン'], metformin: ['メトホルミン'], sertraline: ['セルトラリン'], albuterol: ['サルブタモール'],
  atorvastatin: ['アトルバスタチン'], levothyroxine: ['レボチロキシン'], lisinopril: ['リシノプリル'], amlodipine: ['アムロジピン'],
  metoprolol: ['メトプロロール'], losartan: ['ロサルタン'], gabapentin: ['ガバペンチン'], rosuvastatin: ['ロスバスタチン'],
  pantoprazole: ['パントプラゾール'], escitalopram: ['エスシタロプラム'], amphetamine: ['アンフェタミン'],
  hydrochlorothiazide: ['ヒドロクロロチアジド'], bupropion: ['ブプロピオン'], fluoxetine: ['フルオキセチン'],
  semaglutide: ['セマグルチド'], montelukast: ['モンテルカスト'], trazodone: ['トラゾドン'], simvastatin: ['シンバスタチン'],
  tamsulosin: ['タムスロシン'], hydrocodone: ['ヒドロコドン'], fluticasone: ['フルチカゾン'], meloxicam: ['メロキシカム'],
  apixaban: ['アピキサバン'], furosemide: ['フロセミド'], 'insulin-glargine': ['インスリン グラルギン', 'インスリングラルギン'],
  duloxetine: ['デュロキセチン'], famotidine: ['ファモチジン'], empagliflozin: ['エンパグリフロジン'],
  carvedilol: ['カルベジロール'], tramadol: ['トラマドール'], alprazolam: ['アルプラゾラム'], prednisone: ['プレドニゾン'],
  clopidogrel: ['クロピドグレル'], aspirin: ['アスピリン'], oxycodone: ['オキシコドン'], methylphenidate: ['メチルフェニデート'],
  naproxen: ['ナプロキセン'], 'diclofenac-gel': ['ジクロフェナク'], fexofenadine: ['フェキソフェナジン'],
  guaifenesin: ['グアイフェネシン'], dextromethorphan: ['デキストロメトルファン'], oxymetazoline: ['オキシメタゾリン'],
  'bismuth-subsalicylate': ['次サリチル酸ビスマス'], 'calcium-carbonate': ['沈降炭酸カルシウム', '炭酸カルシウム'],
  simeticone: ['ジメチコン'], bisacodyl: ['ビサコジル'], 'polyethylene-glycol': ['マクロゴール'], meclozine: ['メクリジン'],
  'hydrocortisone-cream': ['ヒドロコルチゾン'], clotrimazole: ['クロトリマゾール'], 'antibiotic-ointment': ['バシトラシン'],
  doxylamine: ['ドキシラミン'], levonorgestrel: ['レボノルゲストレル'], 'atovaquone-proguanil': ['アトバコン'],
  doxycycline: ['ドキシサイクリン'], azithromycin: ['アジスロマイシン'], ciprofloxacin: ['シプロフロキサシン'],
  acetazolamide: ['アセタゾラミド'], scopolamine: ['スコポラミン'], ondansetron: ['オンダンセトロン'], epinephrine: ['アドレナリン'],
};

// Brand names as the app writes them → as the list writes them. An entry that already gives the
// Japanese name in brackets, "Naixan (ナイキサン)", doesn't need a line here.
const JP_BRANDS = {
  'Tylenol A': 'タイレノール', Calonal: 'カロナール', 'EVE A': 'イブA', 'Claritin EX': 'クラリチンEX', Drewell: 'ドリエル',
  Imodium: 'イモジウム', Metgluco: 'メトグルコ', Jzoloft: 'ジェイゾロフト', Sultanol: 'サルタノール', Lipitor: 'リピトール',
  'Thyradin S': 'チラーヂン', Norvasc: 'ノルバスク', Amlodin: 'アムロジン', Seloken: 'セロケン', Lopresor: 'ロプレソール',
  'Nu-Lotan': 'ニューロタン', Gabapen: 'ガバペン', Crestor: 'クレストール', Lexapro: 'レクサプロ', Ozempic: 'オゼンピック',
  Kipres: 'キプレス', Singulair: 'シングレア', Desyrel: 'デジレル', Reslin: 'レスリン', Lipovas: 'リポバス', Harnal: 'ハルナール',
  Flunase: 'フルナーゼ', Mobic: 'モービック', Eliquis: 'エリキュース', Lasix: 'ラシックス', Lantus: 'ランタス',
  Cymbalta: 'サインバルタ', Gaster: 'ガスター', Jardiance: 'ジャディアンス', Artist: 'アーチスト', Solanax: 'ソラナックス',
  Constan: 'コンスタン', Plavix: 'プラビックス', 'Bayer Aspirin': 'バイエルアスピリン', Concerta: 'コンサータ',
};

const JAPANESE = /[぀-ヿ一-鿿]/;
/** Full-width letters, digits and spaces to their plain forms: "チラーヂンＳ錠５０μｇ" → "チラーヂンS錠50μg". */
const jnorm = (s) => String(s ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();

/** The Japanese spelling of a brand: from the table, else from brackets after the name in the entry. */
function japaneseName(name, brandText) {
  if (JP_BRANDS[name]) return JP_BRANDS[name];
  const after = brandText.slice(brandText.indexOf(name) + name.length).match(/^\s*\(([^)]*)\)/)?.[1];
  return after && JAPANESE.test(after) ? jnorm(after) : null;
}

const unxml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

/** Rows of the first sheet of an .xlsx, each as { A: ..., B: ... }, read with the system unzip. */
function sheetRows(file) {
  const part = (name) => execFileSync('unzip', ['-p', file, name], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  // Phonetic guides (<rPh>) repeat the text in kana and are not part of the cell.
  const strings = [...part('xl/sharedStrings.xml').matchAll(/<si>(.*?)<\/si>/gs)].map(([, si]) =>
    unxml([...si.replace(/<rPh.*?<\/rPh>/gs, '').matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]).join('')));
  const rows = [];
  for (const [, row] of part('xl/worksheets/sheet1.xml').matchAll(/<row[^>]*>(.*?)<\/row>/gs)) {
    const cells = {};
    for (const [, col, attrs, body] of row.matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>(.*?)<\/c>)/gs)) {
      const v = body?.match(/<v>([^<]*)<\/v>/)?.[1];
      if (v !== undefined) cells[col] = attrs.includes('t="s"') ? strings[Number(v)] : v;
    }
    rows.push(cells);
  }
  return rows;
}

async function get(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** The current list: the index page links each year's page, which links the three spreadsheets. */
async function loadList(log) {
  fs.mkdirSync(DIR, { recursive: true });
  if (fs.existsSync(TABLE) && Date.now() - fs.statSync(TABLE).mtimeMs < CHECK_EVERY_MS) return JSON.parse(fs.readFileSync(TABLE, 'utf8'));

  const index = (await get(INDEX)).toString('utf8');
  const page = index.match(/https:\/\/www\.mhlw\.go\.jp\/topics\/\d{4}\/\d{2}\/tp\d+-01\.html/)?.[0];
  if (!page) throw new Error('MHLW index page no longer links the price list');
  const html = new TextDecoder('shift_jis').decode(await get(page));
  // _01 oral, _02 injectable, _03 external; the first link of each is the current one.
  const files = ['01', '02', '03'].map((n) => html.match(new RegExp(`/topics/[^"']*-01_${n}\\.xlsx`))?.[0]);
  if (files.some((f) => !f)) throw new Error('MHLW price list page no longer links the three spreadsheets');
  const version = files.join(' ');

  if (fs.existsSync(TABLE)) {
    const cached = JSON.parse(fs.readFileSync(TABLE, 'utf8'));
    if (cached.version === version) {
      fs.utimesSync(TABLE, new Date(), new Date());
      return cached;
    }
  }

  log(`downloading the MHLW price list (${files.map((f) => path.basename(f)).join(', ')})`);
  const products = [];
  for (const f of files) {
    const xlsx = path.join(DIR, path.basename(f));
    fs.writeFileSync(xlsx, await get(`https://www.mhlw.go.jp${f}`));
    // A 区分, B 薬価基準収載医薬品コード, C 成分名, D 規格, H 品名, I メーカー名
    for (const r of sheetRows(xlsx).slice(1)) {
      if (r.B && r.C && r.H) products.push({ code: r.B, ingredient: jnorm(r.C), name: jnorm(r.H), maker: jnorm(r.I) || null, route: r.A });
    }
    fs.rmSync(xlsx, { force: true });
  }
  if (products.length < 5000) throw new Error(`MHLW price list read as only ${products.length} products; its layout may have changed`);
  const table = { version, page, released: path.basename(files[0]).match(/tp(\d{8})/)?.[1] ?? null, products };
  fs.writeFileSync(TABLE, JSON.stringify(table));
  return table;
}

let list;

export async function open() {
  list = await loadList((m) => process.stderr.write(`\n${m}\n`));
  const d = list.released;
  return { version: d ? `list of ${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}` : undefined };
}

const contains = (p, stems) => p.ingredient.split('・').some((part) => stems.some((s) => part.trim().startsWith(s)));
const summarise = (p) => ({ code: p.code, product: p.name, ingredient: p.ingredient, maker: p.maker });
/** Brand part of a product name: "メトグルコ錠250mg" → "メトグルコ". */
const FORM = /\d|錠|カプセル|散|顆粒|細粒|原末|注|液|シロップ|軟膏|クリーム|ゲル|点鼻|点眼|吸入|坐剤|テープ|パップ|OD|DS|内用|外用|配合|小児用|ドライ|「|\(/;
const leading = (products, max = 6) => [...new Set(products.map((p) => p.name.split(FORM)[0] || p.name))].slice(0, max);

export async function verify({ drug, entry, parsed }) {
  const stems = JP_NAMES[drug.id] ?? [];
  const withIngredient = list.products.filter((p) => contains(p, stems));
  const flags = [];

  const brands = parsed.names.map((name) => {
    const ja = japaneseName(name, entry.brand);
    const named = ja ? list.products.filter((p) => p.name.startsWith(ja)) : [];
    const matched = named.filter((p) => contains(p, stems));
    if (matched.length) {
      return { name, id: matched[0].code, url: list.page, confirmed: true, note: null, matched: matched[0].name, products: matched.slice(0, 6).map(summarise) };
    }
    let note;
    if (!ja) note = 'no Japanese spelling to look up';
    else if (named.length) note = `on the prescription list as ${ja} with ${named[0].ingredient}, not this ingredient`;
    else if (['OTC', 'PHARMACY'].includes(entry.status)) note = `${ja} is not on the prescription list, as expected for an over-the-counter product; this list can't confirm it`;
    else note = `${ja} is not on the prescription list (which leaves out medicines national insurance doesn't cover)`;
    if (!named.length && withIngredient.length) note += ` (for this ingredient the list has ${leading(withIngredient).join(', ')})`;
    return { name, id: null, url: null, confirmed: false, note, products: [] };
  });

  const confirmed = brands.some((b) => b.confirmed);
  if (confirmed && ['OTC', 'PHARMACY'].includes(entry.status)) flags.push('Entry says it is sold without a prescription, but this brand is on the prescription list');

  return {
    ingredient: {
      registered: withIngredient.length > 0, id: withIngredient[0]?.code ?? null, url: list.page,
      searched: stems[0] ?? null, listedProducts: withIngredient.length,
    },
    brands,
    // Prescription products exist for what the entry names. Whether an OTC version also exists is not visible here.
    registryStatus: (parsed.kind === 'brand' ? confirmed : withIngredient.length > 0) ? 'RX' : null,
    statusEvidence: withIngredient.length ? { source: `MHLW price list ${list.released}`, products: { RX: withIngredient.length } } : null,
    flags,
  };
}
