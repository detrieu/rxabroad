import type { MetadataRoute } from 'next';
import { COUNTRIES, DRUGS, SYMPTOMS } from '@/data';
import { SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/my-meds`, changeFrequency: 'monthly', priority: 0.5 },
    ...DRUGS.map((d) => ({ url: `${SITE_URL}/drug/${d.id}`, changeFrequency: 'monthly' as const, priority: 0.8 })),
    ...COUNTRIES.map((c) => ({ url: `${SITE_URL}/country/${c.slug}`, changeFrequency: 'monthly' as const, priority: 0.8 })),
    ...SYMPTOMS.map((s) => ({ url: `${SITE_URL}/symptom/${s.id}`, changeFrequency: 'monthly' as const, priority: 0.7 })),
  ];
}
