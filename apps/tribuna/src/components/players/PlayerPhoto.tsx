'use client';

import Image from 'next/image';
import { useState } from 'react';
import { initials } from '@/lib/format';
import { cn } from '@/lib/cn';

/**
 * Foto del jugador servida por API-Football. Si falta o falla, un avatar con
 * las iniciales sobre el color del club.
 */
export function PlayerPhoto({ src, name, size, className }: { src: string | null; name: string; size: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;

  return (
    <span
      className={cn('relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-card-solid', className)}
      style={{ width: size, height: size }}
    >
      {showFallback ? (
        <span
          aria-hidden
          className="grid size-full place-items-center bg-[linear-gradient(145deg,color-mix(in_srgb,var(--team-accent)_22%,transparent),color-mix(in_srgb,var(--team-accent-2)_18%,transparent))] font-display font-semibold text-accent"
          style={{ fontSize: size * 0.34 }}
        >
          {initials(name)}
        </span>
      ) : (
        <Image src={src} alt={name} fill sizes={`${size}px`} className="object-cover object-top" onError={() => setFailed(true)} />
      )}
    </span>
  );
}
