import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getMatch } from '@/lib/data/repository';
import { resolveTeam } from '@/lib/server/team-params';
import { MatchDetail } from '@/components/matches/MatchDetail';

// Se genera en la primera visita y se regenera cada minuto; durante el
// partido, Realtime actualiza la vista sin esperar a la regeneración.
export const revalidate = 60;

export function generateStaticParams() {
  return [];
}

async function load(params: Promise<{ team: string; id: string }>) {
  const { id } = await params;
  const { slug } = await resolveTeam(params);
  const matchId = Number(id);
  if (!Number.isInteger(matchId)) notFound();
  const match = await getMatch(matchId);
  if (!match) notFound();
  return { team: slug, match };
}

export async function generateMetadata({ params }: { params: Promise<{ team: string; id: string }> }): Promise<Metadata> {
  const { match } = await load(params);
  return { title: `${match.home.name} – ${match.away.name}` };
}

export default async function MatchPage({ params }: { params: Promise<{ team: string; id: string }> }) {
  const { team, match } = await load(params);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={`/${team}/partidos`} className="inline-flex items-center gap-0.5 text-[15px] text-accent">
        <ChevronLeft size={18} /> Partidos
      </Link>
      <MatchDetail match={match} />
    </div>
  );
}
