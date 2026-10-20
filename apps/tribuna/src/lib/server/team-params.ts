import { notFound } from 'next/navigation';
import { isTeamSlug, TEAMS } from '@/lib/teams';

/** Valida el segmento [team]; cualquier otro valor (p. ej. /favicon.ico) es un 404. */
export async function resolveTeam(params: Promise<{ team: string }>) {
  const { team } = await params;
  if (!isTeamSlug(team)) notFound();
  return { slug: team, team: TEAMS[team] };
}
