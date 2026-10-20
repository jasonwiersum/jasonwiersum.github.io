import { TeamCrest } from '@/components/ui/TeamCrest';
import { competitionShortName } from '@/lib/teams';
import type { StandingTable } from '@/lib/types';
import { cn } from '@/lib/cn';

/**
 * Clasificación resumida: los primeros puestos y, si el equipo está más
 * abajo, su fila con un separador.
 */
export function StandingsTable({ table, teamId, top = 5 }: { table: StandingTable; teamId: number; top?: number }) {
  const ownIndex = table.rows.findIndex((r) => r.teamId === teamId);
  const rows = table.rows.slice(0, top);
  const ownRow = ownIndex >= top ? table.rows[ownIndex] : null;

  return (
    <div>
      <h3 className="mb-2 flex items-baseline justify-between text-[13px] font-semibold text-ink-2">
        {competitionShortName(table.competitionId, table.competitionName)}
        {table.groupName && <span className="font-normal text-ink-3">{table.groupName}</span>}
      </h3>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-[11px] text-ink-3">
            <th className="w-7 pb-1.5 text-left font-medium">#</th>
            <th className="pb-1.5 text-left font-medium">Equipo</th>
            <th className="w-8 pb-1.5 text-right font-medium" title="Partidos jugados">PJ</th>
            <th className="w-10 pb-1.5 text-right font-medium" title="Diferencia de goles">DG</th>
            <th className="w-10 pb-1.5 text-right font-medium" title="Puntos">Pts</th>
          </tr>
        </thead>
        <tbody>
          {[...rows, ...(ownRow ? [null, ownRow] : [])].map((r, i) =>
            r === null ? (
              <tr key="gap" aria-hidden>
                <td colSpan={5} className="py-0.5 text-center text-ink-3">···</td>
              </tr>
            ) : (
              <tr key={r.teamId} className={cn('border-t border-hairline', r.teamId === teamId && 'font-semibold text-ink')}>
                <td className="py-2 tabular text-ink-2">
                  <span className={cn('inline-grid size-5 place-items-center rounded-full', r.teamId === teamId && 'bg-accent text-white')}>{r.rank}</span>
                </td>
                <td className="py-2">
                  <span className="flex items-center gap-2">
                    <TeamCrest src={r.teamLogo} name={r.teamName} size={18} />
                    <span className="truncate">{r.teamName}</span>
                  </span>
                </td>
                <td className="py-2 text-right tabular text-ink-2">{r.played}</td>
                <td className="py-2 text-right tabular text-ink-2">{r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</td>
                <td className="py-2 text-right font-semibold tabular">{r.points}</td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
