'use client';

import { useEffect, useState } from 'react';
import { ArrowRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UsNameMatch } from '@/lib/rxnorm';

/** Searches already counted in this visit. */
const logged = new Set<string>();

/** The form the API route normalises to, so the same medicine always hits the same cached answer. */
const normalise = (q: string) => q.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Shown when a search matches nothing in the formulary. Asks RxNorm what the name is in the US
 * ("Zestoretic" → lisinopril + hydrochlorothiazide) and points to the ingredients we do cover.
 * Renders nothing while loading, when RxNorm has no answer, or if the lookup fails. Also counts the miss
 * (anonymously, see /api/search-miss) so the medicines people look for get added next.
 */
export function UsNameHint({ query, onSearch }: { query: string; onSearch: (generic: string) => void }) {
  const q = normalise(query);
  const [result, setResult] = useState<{ q: string; match: UsNameMatch | null } | null>(null);

  // Count the miss once the person stops typing, so "zol", "zolo"... aren't each recorded.
  useEffect(() => {
    if (q.length < 3 || logged.has(q)) return;
    const t = setTimeout(() => {
      logged.add(q);
      fetch('/api/search-miss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q }),
        keepalive: true,
      }).catch(() => {});
    }, 2000);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (q.length < 3) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/rxnorm/resolve?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (res.ok) setResult({ q, match: (await res.json()).match });
      } catch {
        /* aborted or offline: keep the plain "No matches" message */
      }
    }, 450);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const match = result?.q === q ? result.match : null;
  if (!match) return null;

  const covered = match.ingredients.filter((i) => i.drugId && i.generic);
  const missing = match.ingredients.filter((i) => !i.drugId);
  const label = (i: UsNameMatch['ingredients'][number]) =>
    i.generic && i.generic.toLowerCase() !== i.name.toLowerCase() ? `${i.name} (${i.generic})` : i.name;

  return (
    <div className="mt-6 border-t pt-6 text-sm" aria-live="polite">
      <p>
        {match.exact ? (
          <>In the US, <span className="font-semibold">{match.name}</span> contains </>
        ) : (
          <>Closest US match: <span className="font-semibold">{match.name}</span>, which contains </>
        )}
        <span className="font-semibold">{match.ingredients.map(label).join(' + ')}</span>.
      </p>
      {covered.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {covered.map((i) => (
            <Button key={i.drugId} type="button" variant="outline" size="sm" onClick={() => onSearch(i.generic!)}>
              See {i.generic} abroad <ArrowRightIcon />
            </Button>
          ))}
        </div>
      )}
      {missing.length > 0 && (
        <p className="text-muted-foreground mt-3">
          {missing.map((i) => i.name).join(' and ')} {missing.length > 1 ? 'aren’t' : 'isn’t'} in Rx Abroad yet. Abroad,
          ask a pharmacist for {missing.length > 1 ? 'them' : 'it'} by {missing.length > 1 ? 'those generic names' : 'that generic name'}.
        </p>
      )}
      <p className="text-muted-foreground mt-3 text-xs">US name lookup: RxNorm, U.S. National Library of Medicine.</p>
    </div>
  );
}
