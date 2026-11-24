import { StethoscopeIcon } from 'lucide-react';
import type { PharmacistNote as Note } from '@/data';
import { cn } from '@/lib/utils';

const monthYear = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en', { year: 'numeric', month: 'short' });

/** A pharmacist's note on one entry. `block` is the boxed version for the medicine-in-country page; rows use the inline one. */
export function PharmacistNote({ note, block, className }: { note: Note; block?: boolean; className?: string }) {
  if (block) {
    return (
      <div className={cn('border-t px-5 py-4', className)}>
        <p className="text-primary flex items-center gap-1.5 font-mono text-[0.6rem] tracking-[0.16em] uppercase">
          <StethoscopeIcon className="size-3.5" /> Pharmacist note
        </p>
        <p className="mt-1.5 text-[0.92rem] leading-relaxed">{note.text}</p>
        <p className="text-muted-foreground mt-1 text-xs">{monthYear(note.date)}</p>
      </div>
    );
  }
  return (
    <p className={cn('flex gap-1.5 text-[0.82rem] leading-relaxed', className)}>
      <StethoscopeIcon className="text-primary mt-1 size-3.5 shrink-0" />
      <span>
        <span className="text-primary font-semibold">Pharmacist note.</span> {note.text}{' '}
        <span className="text-muted-foreground text-xs">{monthYear(note.date)}</span>
      </span>
    </p>
  );
}
