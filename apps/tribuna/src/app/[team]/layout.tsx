import { isDemo } from '@/lib/data/repository';
import { TEAM_SLUGS } from '@/lib/teams';
import { resolveTeam } from '@/lib/server/team-params';

export function generateStaticParams() {
  return TEAM_SLUGS.map((team) => ({ team }));
}

export default async function TeamLayout({ children, params }: { children: React.ReactNode; params: Promise<{ team: string }> }) {
  const { slug: team } = await resolveTeam(params);

  return (
    <div data-team={team} className="relative isolate">
      {/* Halo del club detrás del contenido */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,var(--team-glow),transparent)]" />
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-28 sm:px-6 md:pb-16">
        {isDemo && (
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-fill px-3 py-1 text-[12px] font-medium text-ink-2">
            <span className="size-1.5 rounded-full bg-accent-2" />
            Modo demo · datos de ejemplo hasta conectar Supabase
          </p>
        )}
        {children}
      </main>
    </div>
  );
}
