// Vietnam: the Drug Administration's public register of marketing authorisations (Cục Quản lý Dược).
// https://dichvucong.dav.gov.vn/congbothuoc/index · the JSON service behind that search page, no key.
//
// Searched by ingredient and by product name. A record has the product name, its ingredients, the registration
// number and whether the registration has expired. Records issued since 2023 also carry a class: 1 is on the
// non-prescription list (the site's "Danh mục thuốc không kê đơn" page), 0 is prescription. Older records have no
// class, so a medicine with only old registrations can't have its status checked. Nothing marks narcotics or
// psychotropics.

import { aggregateStatus, brandMatches, hasIngredient, leadingNames, norm, statusPool } from './lib.mjs';

const API = 'https://dichvucong.dav.gov.vn/api/services/app/soDangKy/GetAllPublicServerPaging';
const PAGE = 'https://dichvucong.dav.gov.vn/congbothuoc/index';
const PAGE_SIZE = 1000;

export const registry = { code: 'VN', name: 'Drug Administration of Vietnam register' };
export const cannotDetect = ['CONTROLLED'];

// The ingredient as the register writes it, where the English name doesn't lead to it. Oral rehydration salts
// are found by their sodium citrate, which little else contains.
const VN_NAMES = { 'calcium-carbonate': ['CALCI CARBONAT'], 'oral-rehydration-salts': ['NATRI CITRAT'], aspirin: ['ACETYLSALICYLIC'] };
// Scopolamine butylbromide is a different medicine (for cramps) from the motion-sickness patch.
const VN_NOT = { scopolamine: /BUTYL/ };

const LEGAL = { 1: 'NO_RX', 0: 'RX' };

let client;

function product(m) {
  const b = m.thongTinThuocCoBan ?? {};
  // Some records leave the ingredient field empty and name the ingredient with the strength instead.
  // "(dưới dạng …)" gives the salt, which is not a second ingredient.
  const text = (b.hoatChatChinh || b.hamLuong || '').replace(/\(.*?\)/g, ' ');
  return {
    id: m.soDangKy, name: (m.tenThuoc ?? '').trim(), text: text.replace(/\s+/g, ' ').trim(),
    // A comma inside a number ("2,5mg") is a decimal point, not a separator.
    single: text.split(/[;+]|,(?!\d)/).filter((s) => s.trim()).length <= 1,
    legal: LEGAL[b.loaiThuocId] ?? null, form: b.dangBaoChe ?? null, holder: m.congTyDangKy?.tenCongTyDangKy ?? null,
    current: !m.isHetHan && !m.thongTinRutSoDangKy?.urlCongVanRutSoDangKy,
  };
}

/** Every record matching the filter, across pages. The service matches any part of the field, in any case. */
async function search(filter) {
  const rows = [];
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const r = await client.post(API, { filterText: '', SoDangKyThuoc: filter, KichHoat: true, skipCount: skip, maxResultCount: PAGE_SIZE });
    const batch = r?.result?.items ?? [];
    rows.push(...batch.map(product));
    if (batch.length < PAGE_SIZE) return rows;
  }
}

/** Vietnamese spelling drops a final "e", and often writes "clor" for "chlor" and one "l" for two (amoxicilin). */
function spellings(keys) {
  const stems = keys.map((k) => k.replace(/E$/, ''));
  return [...new Set(stems.flatMap((s) => [s, s.replace(/CHLOR/g, 'CLOR'), s.replace(/LL/g, 'L')]))];
}

export async function open({ createClient }) {
  client = createClient({ perSecond: 2 });
  return {};
}

const isSingle = (p) => p.single;
const summarise = (p) => ({ registration: p.id, product: p.name.replace(/\s*\(.*$/s, ''), ingredients: p.text.slice(0, 120), form: p.form, legal: p.legal, holder: p.holder });

export async function verify({ drug, parsed, keys }) {
  const stems = spellings([...keys, ...(VN_NAMES[drug.id] ?? [])]);
  const contains = (p) => hasIngredient(p.text, stems) && !VN_NOT[drug.id]?.test(norm(p.text));
  const found = new Map();
  for (const stem of stems) for (const p of await search({ HoatChatChinh: stem })) if (p.current && contains(p)) found.set(`${p.id} ${p.name}`, p);
  const current = [...found.values()];

  const brands = [];
  for (const name of parsed.names) {
    const named = (await search({ TenThuoc: name })).filter((p) => brandMatches(p.name, name));
    // Records with a class first: they are the newer registrations.
    const rows = named.filter((p) => p.current && contains(p)).sort((a, b) => !!b.legal - !!a.legal);
    if (rows.length) {
      brands.push({ name, id: rows[0].id, url: PAGE, confirmed: true, note: null, matched: rows[0].name.replace(/\s*\(.*$/s, ''), rows });
      continue;
    }
    const expired = named.filter(contains);
    const listed = leadingNames(current.filter(isSingle).map((p) => p.name));
    const note = expired.length ? `registered, but all ${expired.length} of its registrations have expired`
      : named.length ? `registered under this name with ${named[0].text.slice(0, 60) || 'another ingredient'}, not this ingredient`
      : `no registration of this name${listed.length ? ` (for this ingredient the register lists ${listed.join(', ')})` : ''}`;
    brands.push({ name, id: null, url: null, confirmed: false, note, rows: [] });
  }

  const scoped = statusPool(drug, parsed.kind === 'brand' ? brands.flatMap((b) => b.rows) : current, isSingle);
  const pool = scoped.filter((p) => p.legal);
  const tally = {};
  for (const p of pool) tally[p.legal] = (tally[p.legal] ?? 0) + 1;

  return {
    ingredient: { registered: current.length > 0, id: current[0]?.id ?? null, url: PAGE, searched: stems.join(', '), currentRegistrations: current.length },
    brands: brands.map(({ rows, ...b }) => ({ ...b, products: rows.slice(0, 6).map(summarise) })),
    registryStatus: aggregateStatus(pool.map((p) => p.legal)),
    statusEvidence: pool.length ? { source: 'DAV medicine class (non-prescription list or prescription)', products: tally, withoutClass: scoped.length - pool.length } : null,
    flags: [],
  };
}
