'use client';

import { useId } from 'react';
import { PlaneIcon } from 'lucide-react';
import type { Country, CountryCode } from '@/data';
import { cn } from '@/lib/utils';

/** "Welcome" in each destination's main local language (Canada shows both official languages). */
const WELCOME: Record<CountryCode, { text: string; lang: string }> = {
  US: { text: 'Welcome', lang: 'en' },
  GB: { text: 'Welcome', lang: 'en' },
  CA: { text: 'Welcome\nBienvenue', lang: 'en' },
  DE: { text: 'Willkommen', lang: 'de' },
  FR: { text: 'Bienvenue', lang: 'fr' },
  MX: { text: 'Bienvenidos', lang: 'es' },
  IN: { text: 'स्वागत है', lang: 'hi' },
  ET: { text: 'እንኳን ደህና መጡ', lang: 'am' },
  JP: { text: 'ようこそ', lang: 'ja' },
  VN: { text: 'Chào mừng', lang: 'vi' },
  SG: { text: 'Selamat datang', lang: 'ms' },
  MA: { text: 'مرحبا', lang: 'ar' },
  PT: { text: 'Bem-vindo', lang: 'pt' },
  TR: { text: 'Hoş geldiniz', lang: 'tr' },
};

/**
 * Decorative passport arrival stamp for a destination: country name around the top, "Arrival"
 * (and the trip leg) around the bottom, a plane and "welcome" in the local language in the middle.
 */
export function PassportStamp({ country, leg, legs, className }: { country: Country; leg?: number; legs?: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  const welcome = WELCOME[country.code];
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
        <PlaneIcon className="size-4 -rotate-45" strokeWidth={2.25} />
        <span lang={welcome.lang} className="font-heading text-[0.68rem] leading-[1.1] font-bold whitespace-pre-line text-balance">
          {welcome.text}
        </span>
      </div>
    </div>
  );
}
