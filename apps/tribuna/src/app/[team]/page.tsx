import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getSquad, getSquadStats, getStandings, getTeamMatches } from '@/lib/data/repository';
import { isFinished, isLive, matchPhase } from '@/lib/match';
import { TEAMS } from '@/lib/teams';
import { resolveTeam } from '@/lib/server/team-params';
import { Card, CardTitle } from '@/components/ui/Card';
import { MatchWidget } from '@/components/matches/MatchWidget';
import { MatchCard } from '@/components/matches/MatchCard';
import { StatsChart } from '@/components/charts/StatsChart';
import { StandingsTable } from '@/components/standings/StandingsTable';
import { PlayerPhoto } from '@/components/players/PlayerPhoto';

// ISR: la página se regenera como mucho cada 5 minutos; el marcador en vivo
// no depende de esto (llega por Realtime) y el cron fuerza la regeneración.
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ team: string }> }): Promise<Metadata> {
  const { team } = await resolveTeam(params);
  return { title: team.name };
}

export default async function TeamHub({ params }: { params: Promise<{ team: string }> }) {
  const { slug } = await resolveTeam(params);
  const team = TEAMS[slug];
  const [matches, standings, squad, stats] = await Promise.all([getTeamMatches(slug), getStandings(slug), getSquad(slug), getSquadStats(slug)]);

  const live = matches.find(isLive);
  const finished = matches.filter(isFinished);
  const last = finished.at(-1);
  const upcoming = matches.filter((m) => matchPhase(m.statusShort) === 'scheduled');
  const featured = live ?? upcoming[0] ?? last;
  const secondary = featured === last ? upcoming[0] : last;

  const scorers = squad
    .map((p) => ({ p, goals: (stats[p.id] ?? []).reduce((s, x) => s + x.goals, 0), assists: (stats[p.id] ?? []).reduce((s, x) => s + x.assists, 0) }))
    .filter((x) => x.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[13px] font-medium text-ink-2">{team.stadium}</p>
        <h1 className="font-display text-[34px] leading-tight font-bold tracking-tight sm:text-[40px]">{team.name}</h1>
      </div>

      {featured ? (
        <MatchWidget match={featured} team={slug} teamId={team.apiId} />
      ) : (
        <Card className="py-16 text-center text-ink-3">Sin partidos esta temporada todavía.</Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Card className="flex flex-col">
          <CardTitle>Últimos {Math.min(finished.length, 10)} partidos</CardTitle>
          <StatsChart matches={finished.slice(-10)} teamId={team.apiId} />
        </Card>

        <Card>
          <CardTitle>Clasificación</CardTitle>
          {standings.length === 0 ? (
            <p className="py-10 text-center text-[14px] text-ink-3">Sin clasificación disponible.</p>
          ) : (
            <div className="space-y-6">
              {standings.map((t) => (
                <StandingsTable key={`${t.competitionId}-${t.groupName}`} table={t} teamId={team.apiId} top={t.competitionId === 140 ? 5 : 4} />
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Card>
          <CardTitle
            action={
              <Link href={`/${slug}/partidos`} className="flex items-center text-[13px] font-medium text-accent">
                Calendario <ChevronRight size={14} />
              </Link>
            }
          >
            {secondary === last ? 'Resultado y próximos' : 'Próximos'}
          </CardTitle>
          <div className="space-y-2">
            {[...(secondary && secondary !== featured ? [secondary] : []), ...upcoming.filter((m) => m !== featured && m !== secondary).slice(0, 3)].map((m) => (
              <MatchCard key={m.id} match={m} team={slug} teamId={team.apiId} />
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle
            action={
              <Link href={`/${slug}/plantilla`} className="flex items-center text-[13px] font-medium text-accent">
                Plantilla <ChevronRight size={14} />
              </Link>
            }
          >
            Goleadores
          </CardTitle>
          {scorers.length === 0 ? (
            <p className="py-10 text-center text-[14px] text-ink-3">Aún no hay goles esta temporada.</p>
          ) : (
            <ol className="space-y-1">
              {scorers.map(({ p, goals, assists }, i) => (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl py-2">
                  <span className="w-4 text-[13px] font-semibold tabular text-ink-3">{i + 1}</span>
                  <PlayerPhoto src={p.photoUrl} name={p.name} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold">{p.name}</span>
                    <span className="block text-[12px] text-ink-2 tabular">{assists} {assists === 1 ? 'asistencia' : 'asistencias'}</span>
                  </span>
                  <span className="text-right">
                    <span className="block font-display text-[22px] leading-none font-semibold tabular">{goals}</span>
                    <span className="text-[11px] text-ink-3">goles</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
