import type { Metadata } from 'next';
import { getTeamMatches } from '@/lib/data/repository';
import { TEAMS } from '@/lib/teams';
import { resolveTeam } from '@/lib/server/team-params';
import { FixturesList } from '@/components/matches/FixturesList';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ team: string }> }): Promise<Metadata> {
  const { team } = await resolveTeam(params);
  return { title: `Partidos · ${team.name}` };
}

export default async function FixturesPage({ params }: { params: Promise<{ team: string }> }) {
  const { slug } = await resolveTeam(params);
  const matches = await getTeamMatches(slug);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[13px] font-medium text-ink-2">{TEAMS[slug].name}</p>
        <h1 className="font-display text-[34px] leading-tight font-bold tracking-tight">Partidos</h1>
      </div>
      {/* El filtro por competición es local: la página sigue siendo estática (ISR). */}
      <FixturesList matches={matches} team={slug} teamId={TEAMS[slug].apiId} />
    </div>
  );
}
