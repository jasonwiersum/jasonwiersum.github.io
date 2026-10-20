'use client';

import { useEffect, useState } from 'react';

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export function Countdown({ to }: { to: string }) {
  const target = new Date(to).getTime();
  // null en el servidor: evita un desajuste de hidratación con la hora.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const { d, h, m, s } = parts(now == null ? 0 : target - now);
  const units = d > 0 ? [[d, 'días'], [h, 'h'], [m, 'min']] : [[h, 'h'], [m, 'min'], [s, 's']];

  return (
    <div className="flex items-end justify-center gap-4" aria-live="off">
      {units.map(([value, label]) => (
        <div key={label} className="text-center">
          <div className="font-display text-3xl font-semibold tabular tracking-tight text-ink sm:text-4xl">
            {now == null ? '–' : String(value).padStart(2, '0')}
          </div>
          <div className="text-[11px] font-medium tracking-wide text-ink-3 uppercase">{label}</div>
        </div>
      ))}
    </div>
  );
}
