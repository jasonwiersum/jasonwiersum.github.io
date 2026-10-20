'use client';

import Image from 'next/image';
import { useState } from 'react';
import { initials } from '@/lib/format';
import { cn } from '@/lib/cn';

/** Escudo con fallback a iniciales si la imagen no carga. */
export function TeamCrest({ src, name, size = 28, className }: { src: string | null; name: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span
        aria-hidden
        className={cn('inline-grid shrink-0 place-items-center rounded-full bg-fill font-semibold text-ink-2', className)}
        style={{ width: size, height: size, fontSize: size * 0.36 }}
      >
        {initials(name)}
      </span>
    );
  }
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      className={cn('shrink-0 object-contain', className)}
      onError={() => setFailed(true)}
      unoptimized
    />
  );
}
