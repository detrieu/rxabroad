import { Suspense } from 'react';
import { Formulary, FormularyView } from '@/components/Formulary';

export default function Home() {
  return (
    <>
      <p className="intro">
        Every drug has one international name (its <strong>INN</strong>, shown in italics) and a different local
        brand name almost everywhere you go. Search a brand, a generic name, or a destination country to see what
        to actually ask for at the pharmacy counter.
      </p>
      {/* The fallback is the full, unfiltered list, so the prerendered HTML is complete;
          the URL-aware version takes over on the client. */}
      <Suspense fallback={<FormularyView />}>
        <Formulary />
      </Suspense>
    </>
  );
}
