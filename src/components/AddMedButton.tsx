'use client';

import { useRouter } from 'next/navigation';
import { CheckIcon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useMyMeds } from '@/lib/my-meds';
import { cn } from '@/lib/utils';

export function AddMedButton({ drugId, generic, className }: { drugId: string; generic: string; className?: string }) {
  const router = useRouter();
  const { meds, toggle } = useMyMeds();
  const saved = meds.includes(drugId);

  return (
    <Button
      type="button"
      variant={saved ? 'secondary' : 'default'}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${generic} from travel card` : `Add ${generic} to travel card`}
      className={cn('no-print', saved && 'border-border border', className)}
      onClick={(e) => {
        // Lives inside <summary> on the list: don't let the click also open/close the entry.
        e.preventDefault();
        e.stopPropagation();
        toggle(drugId);
        if (saved) {
          toast(`Removed ${generic} from your travel card`);
        } else {
          toast.success(`Added ${generic} to your travel card`, {
            action: { label: 'View card', onClick: () => router.push('/my-meds') },
          });
        }
      }}
    >
      {saved ? <CheckIcon className="text-ink-otc" /> : <PlusIcon />}
      {saved ? 'On travel card' : 'Add to travel card'}
    </Button>
  );
}
