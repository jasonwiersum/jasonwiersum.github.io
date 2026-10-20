import type { Outcome } from '@/lib/types';
import { cn } from '@/lib/cn';

const LABEL: Record<Outcome, { short: string; long: string; className: string }> = {
  W: { short: 'V', long: 'Victoria', className: 'bg-win/15 text-win' },
  D: { short: 'E', long: 'Empate', className: 'bg-draw/15 text-draw' },
  L: { short: 'D', long: 'Derrota', className: 'bg-loss/15 text-loss' },
};

/** Resultado con letra + color: nunca solo color. */
export function OutcomeBadge({ outcome, size = 'md' }: { outcome: Outcome; size?: 'sm' | 'md' }) {
  const o = LABEL[outcome];
  return (
    <span
      title={o.long}
      aria-label={o.long}
      className={cn(
        'inline-grid place-items-center rounded-full font-semibold tabular',
        size === 'sm' ? 'size-5 text-[11px]' : 'size-7 text-[13px]',
        o.className,
      )}
    >
      {o.short}
    </span>
  );
}
