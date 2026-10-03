'use client';

import Link from 'next/link';
import { useMyMeds } from '@/lib/my-meds';

export function MyMedsLink() {
  const { meds } = useMyMeds();
  return (
    <Link href="/my-meds" className="nav-link">
      My meds travel card
      {meds.length > 0 && <span className="nav-count" aria-label={`${meds.length} saved`}>{meds.length}</span>}
    </Link>
  );
}
