'use client';

import { motion } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { TEAM_SLUGS, TEAMS, type TeamSlug } from '@/lib/teams';
import { cn } from '@/lib/cn';

/** Mantiene la sección al cambiar de club: /real-madrid/plantilla → /barcelona/plantilla. */
function targetPath(pathname: string, slug: TeamSlug) {
  const [, , section] = pathname.split('/');
  // El detalle de un partido pertenece a un equipo: se vuelve al calendario.
  return section ? `/${slug}/${section}` : `/${slug}`;
}

/**
 * Segmented Control al estilo de iOS. El "thumb" se desliza con un spring
 * compartido (layoutId) y se mueve en el mismo instante del toque; la
 * navegación llega después dentro de una transición.
 */
export function TeamSwitcher({ current }: { current: TeamSlug }) {
  const router = useRouter();
  const pathname = usePathname();
  const [optimistic, setOptimistic] = useState(current);
  const [isPending, startTransition] = useTransition();

  useEffect(() => setOptimistic(current), [current]);

  useEffect(() => {
    for (const slug of TEAM_SLUGS) if (slug !== current) router.prefetch(targetPath(pathname, slug));
  }, [current, pathname, router]);

  function select(slug: TeamSlug) {
    if (slug === optimistic) return;
    setOptimistic(slug);
    startTransition(() => router.push(targetPath(pathname, slug), { scroll: false }));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const i = TEAM_SLUGS.indexOf(optimistic);
    if (e.key === 'ArrowRight') select(TEAM_SLUGS[(i + 1) % TEAM_SLUGS.length]!);
    if (e.key === 'ArrowLeft') select(TEAM_SLUGS[(i - 1 + TEAM_SLUGS.length) % TEAM_SLUGS.length]!);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Equipo"
      aria-busy={isPending}
      onKeyDown={onKeyDown}
      className="relative grid w-full grid-cols-3 rounded-[11px] bg-fill p-[3px] sm:w-[360px]"
    >
      {TEAM_SLUGS.map((slug) => {
        const active = slug === optimistic;
        return (
          <button
            key={slug}
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => select(slug)}
            data-team={slug}
            className={cn(
              'relative z-0 h-8 rounded-[8px] px-3 text-[13px] font-medium tracking-tight transition-colors duration-200 outline-none',
              'focus-visible:ring-2 focus-visible:ring-accent/60',
              active ? 'text-ink' : 'text-ink-2 hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId="team-switcher-thumb"
                className="absolute inset-0 -z-10 rounded-[8px] bg-card-solid shadow-[0_3px_8px_rgb(0_0_0/0.12),0_3px_1px_rgb(0_0_0/0.04)] dark:bg-[#636366]"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="flex items-center justify-center gap-1.5">
              <span aria-hidden className="size-1.5 rounded-full bg-accent" />
              {TEAMS[slug].label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
