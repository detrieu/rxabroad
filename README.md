# Rx Abroad

**Know what to ask for, wherever you land.** — live at https://rxabroad.vercel.app

Every drug has one international name (its INN) and a different local brand name almost everywhere you go.
Rx Abroad covers 76 common medicines across 14 destinations. Search a brand, a generic name, or a
country to see what to ask for at the pharmacy counter and whether it's OTC, prescription-only,
pharmacist-only, controlled, or banned.

Destinations: US, UK, Canada, Germany, France, Mexico, India, Ethiopia, Japan, Vietnam, Singapore,
Morocco, Portugal, Türkiye.

## Features

- **Search and filter.** Search by brand ("Claritin"), generic ("paracetamol"), or country ("Ethiopia"),
  and narrow results with the country chips. Matches are highlighted.
- **Shareable links.** The search and selected countries are kept in the URL (`/?q=claritin&c=JP,FR`).
- **Drug and country pages.** Each drug and each country has its own statically generated page
  (`/drug/paracetamol`, `/country/japan`), with its own title and description for search engines.
  There is also a sitemap.
- **My meds travel card** (`/my-meds`). Pick your medicines and a destination to get a printable one-page
  card with the local name to ask for and any cautions. Your list is saved only in your browser.
- **Confidence markers and sources.** † means general knowledge that isn't brand-verified, and ? means
  unconfirmed. A check mark means the entry was confirmed against that country's official medicines
  registry. Use "Show sources" to see the citation links.
- **US name lookup.** A search that matches nothing in the formulary is looked up in RxNorm, so
  "Zestoretic" answers "lisinopril + hydrochlorothiazide" and links to the medicines we cover.
- **Light, dark, or automatic theme**, and a print / save-as-PDF option.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # all 67 pages are statically generated
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

### Registry verification and US name lookup

**Offline verification.** `node scripts/verify/run.mjs <US|CA|SG|FR>` checks one country's entries against
its official registry and writes the evidence and every mismatch to `research/verification/<CC>.json`.
That is a dry run; add `--write` to update `drugs.json`. Nothing here runs when the site is built or served.

| Country | Registry | What it confirms |
| --- | --- | --- |
| US | [RxNorm](https://lhncbc.nlm.nih.gov/RxNav/APIs/RxNormAPIs.html) + [openFDA NDC](https://open.fda.gov/apis/drug/ndc/) | brand ↔ ingredient, ATC code, OTC / Rx / DEA schedule |
| CA | [Health Canada DPD](https://health-products.canada.ca/api/documentation/dpd-documentation-en.html) | brand ↔ ingredient, marketed status, schedule |
| SG | [HSA register on data.gov.sg](https://data.gov.sg/datasets/d_767279312753558cbf19d48344577084/view) | brand ↔ ingredient, GSL / Pharmacy Only / Prescription Only |
| FR | [BDPM](https://base-donnees-publique.medicaments.gouv.fr/telechargement) | brand ↔ ingredient, marketed status, prescription conditions |

All four are free and need no key. `--write` is deliberately conservative: it never edits `brand`, `status`
or `note`; it attaches `verified` when the registry confirms the entry; and it raises `medium` to `high`
only when brand, ingredient and legal status all agree. It never lowers confidence. A registry shows that a
product is *registered*, not that a given pharmacy stocks it. After a run, refresh the report with
`node scripts/confidence-report.mjs`. To add a country, write an adapter next to the others (`open()` and
`verify()`) and register it in `run.mjs`.

**Live lookup.** `GET /api/rxnorm/resolve?q=<name>` (`src/app/api/rxnorm/resolve/route.ts`, logic in
`src/lib/rxnorm.ts`) resolves a US medicine name to its ingredients and maps them to formulary drugs through
each drug's `rxcui`. RxNorm allows browser calls and needs no key, so this route isn't hiding a secret: it
turns three chained requests into one and lets the CDN cache each answer for a day, which is what NLM asks
of API users (limit: 20 requests per second per IP). The search box only calls it when a query has no
local match. The route is excluded from the Clerk matcher in `src/proxy.ts`, so lookups carry no session.

### Project layout

| Path | What |
| --- | --- |
| `src/data/drugs.json` | The formulary: 76 drugs × 14 countries. A drug's optional `kit` field puts it in a travel-essentials group (`src/data/kit.ts`); drugs without one are listed under "Other". **Edit this to change the data.** |
| `src/data/countries.ts`, `status.ts`, `types.ts` | Countries (with URL slugs), status labels, types |
| `src/lib/search.ts` | Search matching and country narrowing |
| `src/components/` | App components (`ui/` holds the shadcn components) |
| `src/app/` | Routes: `/`, `/drug/[id]`, `/country/[slug]`, `/my-meds`, `/sign-in`, `/sign-up`, sitemap, robots |
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
