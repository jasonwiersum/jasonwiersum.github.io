import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...props }: ComponentPropsWithoutRef<'section'>) {
  return (
    <section
      className={cn('glass rounded-3xl p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_32px_rgb(0_0_0/0.06)] sm:p-6', className)}
      {...props}
    />
  );
}

export function CardTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <h2 className="font-display text-[17px] font-semibold tracking-tight text-ink">{children}</h2>
      {action}
    </div>
  );
}
