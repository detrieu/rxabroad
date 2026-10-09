import { ConstructionIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Notice for a country whose entries have not been checked against its official registry yet. */
export function InProgressBanner({ children, onNavy, className }: { children: React.ReactNode; onNavy?: boolean; className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-3 rounded-xl border-2 border-dashed px-4 py-3',
        onNavy ? 'border-gold/70 bg-gold/12 text-navy-foreground' : 'border-ink-mixed/60 bg-ink-mixed/10',
        className,
      )}
    >
      <ConstructionIcon className={cn('mt-0.5 size-6 shrink-0', onNavy ? 'text-gold' : 'text-ink-mixed')} aria-hidden />
      <div className="min-w-0">
        <p className={cn('font-heading text-[0.95rem] font-bold tracking-[0.14em] uppercase', onNavy ? 'text-gold' : 'text-ink-mixed')}>
          Work in progress
        </p>
        <p className="mt-0.5 text-[0.86rem] leading-relaxed">{children}</p>
      </div>
    </div>
  );
}
