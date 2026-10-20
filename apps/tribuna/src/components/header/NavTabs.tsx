'use client';

import { motion } from 'framer-motion';
import { CalendarDays, LayoutGrid, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { TeamSlug } from '@/lib/teams';
import { cn } from '@/lib/cn';

const TABS = [
  { section: '', label: 'Resumen', icon: LayoutGrid },
  { section: 'plantilla', label: 'Plantilla', icon: Users },
  { section: 'partidos', label: 'Partidos', icon: CalendarDays },
] as const;

function useActiveSection() {
  return usePathname().split('/')[2] ?? '';
}

/** Pestañas en línea (escritorio). */
export function NavTabs({ team }: { team: TeamSlug }) {
  const active = useActiveSection();
  return (
    <nav aria-label="Secciones" className="hidden items-center gap-1 md:flex">
      {TABS.map(({ section, label }) => {
        const isActive = active === section;
        return (
          <Link
            key={label}
            href={section ? `/${team}/${section}` : `/${team}`}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors',
              isActive ? 'text-ink' : 'text-ink-2 hover:text-ink',
            )}
          >
            {isActive && (
              <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-fill" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
            )}
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Tab bar inferior al estilo iOS (móvil). */
export function TabBar({ team }: { team: TeamSlug }) {
  const active = useActiveSection();
  return (
    <nav
      aria-label="Secciones"
      data-team={team}
      className="glass fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-3">
        {TABS.map(({ section, label, icon: Icon }) => {
          const isActive = active === section;
          return (
            <Link
              key={label}
              href={section ? `/${team}/${section}` : `/${team}`}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[10px] font-medium transition-colors active:scale-95',
                isActive ? 'text-accent' : 'text-ink-3',
              )}
            >
              <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
