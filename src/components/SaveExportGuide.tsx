'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useActiveTripId } from '@/lib/my-meds';
import { StepStrip, stepStates } from './Steps';
import { PrintButton } from './Toolbar';

/** Travel card page instructions, limited to the two things people miss: saving and exporting. */
export function SaveExportGuide({ hasCard, cardCount }: { hasCard: boolean; cardCount: number }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [activeId] = useActiveTripId();
  const [printed, setPrinted] = useState(false);

  useEffect(() => {
    const onAfterPrint = () => setPrinted(true);
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, []);

  const saved = !!(isSignedIn && activeId);
  const [save, exportStep] = stepStates([saved, printed]);

  const saveHint = !isLoaded
    ? 'Keep this trip in your account to open it on any device.'
    : !isSignedIn
      ? 'Sign in, then tap “Save as trip”. It opens on any device.'
      : saved
        ? 'Done. This trip is in your account, and edits save automatically.'
        : 'Tap “Save as trip”. After that, changes save automatically.';

  return (
    <StepStrip
      label="Save & export"
      className="bg-card mb-6 rounded-2xl border px-5 py-4 shadow-sm"
      steps={[
        { title: 'Save your trip', hint: saveHint, state: save },
        {
          title: 'Print or save as PDF',
          hint: hasCard
            ? `${cardCount > 1 ? 'Each destination prints on its own page. ' : ''}Keep the PDF on your phone to show at the pharmacy.`
            : 'Add a destination and a medicine first, then print your card.',
          state: exportStep,
        },
      ]}
    >
      {hasCard && (
        <div className="mt-3 flex justify-end">
          <PrintButton
            label={cardCount > 1 ? `Print ${cardCount} cards / Save as PDF` : 'Print card / Save as PDF'}
            className="border-border text-foreground border"
          />
        </div>
      )}
    </StepStrip>
  );
}
