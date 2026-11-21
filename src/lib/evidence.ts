import { CircleHelpIcon, InfoIcon } from 'lucide-react';
import type { Confidence, Verification } from '@/data';

// How an entry's evidence is described: the confidence hints and the registry-check sentence.
// Kept out of the client badge so server pages can use the same wording.

export const TIPS: Partial<Record<Confidence, { icon: typeof InfoIcon; color: string; title: string; tip: string }>> = {
  medium: {
    icon: InfoIcon,
    color: 'text-ink-mixed',
    title: 'Not registry-checked',
    tip: 'Based on general market knowledge. It is likely right, but it hasn’t been confirmed against a local registry.',
  },
  low: {
    icon: CircleHelpIcon,
    color: 'text-ink-banned',
    title: 'Unconfirmed',
    tip: 'We couldn’t confirm this. Verify with a local pharmacist before relying on it.',
  },
};

export function whatWasChecked({ checks }: Verification) {
  if (checks.includes('absent')) return 'It lists no medicine with this ingredient.';
  const subject = checks.includes('brand')
    ? 'This name is registered there with this ingredient'
    : 'Medicines with this ingredient are registered there';
  return checks.includes('status') ? `${subject}, and the legal status shown matches.` : `${subject}.`;
}
