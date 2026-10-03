import Link from 'next/link';
import { PlaneIcon } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { MyMedsLink } from './MyMedsLink';

export const CONTAINER = 'mx-auto w-full max-w-5xl px-4 sm:px-6';

/** Passport-cover header: navy guilloché, gold foil wordmark. */
export function Masthead() {
  return (
    <header className="guilloche text-navy-foreground">
      <div className={`${CONTAINER} flex h-16 items-center gap-3`}>
        <Link href="/" className="group flex min-w-0 items-center gap-2.5 rounded-md focus-visible:ring-3 focus-visible:ring-gold/50 focus-visible:outline-none">
          <span
            aria-hidden="true"
            className="border-gold text-gold relative grid size-9 shrink-0 place-items-center rounded-full border-[1.5px] transition-transform group-hover:-rotate-12"
          >
            <span className="border-gold/50 absolute inset-[3px] rounded-full border" />
            <PlaneIcon className="size-4 -rotate-45" />
          </span>
          <span className="text-gold font-heading truncate text-base font-bold tracking-[0.1em] uppercase min-[400px]:tracking-[0.16em] sm:text-lg sm:tracking-[0.18em]">
            Pill Trotter
          </span>
        </Link>
        <nav aria-label="Site" className="ml-auto flex items-center gap-1 sm:gap-2">
          <MyMedsLink />
          <ThemeToggle className="text-navy-foreground hover:bg-white/10 hover:text-gold dark:hover:bg-white/10" />
        </nav>
      </div>
    </header>
  );
}
