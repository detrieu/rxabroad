'use client';

import Link from 'next/link';
import { BriefcaseMedicalIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMyMeds } from '@/lib/my-meds';

export function MyMedsLink() {
  const { meds } = useMyMeds();
  return (
    <Button
      asChild
      variant="outline"
      className="border-gold/40 text-gold hover:bg-gold/10 hover:text-gold dark:border-gold/40 dark:hover:bg-gold/10 bg-transparent dark:bg-transparent"
    >
      <Link href="/my-meds">
        <BriefcaseMedicalIcon />
        <span className="hidden sm:inline">My travel card</span>
        <span className="sm:hidden">My meds</span>
        {meds.length > 0 && (
          <span
            className="bg-gold text-navy ml-0.5 grid h-5 min-w-5 place-items-center rounded-full px-1 font-mono text-[0.7rem] font-semibold tabular-nums"
            aria-label={`${meds.length} saved`}
          >
            {meds.length}
          </span>
        )}
      </Link>
    </Button>
  );
}
