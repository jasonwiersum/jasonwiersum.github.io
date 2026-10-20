'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { DEFAULT_TEAM, isTeamSlug } from '@/lib/teams';
import { TeamSwitcher } from './TeamSwitcher';
import { NavTabs, TabBar } from './NavTabs';

/**
 * Vive en el layout raíz y no en /[team], para que el Segmented Control no se
 * desmonte al cambiar de club y su animación sea continua.
 */
export function AppHeader() {
  const segment = usePathname().split('/')[1];
  const team = isTeamSlug(segment) ? segment : DEFAULT_TEAM;

  return (
    <>
      <header data-team={team} className="glass sticky top-0 z-40 border-x-0 border-t-0">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link href={`/${team}`} className="flex items-center gap-2 font-display text-[19px] font-semibold tracking-tight">
              <span aria-hidden className="size-2.5 rounded-full bg-accent shadow-[0_0_12px_var(--team-accent)]" />
              Tribuna
            </Link>
            <NavTabs team={team} />
          </div>
          <TeamSwitcher current={team} />
        </div>
      </header>
      <TabBar team={team} />
    </>
  );
}
