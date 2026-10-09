'use client';

import { useId } from 'react';
import { PlaneIcon } from 'lucide-react';
import type { Country, CountryCode } from '@/data';
import { cn } from '@/lib/utils';

/**
 * Each destination's name for itself (endonym), in its main language and script. Where it's spelled the same
 * as the English name already on the ring (United States, United Kingdom, Canada, France, Portugal, Türkiye),
 * the stamp shows just the plane instead of repeating it.
 */
const ENDONYM: Record<CountryCode, { text: string; lang: string }> = {
  US: { text: 'United States', lang: 'en' },
  GB: { text: 'United Kingdom', lang: 'en' },
  CA: { text: 'Canada', lang: 'en' },
  DE: { text: 'Deutschland', lang: 'de' },
  FR: { text: 'France', lang: 'fr' },
  MX: { text: 'México', lang: 'es' },
  IN: { text: 'भारत', lang: 'hi' },
  ET: { text: 'ኢትዮጵያ', lang: 'am' },
  JP: { text: '日本', lang: 'ja' },
  VN: { text: 'Việt Nam', lang: 'vi' },
  SG: { text: 'Singapura', lang: 'ms' },
  MA: { text: 'المغرب', lang: 'ar' },
  PT: { text: 'Portugal', lang: 'pt' },
  TR: { text: 'Türkiye', lang: 'tr' },
  IT: { text: 'Italia', lang: 'it' },
  ES: { text: 'España', lang: 'es' },
};

/**
 * Decorative passport arrival stamp for a destination: country name around the top, "Arrival"
 * (and the trip leg) around the bottom, a plane and the country's own name for itself in the middle.
 */
export function PassportStamp({ country, leg, legs, className }: { country: Country; leg?: number; legs?: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  const endonym = ENDONYM[country.code];
  const showEndonym = endonym.text.toLocaleLowerCase() !== country.name.toLocaleLowerCase();
  const bottom = legs && legs > 1 && leg ? `Arrival · Leg ${leg}` : '★ Arrival ★';

  return (
    <div
      aria-hidden="true"
      className={cn('passport-stamp text-primary relative size-32 shrink-0 select-none', className)}
    >
      <svg viewBox="0 0 120 120" className="absolute inset-0 size-full" fill="none">
        <defs>
          {/* Top arc reads left→right over the top; bottom arc left→right under the bottom (text stays upright). */}
          <path id={`${id}-top`} d="M 14,60 A 46,46 0 0 1 106,60" />
          <path id={`${id}-bottom`} d="M 9,60 A 51,51 0 0 0 111,60" />
        </defs>
        <circle cx="60" cy="60" r="57" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="60" cy="60" r="41.5" stroke="currentColor" strokeWidth="1" />
        <text fill="currentColor" fontSize="8.5" fontWeight="700" letterSpacing="1.4" className="font-mono uppercase">
          <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">
            {country.name.toUpperCase()}
          </textPath>
        </text>
        <text fill="currentColor" fontSize="7" fontWeight="600" letterSpacing="1.6" className="font-mono uppercase">
          <textPath href={`#${id}-bottom`} startOffset="50%" textAnchor="middle">
            {bottom.toUpperCase()}
          </textPath>
        </text>
      </svg>
      <div className="absolute inset-[24%] flex flex-col items-center justify-center gap-0.5 text-center">
        <PlaneIcon className={cn('-rotate-45', showEndonym ? 'size-4' : 'size-7')} strokeWidth={2.25} />
        {showEndonym && (
          <span lang={endonym.lang} className="font-heading text-[0.78rem] leading-[1.1] font-bold text-balance">
            {endonym.text}
          </span>
        )}
      </div>
    </div>
  );
}
