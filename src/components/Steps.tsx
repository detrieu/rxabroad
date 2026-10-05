import type { ReactNode } from 'react';
import { CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StepState = 'done' | 'current' | 'upcoming';
type Tone = 'navy' | 'paper';

/** Derives each step's state: done ones are done; the first not-done step is "current". */
export function stepStates(done: boolean[]): StepState[] {
  const current = done.indexOf(false);
  return done.map((d, i) => (d ? 'done' : i === current ? 'current' : 'upcoming'));
}

const NUMBER_STYLES: Record<Tone, Record<StepState, string>> = {
  navy: {
    done: 'bg-gold text-navy border-gold',
    current: 'border-gold text-gold ring-gold/25 ring-4',
    upcoming: 'border-white/25 text-navy-foreground/60',
  },
  paper: {
    done: 'bg-primary text-primary-foreground border-primary',
    current: 'border-primary text-primary ring-primary/15 ring-4',
    upcoming: 'border-border text-muted-foreground',
  },
};

/** A numbered circle; turns into a check mark once the step is done. */
export function StepNumber({ n, state, tone = 'paper', className }: { n: number; state: StepState; tone?: Tone; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-6 shrink-0 place-items-center rounded-full border-[1.5px] font-mono text-[0.7rem] font-semibold transition-colors',
        NUMBER_STYLES[tone][state],
        className,
      )}
    >
      {state === 'done' ? <CheckIcon className="size-3.5" strokeWidth={3} /> : n}
    </span>
  );
}

export interface Step {
  title: string;
  hint?: ReactNode;
  state: StepState;
}

/** "How it works" strip: numbered steps that tick off as the visitor completes them. */
export function StepStrip({
  steps, tone = 'paper', label = 'How it works', vertical = false, className, children,
}: { steps: Step[]; tone?: Tone; label?: string; vertical?: boolean; className?: string; children?: ReactNode }) {
  const navy = tone === 'navy';
  return (
    <section aria-label={label} className={cn('no-print', className)}>
      <p className={cn('mb-2 font-mono text-[0.65rem] tracking-[0.2em] uppercase', navy ? 'text-navy-foreground/60' : 'text-muted-foreground')}>
        {label}
      </p>
      <ol className={cn('grid gap-x-6 gap-y-3', !vertical && 'sm:flex sm:items-start')}>
        {steps.map((s, i) => (
          <li key={s.title} className={cn('flex min-w-0 items-start gap-2.5', !vertical && 'sm:flex-1')} aria-current={s.state === 'current' ? 'step' : undefined}>
            <StepNumber n={i + 1} state={s.state} tone={tone} className="mt-px" />
            <span className="min-w-0">
              <span
                className={cn(
                  'block text-sm leading-tight font-semibold',
                  navy ? (s.state === 'upcoming' ? 'text-navy-foreground/60' : 'text-navy-foreground') : s.state === 'upcoming' && 'text-muted-foreground',
                )}
              >
                {s.title}
                <span className="sr-only">{s.state === 'done' ? ' (done)' : s.state === 'current' ? ' (current step)' : ''}</span>
              </span>
              {s.hint && (
                <span className={cn('mt-0.5 block text-xs leading-snug', navy ? 'text-navy-foreground/60' : 'text-muted-foreground')}>{s.hint}</span>
              )}
            </span>
          </li>
        ))}
      </ol>
      {children}
    </section>
  );
}
