'use client';

import { useMyMeds } from '@/lib/my-meds';

export function AddMedButton({ drugId, generic }: { drugId: string; generic: string }) {
  const { meds, toggle } = useMyMeds();
  const saved = meds.includes(drugId);
  return (
    <button
      type="button"
      className="add-med"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${generic} from my meds` : `Add ${generic} to my meds`}
      onClick={() => toggle(drugId)}
    >
      {saved ? '✓ In my meds' : '+ My meds'}
    </button>
  );
}
