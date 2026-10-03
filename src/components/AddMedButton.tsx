'use client';

import { CheckIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMyMeds } from '@/lib/my-meds';
import { cn } from '@/lib/utils';

export function AddMedButton({ drugId, generic, className }: { drugId: string; generic: string; className?: string }) {
  const { meds, toggle } = useMyMeds();
  const saved = meds.includes(drugId);
  return (
    <Button
      type="button"
      size="sm"
      variant={saved ? 'default' : 'outline'}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${generic} from my meds` : `Add ${generic} to my meds`}
      className={cn('no-print', className)}
      onClick={() => toggle(drugId)}
    >
      {saved ? <CheckIcon /> : <PlusIcon />}
      {saved ? 'On my travel card' : 'Add to travel card'}
    </Button>
  );
}
