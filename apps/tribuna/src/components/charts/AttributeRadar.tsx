'use client';

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { PlayerSeasonStats, Position } from '@/lib/types';

interface Axis {
  axis: string;
  value: number; // 0-100
  raw: string;
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

/**
 * Atributos derivados de las estadísticas por 90 minutos, escalados a 0-100
 * contra referencias de élite. API-Football no da mapas de calor; este radar
 * resume el perfil del jugador con lo que sí ofrece.
 */
export function attributes(s: PlayerSeasonStats, position: Position | null): Axis[] {
  const p90 = (v: number) => (s.minutes > 0 ? (v / s.minutes) * 90 : 0);
  const duelPct = s.duelsTotal ? (s.duelsWon / s.duelsTotal) * 100 : 0;

  if (position === 'Goalkeeper') {
    const conceded = p90(s.goalsConceded);
    return [
      { axis: 'Paradas', value: clamp((p90(s.saves) / 4) * 100), raw: `${p90(s.saves).toFixed(1)} / 90'` },
      { axis: 'Imbatibilidad', value: clamp(100 - (conceded / 2) * 100), raw: `${conceded.toFixed(2)} encajados / 90'` },
      { axis: 'Pase', value: clamp(((s.passAccuracy ?? 0) - 50) * 2), raw: `${s.passAccuracy ?? 0}%` },
      { axis: 'Juego aéreo', value: clamp(duelPct), raw: `${Math.round(duelPct)}% duelos` },
      { axis: 'Valoración', value: clamp(((s.rating ?? 6) - 6) * 50), raw: s.rating?.toFixed(2) ?? '—' },
    ];
  }

  return [
    { axis: 'Gol', value: clamp((p90(s.goals) / 0.8) * 100), raw: `${p90(s.goals).toFixed(2)} / 90'` },
    { axis: 'Tiro', value: clamp((p90(s.shotsOn) / 1.6) * 100), raw: `${p90(s.shotsOn).toFixed(1)} a puerta / 90'` },
    { axis: 'Creación', value: clamp(((p90(s.passesKey) + p90(s.assists) * 3) / 3.5) * 100), raw: `${p90(s.passesKey).toFixed(1)} pases clave / 90'` },
    { axis: 'Regate', value: clamp((p90(s.dribblesSuccess) / 3) * 100), raw: `${p90(s.dribblesSuccess).toFixed(1)} / 90'` },
    { axis: 'Defensa', value: clamp(((p90(s.tackles) + p90(s.interceptions)) / 4) * 100), raw: `${(p90(s.tackles) + p90(s.interceptions)).toFixed(1)} recuperaciones / 90'` },
    { axis: 'Pase', value: clamp(((s.passAccuracy ?? 0) - 60) * 2.86), raw: `${s.passAccuracy ?? 0}% precisión` },
  ];
}

export function AttributeRadar({ stats, position }: { stats: PlayerSeasonStats; position: Position | null }) {
  const data = attributes(stats, position);
  return (
    <div className="h-64" role="img" aria-label={data.map((d) => `${d.axis} ${d.value}`).join(', ')}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="var(--hairline)" />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: 'var(--ink-2)' }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Tooltip
            content={({ active, payload }) => {
              const d = payload?.[0]?.payload as Axis | undefined;
              if (!active || !d) return null;
              return (
                <div className="glass rounded-xl px-3 py-2 text-[12px] shadow-lg">
                  <p className="font-semibold text-ink">
                    {d.axis} <span className="tabular text-ink-2">{d.value}</span>
                  </p>
                  <p className="text-ink-3">{d.raw}</p>
                </div>
              );
            }}
          />
          <Radar dataKey="value" stroke="var(--team-accent)" strokeWidth={2} fill="var(--team-accent)" fillOpacity={0.18} dot={{ r: 3, fill: 'var(--team-accent)' }} isAnimationActive />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
