'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Country, Drug } from '@/data';

type State = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string };

/** A small link under an entry that opens a form to report something wrong with it. Anonymous. */
export function ReportProblem({ drug, country }: { drug: Drug; country: Country }) {
  const [message, setMessage] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ kind: 'sending' });
    const website = new FormData(e.currentTarget).get('website');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugId: drug.id, country: country.code, message, website }),
      });
      if (res.ok) {
        setState({ kind: 'sent' });
        setMessage('');
      } else {
        setState({ kind: 'error', message: (await res.json().catch(() => null))?.error ?? 'Could not send it. Try again later.' });
      }
    } catch {
      setState({ kind: 'error', message: 'Could not send it. Check your connection.' });
    }
  }

  return (
    <Popover onOpenChange={(open) => open && state.kind === 'sent' && setState({ kind: 'idle' })}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="no-print text-muted-foreground hover:text-foreground w-fit font-mono text-[0.68rem] underline decoration-dotted underline-offset-4 hover:decoration-solid"
        >
          Report a problem
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm" align="start">
        {state.kind === 'sent' ? (
          <p>Thanks. We read every report and fix the entry if it’s wrong.</p>
        ) : (
          <form onSubmit={send} className="grid gap-2">
            <label htmlFor={`report-${drug.id}-${country.code}`} className="font-heading font-semibold">
              {drug.generic} in {country.name}
            </label>
            <textarea
              id={`report-${drug.id}-${country.code}`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={1000}
              required
              minLength={3}
              placeholder="What’s wrong? For example, the brand you were given, or whether you needed a prescription."
              className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 w-full rounded-lg border bg-transparent px-2.5 py-2 text-base outline-none focus-visible:ring-3 md:text-sm"
            />
            {/* Hidden from people; a bot that fills it in is ignored. */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
            <p className="text-muted-foreground text-xs">Don’t include your name or health details. We don’t store who sent it.</p>
            {state.kind === 'error' && <p className="text-destructive text-xs">{state.message}</p>}
            <Button type="submit" size="sm" disabled={state.kind === 'sending' || message.trim().length < 3} className="justify-self-end">
              {state.kind === 'sending' ? 'Sending…' : 'Send'}
            </Button>
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
}
