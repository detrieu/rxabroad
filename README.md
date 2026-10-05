# Rx Abroad

**Know what to ask for, wherever you land.** — live at https://rxabroad.vercel.app

Every drug has one international name (its INN) and a different local brand name almost everywhere you go.
Rx Abroad covers 50 common medicines across 14 destinations. Search a brand, a generic name, or a
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
  unconfirmed. Use "Show sources" to see the citation links.
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
- Clerk CLI: `npx clerk doctor` checks the setup; `npx clerk config pull` shows sign-in settings.

### Project layout

| Path | What |
| --- | --- |
| `src/data/drugs.json` | The formulary: 50 drugs × 14 countries. **Edit this to change the data.** |
| `src/data/countries.ts`, `status.ts`, `types.ts` | Countries (with URL slugs), status labels, types |
| `src/lib/search.ts` | Search matching and country narrowing |
| `src/components/` | App components (`ui/` holds the shadcn components) |
| `src/app/` | Routes: `/`, `/drug/[id]`, `/country/[slug]`, `/my-meds`, `/sign-in`, `/sign-up`, sitemap, robots |
| `src/lib/auth.ts`, `src/lib/db.ts`, `db/migrations/` | Clerk user helper, Neon database client, schema |
| `scripts/extract-data.mjs` | One-time import from the original single-file prototype |
| `research/` | Scripts and reports from the original data research (Health Canada DPD, French BDPM, …) |

### Data entry format

Each drug in `drugs.json` looks like this:

```json
{
  "id": "paracetamol", "generic": "Paracetamol", "usAlt": "Acetaminophen (APAP) in the US",
  "cls": "Analgesic / antipyretic", "atc": "N02BE01",
  "countries": {
    "FR": { "brand": "Doliprane", "status": "OTC", "confidence": "high", "note": null, "source": null }
  }
}
```

- `status` is one of `OTC`, `RX`, `MIXED`, `PHARMACY`, `CONTROLLED`, `BANNED`, `UNCONFIRMED`, `ASK_GENERIC`.
- `confidence` is `high`, `medium` (shows †), or `low` (shows ?).

The data was imported from the original prototype (then called *Pill Trotter*), `pill-trotter-aug27.html`, which has the verified India
research. To check that the import still matches the prototype, run
`node scripts/extract-data.mjs --check ~/pill-trotter/pill-trotter-aug27.html`.

## Disclaimer

This is seed data for a prototype, compiled from general pharmacology knowledge. It is not a live
regulatory feed. Brand names, availability, and prescription status change, and they vary by region and
even by pharmacy. Confirm with a local pharmacist or physician before relying on this while traveling.

## Roadmap

- **Authorization and exemption forms.** For controlled medicines that a country allows with advance
  permission, link to or help prepare the official paperwork. One example is Japan's *Yunyu Kakunin-sho*
  import certificate, which is needed for narcotics and for amounts above the personal-supply limits.
  The day-supply limits, the forms, and where to submit them need to be verified per country first.
- More destinations and medicines.
