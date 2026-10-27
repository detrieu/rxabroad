# Rx Abroad

**Know what to ask for, wherever you land.** — live at https://rxabroad.vercel.app

Every drug has one international name (its INN) and a different local brand name almost everywhere you go.
Rx Abroad covers 82 common medicines across 15 destinations (India is hidden for now). Search a brand, a generic name, or a
country to see what to ask for at the pharmacy counter and whether it's OTC, prescription-only,
pharmacist-only, controlled, or banned.

Destinations: US, UK, Canada, Germany, France, Mexico, India, Ethiopia, Japan, Vietnam, Singapore,
Morocco, Portugal, Türkiye, Italy, Spain.

## Features

- **Search and filter.** Search by brand ("Claritin"), generic ("paracetamol"), or country ("Ethiopia"),
  and narrow results with the country chips. Matches are highlighted.
- **Browse by symptom.** In the travel essentials view, pick what you need it for (fever, traveler's diarrhea,
  motion sickness, 21 in all) to see only the medicines sold for it. Typing a symptom in the search box works too.
- **Shareable links.** The search, selected countries and symptom are kept in the URL (`/?q=claritin&c=JP,FR`,
  `/?s=cough&c=VN`).
- **Drug, country and symptom pages.** Each drug, country and symptom has its own statically generated page
  (`/drug/paracetamol`, `/country/japan`, `/symptom/travelers-diarrhea`), with its own title and description
  for search engines. There is also a sitemap.
- **My meds travel card** (`/my-meds`). Pick your medicines and a destination to get a printable one-page
  card with the local name to ask for and any cautions. Your list is saved only in your browser.
- **Confidence markers and sources.** † means general knowledge that isn't registry-checked, and ? means
  unconfirmed. A check mark means the entry was confirmed against that country's official medicines
  registry. Use "Show sources" to see the citation links.
- **US name lookup.** A search that matches nothing in the formulary is looked up in RxNorm, so
  "Zestoretic" answers "lisinopril + hydrochlorothiazide" and links to the medicines we cover.
- **Light, dark, or automatic theme**, and a print / save-as-PDF option.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # every drug, country and symptom page is statically generated
npm run lint
```

Built with Next.js 16 (App Router), React 19, Tailwind CSS v4 and [shadcn/ui](https://ui.shadcn.com)
(Radix base, Nova preset). The "passport" theme lives in `src/app/globals.css`: color tokens for light
(passport paper) and dark (night flight), rubber-stamp status styles, and print rules. Add more shadcn
components with `npx shadcn@latest add <name>`. There's no backend.

### Accounts and saved trips (Clerk + Neon)

Sign-in uses **Clerk** (`@clerk/nextjs`, themed with `@clerk/ui`'s shadcn theme). Signed-in travelers can
save trips (medicines + ordered destinations) to a **Neon Postgres** database and open them on any device;
while a trip is open, changes autosave. Without an account the travel card still works, stored in the
browser only.

- Clerk keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) and the Neon `DATABASE_URL` come from
  `.env.local` locally and from Vercel environment variables when deployed. Never expose `CLERK_SECRET_KEY`
  to client code.
- `src/proxy.ts` runs `clerkMiddleware()`; routes are public, and the trip server actions check the user.
- Schema lives in `db/migrations/*.sql`; apply with `npm run db:migrate` (runs each file once).
  `trips.user_id` is the Clerk user id (`user_...`). User profiles stay in Clerk (not copied to Neon).
- Trip reads/writes are server actions in `src/app/my-meds/actions.ts`; every query is scoped to the
  signed-in user's id, and input is validated against the real country codes and drug ids.
- **Account deletion:** `src/app/api/webhooks/clerk/route.ts` receives Clerk's `user.deleted` webhook and
  deletes that user's trips (trips have no foreign key to Clerk). Requests are signature-verified with
  `CLERK_WEBHOOK_SIGNING_SECRET`; register the endpoint `https://<site>/api/webhooks/clerk` (event
  `user.deleted`) in the Clerk Dashboard → Webhooks, and set the secret in Vercel.
- Clerk CLI: `npx clerk doctor` checks the setup; `npx clerk config pull` shows sign-in settings.

### Search misses and reported problems

- Searches that match nothing are counted in `public.search_misses` (search text and a count only), so the next medicines added are the ones people look for.
- "Report a problem" under each entry saves the medicine, country and message to `public.feedback`.
- Both are anonymous: no user id, IP or session is stored. Read them with `npm run feedback` (last 30 days; `-- --days 90` for more).

### Registry verification and US name lookup

**Offline verification.** `node scripts/verify/run.mjs <US|CA|SG|FR|GB|JP|DE|MX|IT|ES|TR|VN|ET|PT>` checks one country's entries against
its official registry and writes the evidence and every mismatch to `research/verification/<CC>.json`.
That is a dry run; add `--write` to update `drugs.json`. Nothing here runs when the site is built or served.

| Country | Registry | What it confirms |
| --- | --- | --- |
| US | [RxNorm](https://lhncbc.nlm.nih.gov/RxNav/APIs/RxNormAPIs.html) + [openFDA NDC](https://open.fda.gov/apis/drug/ndc/) | brand ↔ ingredient, ATC code, OTC / Rx / DEA schedule |
| CA | [Health Canada DPD](https://health-products.canada.ca/api/documentation/dpd-documentation-en.html) | brand ↔ ingredient, marketed status, schedule |
| SG | [HSA register on data.gov.sg](https://data.gov.sg/datasets/d_767279312753558cbf19d48344577084/view) | brand ↔ ingredient, GSL / Pharmacy Only / Prescription Only |
| FR | [BDPM](https://base-donnees-publique.medicaments.gouv.fr/telechargement) | brand ↔ ingredient, marketed status, prescription conditions |
| GB | [MHRA Products](https://products.mhra.gov.uk/) + [NHS dm+d](https://isd.digital.nhs.uk/trud/users/guest/filters/0/categories/6/items/24/releases) | MHRA: brand ↔ ingredient for licensed products. dm+d: legal category (GSL / P / POM) and controlled-drug schedule of packs on the market. dm+d needs a free NHS TRUD account: put the key in `.env.local` as `TRUD_API_KEY`. Without it the UK check is brand-only |
| JP | [MHLW drug price list](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000078916.html) | Brand ↔ ingredient for prescription products covered by national insurance, which confirms an Rx status. It has no over-the-counter products, so OTC entries can't be confirmed, and it can't see an OTC twin of an Rx brand. Controlled-drug scheduling is checked by hand against the [Narcotics Control Department list](https://www.ncd.mhlw.go.jp/en/application2.html) |
| DE | [AMIce](https://portal.bfarm.de/amguifree/) (BfArM) | Brand ↔ ingredient for marketable medicines, and their legal class of sale: pharmacy-only, prescription or narcotic prescription. It has no download, so the check runs about 230 searches on its web form, four at a time; a first run takes several minutes. Nearly every German non-prescription medicine is pharmacy-only, so an "OTC" entry is confirmed when no prescription is needed |
| MX | [COFEPRIS medicine register](https://registros.cofepris.gob.mx/BRSDM/) | Brand ↔ ingredient for current registrations, and the legal class of sale (Fracción I to VI: narcotic, psychotropic, prescription, pharmacy-only, free sale). Read from the "Base Completa" spreadsheet; the search form is behind a captcha and is not used. The file may be incomplete and uses local spellings (Elicuis, Jardianz), so a missing brand is reported but proves nothing |
| IT | [AIFA medicines database](https://medicinali.aifa.gov.it/) | Brand ↔ ingredient for marketed packs, and the supply class of each: OTC, SOP (no prescription, behind the counter), prescription, or narcotic prescription. Searched by Italian ingredient name, 20 results a page |
| ES | [CIMA](https://cima.aemps.es/cima/publico/home.html) (AEMPS) | Brand ↔ ingredient for marketed products, and the prescription condition: no prescription, prescription, narcotic or psychotropic. Searched by ATC code |
| TR | TİTCK [licensed products list](https://www.titck.gov.tr/dinamikmodul/85) + [e-prescription list](https://www.titck.gov.tr/dinamikmodul/43) | Brand ↔ ingredient for licences in force, read from two spreadsheets the agency reissues every week. The e-prescription list gives each pack's prescription type, so a red or green prescription confirms a controlled status. Neither list says whether an ordinary product needs a prescription, so OTC, pharmacist-only and prescription statuses are not compared |
| VN | [Drug Administration of Vietnam register](https://dichvucong.dav.gov.vn/congbothuoc/index) | Brand ↔ ingredient for registrations that have not expired. Registrations issued since 2023 are marked non-prescription or prescription, which confirms those two statuses; older ones carry no class. Nothing marks controlled medicines. Searched by ingredient name, in both English and Vietnamese spellings |
| ET | [EFDA register](https://eris.efda.gov.et/public/products) + [Over-the-Counter Medicines List](https://www.efda.gov.et/wp-content/uploads/2022/09/OTC-medicines-list.pdf) | Brand ↔ ingredient for approved medicines, from the register's one-file export. Legal status comes from the OTC list (third edition, July 2022): on it means no prescription, anything else needs one. The list is a PDF, so its entries for our medicines are keyed into `et-eris.mjs` by hand. Each run checks the PDF is unchanged and refuses `--write` if EFDA has replaced it |
| PT | [Infomed](https://extranet.infarmed.pt/INFOMED-fo/pesquisa-avancada.xhtml) (INFARMED) | Brand ↔ ingredient for marketed products, and the dispensing class: no prescription, no prescription but pharmacy only, prescription, or special prescription. It has no download, so the check runs about 330 searches on its web form; a first run takes about 12 minutes. Benzodiazepines are on an ordinary prescription there, so that class does not contradict a controlled entry |

Every check is free and needs no key, apart from the UK's legal-status step. `--write` is deliberately conservative: it never edits `brand`, `status`
or `note`; it attaches `verified` when the registry confirms the entry; and it raises confidence to `high`
only when the registry confirms everything the entry claims (brand, ingredient and legal status; for a "sold generic" entry with no brand, ingredient and legal status). An entry marked `low` that the registry confirms only in part goes to `medium`, so nothing verified keeps the "unconfirmed" mark. It never lowers confidence. A registry shows that a
product is *registered*, not that a given pharmacy stocks it. After a run, refresh the report with
`node scripts/confidence-report.mjs`. To add a country, write an adapter next to the others (`open()` and
`verify()`) and register it in `run.mjs`.

**Keeping it current.** Registries change (the NHS dictionary weekly, the others every few weeks), so re-run the
checks about once a month. A scheduled cloud routine ("Rx Abroad monthly registry check", the 1st of each month)
does a dry run and reports what changed at https://claude.ai/code/routines; it can't see the TRUD key, so it skips
UK legal status. To update the data yourself:

1. Open a terminal in the project folder (in VS Code: Terminal > New Terminal, or `cd ~/dev/pill-trotter`).
2. `npm run verify` is a dry run of all fourteen countries. It changes no data, only the report files in
   `research/verification/`, and takes about half an hour on the first run, most of it Germany, Portugal and Vietnam
   (results are cached for a day).
3. `npm run verify:write` does the same and also updates `src/data/drugs.json` and the confidence report.
4. Read the new mismatch lists in `research/verification/` and check `git diff src/data/drugs.json`. The script
   never edits `brand`, `status` or `note`: those mismatches are yours to decide.
5. Commit and push. Pushing to `main` deploys to Vercel.

The UK legal-status step needs a free NHS TRUD account: subscribe to the "NHSBSA dm+d" item and put the key in
`.env.local` as `TRUD_API_KEY=...` (the file is git-ignored). Without it a dry run still works but notes that
legal status was skipped, and `--write` refuses for the UK so it can't overwrite the full check with a partial
one. India and Morocco have no registry check: they never refresh and need a manual review. India's Drug Registry (`drugregistry.abdm.gov.in`) refused connections when this was written, and Morocco's regulator publishes no register that could be reached.

The cloud routine runs in the "Default" cloud environment, whose network access is set to Custom so it can reach the
registries: `rxnav.nlm.nih.gov`, `api.fda.gov`, `health-products.canada.ca`, `data.gov.sg`,
`base-donnees-publique.medicaments.gouv.fr`, `mhraproducts4853.search.windows.net`, `www.mhlw.go.jp`, `portal.bfarm.de`, `auth.bfarm.de`, `registros.cofepris.gob.mx`, `api.aifa.gov.it`, `cima.aemps.es`, `titck.gov.tr`, `www.titck.gov.tr`, `dichvucong.dav.gov.vn`, `api.eris.efda.gov.et`, `www.efda.gov.et` and `extranet.infarmed.pt`, plus the default package
list. If a run reports HTTP 403 from a registry, check that list first.

**Live lookup.** `GET /api/rxnorm/resolve?q=<name>` (`src/app/api/rxnorm/resolve/route.ts`, logic in
`src/lib/rxnorm.ts`) resolves a US medicine name to its ingredients and maps them to formulary drugs through
each drug's `rxcui`. RxNorm allows browser calls and needs no key, so this route isn't hiding a secret: it
turns three chained requests into one and lets the CDN cache each answer for a day, which is what NLM asks
of API users (limit: 20 requests per second per IP). The search box only calls it when a query has no
local match. The route is excluded from the Clerk matcher in `src/proxy.ts`, so lookups carry no session.

### Project layout

| Path | What |
| --- | --- |
| `src/data/drugs.json` | The formulary: 82 drugs × 16 countries (India's entries are kept but hidden from the site: `hidden` in `src/data/countries.ts`). A drug's optional `kit` field puts it in a travel-essentials group (`src/data/kit.ts`); drugs without one are listed under "Other". Its optional `symptoms` list says what it is sold for (`src/data/symptoms.ts`). **Edit this to change the data.** |
| `src/data/countries.ts`, `status.ts`, `types.ts` | Countries (with URL slugs), status labels, types |
| `src/lib/search.ts` | Search matching and country narrowing |
| `src/components/` | App components (`ui/` holds the shadcn components) |
| `src/app/` | Routes: `/`, `/drug/[id]`, `/country/[slug]`, `/symptom/[slug]`, `/my-meds`, `/sign-in`, `/sign-up`, sitemap, robots |
| `src/lib/auth.ts`, `src/lib/db.ts`, `db/migrations/` | Clerk user helper, Neon database client, schema |
| `src/lib/rxnorm.ts`, `src/app/api/rxnorm/resolve/` | US name lookup through RxNorm |
| `scripts/verify/` | Registry verifiers: `run.mjs`, shared `lib.mjs`, one adapter per country |
| `scripts/confidence-report.mjs` | Rebuilds `research/confidence-by-country.md` |
| `research/verification/` | Evidence and mismatches from the last verifier run, per country |
| `scripts/extract-data.mjs` | One-time import from the original single-file prototype |
| `research/` | Scripts and reports from the original data research (Health Canada DPD, French BDPM, …) |

### Data entry format

Each drug in `drugs.json` looks like this:

```json
{
  "id": "paracetamol", "generic": "Paracetamol", "usAlt": "Acetaminophen (APAP) in the US",
  "cls": "Analgesic / antipyretic", "atc": "N02BE01", "rxcui": "161",
  "countries": {
    "FR": { "brand": "Doliprane", "status": "OTC", "confidence": "high", "note": null, "source": null }
  }
}
```

- `status` is one of `OTC`, `RX`, `MIXED`, `PHARMACY`, `CONTROLLED`, `BANNED`, `UNCONFIRMED`, `ASK_GENERIC`, `UNAVAILABLE` (not marketed in that country).
- `confidence` is `high`, `medium` (shows †), or `low` (shows ?).
- `rxcui` (RxNorm ingredient id) and each entry's optional `verified` block are written by
  `scripts/verify/run.mjs`. Don't edit them by hand; re-run the verifier instead.

The data was imported from the original prototype (then called *Pill Trotter*), `pill-trotter-aug27.html`, which has the verified India
research. To check that the import still matches the prototype, run
`node scripts/extract-data.mjs --check ~/pill-trotter/pill-trotter-aug27.html`.

## Disclaimer

This is seed data for a prototype, compiled from general pharmacology knowledge. It is not a live
regulatory feed. Brand names, availability, and prescription status change, and they vary by region and
even by pharmacy. Confirm with a local pharmacist or physician before relying on this while traveling.

This product uses publicly available data from the U.S. National Library of Medicine (NLM), National
Institutes of Health, Department of Health and Human Services; NLM is not responsible for the product and
does not endorse or recommend this or any other product.

## Roadmap

- **Authorization and exemption forms.** For controlled medicines that a country allows with advance
  permission, link to or help prepare the official paperwork. One example is Japan's *Yunyu Kakunin-sho*
  import certificate, which is needed for narcotics and for amounts above the personal-supply limits.
  The day-supply limits, the forms, and where to submit them need to be verified per country first.
- More destinations and medicines.
