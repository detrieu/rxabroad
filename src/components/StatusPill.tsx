import { statusMeta } from '@/data';
import { cn } from '@/lib/utils';

// Status → stamp ink + style. Controlled/unconfirmed/generic read as "provisional" (dashed);
// banned is a solid red "VOID"-style stamp.
const STAMP: Record<string, { ink: string; variant?: string }> = {
  otc: { ink: 'ink-otc' },
  rx: { ink: 'ink-rx' },
  mixed: { ink: 'ink-mixed' },
  pharmacy: { ink: 'ink-pharmacy' },
  controlled: { ink: 'ink-controlled', variant: 'stamp--dashed' },
  banned: { ink: 'ink-banned', variant: 'stamp--solid' },
  unconfirmed: { ink: 'ink-unconfirmed', variant: 'stamp--dashed' },
  unavailable: { ink: 'ink-unavailable' },
  generic: { ink: 'ink-generic', variant: 'stamp--dashed' },
};

export function inkClass(status: string) {
  return STAMP[statusMeta(status).cls]?.ink ?? 'ink-unconfirmed';
}

export function StatusPill({ status, size, className }: { status: string; size?: 'sm'; className?: string }) {
  const sm = statusMeta(status);
  const s = STAMP[sm.cls] ?? STAMP.unconfirmed;
  return (
    <span className={cn('stamp', s.ink, s.variant, size === 'sm' && 'stamp--sm', className)}>{sm.label}</span>
  );
}
