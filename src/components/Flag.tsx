import CA from 'country-flag-icons/react/3x2/CA';
import DE from 'country-flag-icons/react/3x2/DE';
import ET from 'country-flag-icons/react/3x2/ET';
import FR from 'country-flag-icons/react/3x2/FR';
import GB from 'country-flag-icons/react/3x2/GB';
import IN from 'country-flag-icons/react/3x2/IN';
import JP from 'country-flag-icons/react/3x2/JP';
import MA from 'country-flag-icons/react/3x2/MA';
import MX from 'country-flag-icons/react/3x2/MX';
import PT from 'country-flag-icons/react/3x2/PT';
import SG from 'country-flag-icons/react/3x2/SG';
import TR from 'country-flag-icons/react/3x2/TR';
import US from 'country-flag-icons/react/3x2/US';
import VN from 'country-flag-icons/react/3x2/VN';
import { cn } from '@/lib/utils';
import type { CountryCode } from '@/data';

// SVG flags (emoji flags don't render on Windows). Imported one by one to keep the bundle small.
const FLAGS = { CA, DE, ET, FR, GB, IN, JP, MA, MX, PT, SG, TR, US, VN } satisfies Record<CountryCode, unknown>;

export function Flag({ code, className, title }: { code: CountryCode; className?: string; title?: string }) {
  const Svg = FLAGS[code];
  return (
    <Svg
      title={title}
      aria-hidden={title ? undefined : true}
      className={cn('inline-block h-[0.9em] w-auto shrink-0 rounded-[2px] shadow-[0_0_0_1px_rgb(0_0_0/0.12)]', className)}
    />
  );
}
