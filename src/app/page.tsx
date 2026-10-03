import { Suspense } from 'react';
import { Formulary, FormularyView } from '@/components/Formulary';

export default function Home() {
  return (
    <main>
      {/* The fallback is the full, unfiltered list, so the prerendered HTML is complete;
          the URL-aware version takes over on the client. */}
      <Suspense fallback={<FormularyView />}>
        <Formulary />
      </Suspense>
    </main>
  );
}
