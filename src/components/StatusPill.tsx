import { statusMeta } from '@/data';

export function StatusPill({ status }: { status: string }) {
  const sm = statusMeta(status);
  return <span className={`pill pill--${sm.cls}`}>{sm.label}</span>;
}
