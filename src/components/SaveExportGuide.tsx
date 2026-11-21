'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useActiveTripId } from '@/lib/my-meds';
import { useOfflineReady } from '@/lib/offline';
import { StepStrip, stepStates } from './Steps';
import { PrintButton } from './Toolbar';

/** Travel card page instructions, limited to the things people miss: saving, exporting and offline use. */
export function SaveExportGuide({ hasCard, cardCount }: { hasCard: boolean; cardCount: number }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [activeId] = useActiveTripId();
  const [printed, setPrinted] = useState(false);
  const offline = useOfflineReady();

  useEffect(() => {
    const onAfterPrint = () => setPrinted(true);
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, []);

  const saved = !!(isSignedIn && activeId);
  const [save, exportStep, offlineStep] = stepStates([saved, printed, offline]);

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
        {
          title: 'Keep it offline',
          hint: offline
            ? 'Saved on this device. Add this page to your home screen and it opens without internet.'
            : 'Open this page once with internet to save it for offline use.',
          state: offlineStep,
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
