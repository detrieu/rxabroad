/** Canonical site origin, used for metadata, sitemap and robots. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')
).replace(/\/$/, '');

export const SITE_NAME = 'Rx Abroad';
export const SITE_TAGLINE = 'Know what to ask for, wherever you land.';
