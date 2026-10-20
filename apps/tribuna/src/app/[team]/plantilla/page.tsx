import type { Metadata } from 'next';
import { getSquad, getSquadStats } from '@/lib/data/repository';
import { TEAMS } from '@/lib/teams';
import { resolveTeam } from '@/lib/server/team-params';
import { RosterGrid } from '@/components/players/RosterGrid';

// Plantillas y estadísticas cambian como mucho una vez al día (cron).
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ team: string }> }): Promise<Metadata> {
  const { team } = await resolveTeam(params);
  return { title: `Plantilla · ${team.name}` };
}

export default async function RosterPage({ params }: { params: Promise<{ team: string }> }) {
  const { slug } = await resolveTeam(params);
  const [players, stats] = await Promise.all([getSquad(slug), getSquadStats(slug)]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[13px] font-medium text-ink-2">{TEAMS[slug].name}</p>
        <h1 className="font-display text-[34px] leading-tight font-bold tracking-tight">Plantilla</h1>
      </div>
      {players.length === 0 ? (
        <p className="py-20 text-center text-ink-3">La plantilla se sincroniza con el primer cron diario.</p>
      ) : (
        <RosterGrid players={players} stats={stats} />
      )}
    </div>
  );
}
