// Datos de demostración. Se usan solo cuando Supabase no está configurado,
// para poder ver y desarrollar la interfaz sin claves. Los resultados y las
// estadísticas son inventados (generados con una semilla fija).
import type {
  Lineup,
  LineupPlayer,
  Match,
  MatchEvent,
  MatchStatistic,
  Player,
  PlayerSeasonStats,
  Position,
  StandingRow,
  StandingTable,
} from '@/lib/types';
import { TEAMS, type TeamSlug } from '@/lib/teams';
import { teamLogoUrl } from '@/lib/format';

const SEASON = 2026;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const int = (r: () => number, min: number, max: number) => Math.floor(r() * (max - min + 1)) + min;
const pick = <T,>(r: () => number, list: readonly T[]) => list[Math.floor(r() * list.length)]!;

// ---------------------------------------------------------------------------
// Plantillas
// ---------------------------------------------------------------------------
type SquadEntry = [number, string, Position, string, number];

const SQUADS: Record<TeamSlug, SquadEntry[]> = {
  'real-madrid': [
    [1, 'T. Courtois', 'Goalkeeper', 'Belgium', 34],
    [13, 'A. Lunin', 'Goalkeeper', 'Ukraine', 27],
    [2, 'D. Carvajal', 'Defender', 'Spain', 34],
    [3, 'É. Militão', 'Defender', 'Brazil', 28],
    [12, 'T. Alexander-Arnold', 'Defender', 'England', 28],
    [18, 'Á. Carreras', 'Defender', 'Spain', 23],
    [22, 'A. Rüdiger', 'Defender', 'Germany', 33],
    [24, 'D. Huijsen', 'Defender', 'Spain', 21],
    [5, 'J. Bellingham', 'Midfielder', 'England', 23],
    [6, 'E. Camavinga', 'Midfielder', 'France', 23],
    [8, 'F. Valverde', 'Midfielder', 'Uruguay', 28],
    [14, 'A. Tchouaméni', 'Midfielder', 'France', 26],
    [15, 'A. Güler', 'Midfielder', 'Turkey', 21],
    [30, 'F. Mastantuono', 'Midfielder', 'Argentina', 19],
    [7, 'Vinícius Júnior', 'Attacker', 'Brazil', 26],
    [10, 'K. Mbappé', 'Attacker', 'France', 27],
    [11, 'Rodrygo', 'Attacker', 'Brazil', 25],
    [21, 'Brahim Díaz', 'Attacker', 'Morocco', 27],
  ],
  barcelona: [
    [13, 'Joan García', 'Goalkeeper', 'Spain', 25],
    [25, 'W. Szczęsny', 'Goalkeeper', 'Poland', 36],
    [2, 'P. Cubarsí', 'Defender', 'Spain', 19],
    [3, 'A. Balde', 'Defender', 'Spain', 22],
    [4, 'R. Araújo', 'Defender', 'Uruguay', 27],
    [5, 'E. García', 'Defender', 'Spain', 25],
    [23, 'J. Koundé', 'Defender', 'France', 27],
    [6, 'Gavi', 'Midfielder', 'Spain', 22],
    [8, 'Pedri', 'Midfielder', 'Spain', 23],
    [16, 'Fermín López', 'Midfielder', 'Spain', 23],
    [20, 'Dani Olmo', 'Midfielder', 'Spain', 28],
    [21, 'F. de Jong', 'Midfielder', 'Netherlands', 29],
    [9, 'R. Lewandowski', 'Attacker', 'Poland', 38],
    [10, 'Lamine Yamal', 'Attacker', 'Spain', 19],
    [11, 'Raphinha', 'Attacker', 'Brazil', 29],
    [7, 'Ferran Torres', 'Attacker', 'Spain', 26],
    [14, 'M. Rashford', 'Attacker', 'England', 28],
  ],
  atletico: [
    [13, 'J. Oblak', 'Goalkeeper', 'Slovenia', 33],
    [1, 'J. Musso', 'Goalkeeper', 'Argentina', 32],
    [2, 'J. M. Giménez', 'Defender', 'Uruguay', 31],
    [3, 'M. Ruggeri', 'Defender', 'Italy', 24],
    [14, 'M. Llorente', 'Defender', 'Spain', 31],
    [16, 'N. Molina', 'Defender', 'Argentina', 28],
    [17, 'D. Hancko', 'Defender', 'Slovakia', 28],
    [24, 'R. Le Normand', 'Defender', 'Spain', 30],
    [4, 'C. Gallagher', 'Midfielder', 'England', 26],
    [5, 'J. Cardoso', 'Midfielder', 'United States', 24],
    [6, 'Koke', 'Midfielder', 'Spain', 34],
    [8, 'P. Barrios', 'Midfielder', 'Spain', 23],
    [10, 'Á. Baena', 'Midfielder', 'Spain', 25],
    [11, 'T. Almada', 'Midfielder', 'Argentina', 25],
    [20, 'G. Simeone', 'Attacker', 'Argentina', 23],
    [7, 'A. Griezmann', 'Attacker', 'France', 35],
    [9, 'A. Sørloth', 'Attacker', 'Norway', 30],
    [19, 'J. Álvarez', 'Attacker', 'Argentina', 26],
  ],
};

function demoPlayers(slug: TeamSlug): Player[] {
  const team = TEAMS[slug];
  return SQUADS[slug].map(([number, name, position, nationality, age]) => ({
    // IDs negativos: nunca coinciden con un jugador real de API-Football,
    // así que no se pide foto y se ve el fallback con iniciales.
    id: -(team.apiId * 100 + number),
    teamId: team.apiId,
    name,
    firstname: null,
    lastname: null,
    number,
    position,
    nationality,
    age,
    birthDate: null,
    height: null,
    weight: null,
    photoUrl: null,
    injured: false,
  }));
}

function demoStats(player: Player): PlayerSeasonStats[] {
  const r = rng(player.id);
  const comps: Array<[number, string, number]> = [
    [140, 'La Liga', 9],
    [2, 'UEFA Champions League', 3],
  ];
  return comps.map(([competitionId, competitionName, games]) => {
    const apps = player.position === 'Goalkeeper' && player.number !== 1 && player.number !== 13 ? int(r, 0, 2) : int(r, Math.floor(games / 2), games);
    const minutes = apps * int(r, 55, 90);
    const att = player.position === 'Attacker' ? 1 : player.position === 'Midfielder' ? 0.45 : 0.12;
    const gk = player.position === 'Goalkeeper';
    return {
      playerId: player.id,
      competitionId,
      competitionName,
      appearances: apps,
      lineups: Math.max(0, apps - int(r, 0, 2)),
      minutes,
      goals: gk ? 0 : Math.round(apps * att * r() * 0.9),
      assists: gk ? 0 : Math.round(apps * (att * 0.5 + 0.1) * r() * 0.8),
      shotsTotal: gk ? 0 : Math.round(apps * att * int(r, 2, 4)),
      shotsOn: gk ? 0 : Math.round(apps * att * int(r, 1, 2)),
      passesTotal: apps * int(r, gk ? 25 : 35, gk ? 35 : 70),
      passesKey: gk ? 0 : Math.round(apps * (att * 1.2 + 0.2) * r() * 2),
      passAccuracy: int(r, 78, 93),
      tackles: gk ? 0 : Math.round(apps * (1.3 - att) * int(r, 1, 3)),
      interceptions: gk ? 0 : Math.round(apps * (1.2 - att) * r() * 2),
      duelsTotal: gk ? apps : apps * int(r, 6, 12),
      duelsWon: gk ? apps : Math.round(apps * int(r, 3, 7)),
      dribblesAttempts: gk ? 0 : Math.round(apps * att * int(r, 2, 5)),
      dribblesSuccess: gk ? 0 : Math.round(apps * att * int(r, 1, 3)),
      saves: gk ? apps * int(r, 2, 4) : 0,
      goalsConceded: gk ? Math.round(apps * r() * 1.2) : 0,
      yellowCards: int(r, 0, 3),
      redCards: r() > 0.94 ? 1 : 0,
      rating: apps ? Number((6.6 + r() * 1.2).toFixed(2)) : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Rivales y partidos
// ---------------------------------------------------------------------------
const LALIGA_RIVALS: Array<[number, string]> = [
  [536, 'Sevilla'],
  [532, 'Valencia'],
  [533, 'Villarreal'],
  [548, 'Real Sociedad'],
  [531, 'Athletic Club'],
  [543, 'Real Betis'],
  [547, 'Girona'],
  [538, 'Celta Vigo'],
  [727, 'Osasuna'],
  [546, 'Getafe'],
  [798, 'Mallorca'],
  [728, 'Rayo Vallecano'],
  [542, 'Alavés'],
  [540, 'Espanyol'],
];

const UCL_RIVALS: Array<[number, string]> = [
  [157, 'Bayern München'],
  [50, 'Manchester City'],
  [40, 'Liverpool'],
  [85, 'Paris Saint Germain'],
  [505, 'Inter'],
  [42, 'Arsenal'],
  [496, 'Juventus'],
  [165, 'Borussia Dortmund'],
];

const SURNAMES = ['García', 'Martínez', 'López', 'Sánchez', 'Pérez', 'Gómez', 'Fernández', 'Díaz', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Navarro', 'Torres', 'Ramos', 'Gil', 'Serrano', 'Molina'];

const COMP = {
  liga: { id: 140, name: 'La Liga', logo: 'https://media.api-sports.io/football/leagues/140.png' },
  ucl: { id: 2, name: 'UEFA Champions League', logo: 'https://media.api-sports.io/football/leagues/2.png' },
  copa: { id: 143, name: 'Copa del Rey', logo: 'https://media.api-sports.io/football/leagues/143.png' },
};

const FORMATION_GRID: Record<string, string[]> = {
  '4-3-3': ['1:1', '2:4', '2:3', '2:2', '2:1', '3:3', '3:2', '3:1', '4:3', '4:2', '4:1'],
  '4-4-2': ['1:1', '2:4', '2:3', '2:2', '2:1', '3:4', '3:3', '3:2', '3:1', '4:2', '4:1'],
};

function lineupFor(teamId: number, players: Player[] | null, r: () => number, formation: '4-3-3' | '4-4-2'): Lineup {
  const grid = FORMATION_GRID[formation]!;
  const counts = formation === '4-3-3' ? { G: 1, D: 4, M: 3, F: 3 } : { G: 1, D: 4, M: 4, F: 2 };
  const pos: Array<['G' | 'D' | 'M' | 'F', Position]> = [
    ['G', 'Goalkeeper'],
    ['D', 'Defender'],
    ['M', 'Midfielder'],
    ['F', 'Attacker'],
  ];
  let i = 0;
  const startXI: LineupPlayer[] = [];
  const substitutes: LineupPlayer[] = [];
  for (const [short, long] of pos) {
    const pool = players
      ? players.filter((p) => p.position === long)
      : Array.from({ length: counts[short] + 2 }, (_, k) => ({ id: null, name: `${pick(r, ['A.', 'J.', 'M.', 'D.', 'L.', 'P.'])} ${pick(r, SURNAMES)}`, number: i + k + 2 }));
    pool.forEach((p, k) => {
      const entry: LineupPlayer = { id: 'teamId' in p ? p.id : null, name: p.name, number: p.number, pos: short, grid: null };
      if (k < counts[short]) startXI.push({ ...entry, grid: grid[i++]! });
      else substitutes.push(entry);
    });
  }
  return { teamId, formation, coach: null, startXI, substitutes: substitutes.slice(0, 7) };
}

function statsFor(r: () => number, homeGoals: number, awayGoals: number): MatchStatistic[] {
  const possession = int(r, 38, 66);
  const homeShots = homeGoals * 2 + int(r, 5, 12);
  const awayShots = awayGoals * 2 + int(r, 4, 10);
  const homePasses = Math.round(possession * int(r, 8, 11));
  const awayPasses = Math.round((100 - possession) * int(r, 8, 11));
  return [
    { type: 'Ball Possession', home: `${possession}%`, away: `${100 - possession}%` },
    { type: 'expected_goals', home: (homeGoals * 0.7 + r() * 1.2).toFixed(2), away: (awayGoals * 0.7 + r() * 1).toFixed(2) },
    { type: 'Total Shots', home: homeShots, away: awayShots },
    { type: 'Shots on Goal', home: homeGoals + int(r, 1, 5), away: awayGoals + int(r, 0, 4) },
    { type: 'Corner Kicks', home: int(r, 2, 9), away: int(r, 1, 7) },
    { type: 'Fouls', home: int(r, 7, 16), away: int(r, 8, 17) },
    { type: 'Total passes', home: homePasses, away: awayPasses },
    { type: 'Passes %', home: `${int(r, 82, 92)}%`, away: `${int(r, 76, 88)}%` },
    { type: 'Yellow Cards', home: int(r, 0, 4), away: int(r, 0, 4) },
  ];
}

function eventsFor(
  r: () => number,
  home: { id: number; lineup: Lineup; goals: number },
  away: { id: number; lineup: Lineup; goals: number },
  upTo = 90,
): MatchEvent[] {
  const events: MatchEvent[] = [];
  for (const side of [home, away]) {
    const outfield = side.lineup.startXI.filter((p) => p.pos !== 'G');
    const attackers = outfield.filter((p) => p.pos === 'F' || p.pos === 'M');
    for (let g = 0; g < side.goals; g++) {
      const scorer = pick(r, attackers.length ? attackers : outfield);
      const assist = r() > 0.35 ? pick(r, outfield.filter((p) => p !== scorer)) : null;
      events.push({
        minute: int(r, 3, upTo),
        extra: null,
        teamId: side.id,
        playerId: scorer.id,
        playerName: scorer.name,
        assistId: assist?.id ?? null,
        assistName: assist?.name ?? null,
        type: 'Goal',
        detail: r() > 0.88 ? 'Penalty' : 'Normal Goal',
      });
    }
    for (let c = int(r, 0, 3); c > 0; c--) {
      const p = pick(r, outfield);
      events.push({ minute: int(r, 10, upTo), extra: null, teamId: side.id, playerId: p.id, playerName: p.name, assistId: null, assistName: null, type: 'Card', detail: 'Yellow Card' });
    }
    if (upTo > 60) {
      const off = pick(r, attackers.length ? attackers : outfield);
      const on = side.lineup.substitutes[0];
      if (on) events.push({ minute: int(r, 60, Math.min(upTo, 80)), extra: null, teamId: side.id, playerId: on.id, playerName: on.name, assistId: off.id, assistName: off.name, type: 'subst', detail: 'Substitution 1' });
    }
  }
  return events.sort((a, b) => a.minute - b.minute);
}

function demoMatches(slug: TeamSlug): Match[] {
  const team = TEAMS[slug];
  const players = demoPlayers(slug);
  const r = rng(team.apiId * 7);
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const today = new Date();
  today.setUTCHours(19, 0, 0, 0);

  const plan: Array<{ offsetDays: number; comp: keyof typeof COMP }> = [
    ...[-38, -34, -31, -27, -24, -20, -17, -13, -10, -6, -3].map((d, i) => ({ offsetDays: d, comp: (i % 4 === 2 ? 'ucl' : 'liga') as keyof typeof COMP })),
    ...[3, 7, 10, 14, 17, 21, 28, 35].map((d, i) => ({ offsetDays: d, comp: (i === 2 || i === 5 ? 'ucl' : i === 6 ? 'copa' : 'liga') as keyof typeof COMP })),
  ];

  const matches: Match[] = plan.map(({ offsetDays, comp }, i) => {
    // Una semilla por partido: el resultado no cambia según el día en que se mire.
    const r = rng(team.apiId * 1000 + i);
    const kickoff = new Date(today.getTime() + offsetDays * day);
    const [rivalId, rivalName] = comp === 'ucl' ? pick(r, UCL_RIVALS) : pick(r, LALIGA_RIVALS);
    const isHome = i % 2 === 0;
    const finished = kickoff.getTime() < now;
    const ownGoals = int(r, 0, 4);
    const otherGoals = int(r, 0, 2);
    const own = finished ? ownGoals : null;
    const other = finished ? otherGoals : null;
    const ownLineup = lineupFor(team.apiId, players, r, '4-3-3');
    const rivalLineup = lineupFor(rivalId, null, r, r() > 0.5 ? '4-3-3' : '4-4-2');
    const homeSide = isHome ? { id: team.apiId, name: team.name, goals: own } : { id: rivalId, name: rivalName, goals: other };
    const awaySide = isHome ? { id: rivalId, name: rivalName, goals: other } : { id: team.apiId, name: team.name, goals: own };
    const c = COMP[comp];
    return {
      id: team.apiId * 1000 + i,
      season: SEASON,
      competitionId: c.id,
      competitionName: c.name,
      competitionLogo: c.logo,
      round: comp === 'liga' ? `Regular Season - ${i + 1}` : comp === 'ucl' ? 'League Stage - ' + (Math.floor(i / 4) + 1) : 'Round of 32',
      kickoffAt: kickoff.toISOString(),
      statusShort: finished ? 'FT' : 'NS',
      statusLong: finished ? 'Match Finished' : 'Not Started',
      elapsed: finished ? 90 : null,
      elapsedExtra: null,
      home: { id: homeSide.id, name: homeSide.name, logoUrl: teamLogoUrl(homeSide.id), goals: homeSide.goals, penalties: null },
      away: { id: awaySide.id, name: awaySide.name, logoUrl: teamLogoUrl(awaySide.id), goals: awaySide.goals, penalties: null },
      venue: isHome ? team.stadium : null,
      referee: finished ? `${pick(r, ['J.', 'A.', 'C.', 'M.'])} ${pick(r, SURNAMES)}` : null,
      lineups: finished ? (isHome ? [ownLineup, rivalLineup] : [rivalLineup, ownLineup]) : [],
      events: finished
        ? eventsFor(
            r,
            { id: homeSide.id, lineup: isHome ? ownLineup : rivalLineup, goals: homeSide.goals ?? 0 },
            { id: awaySide.id, lineup: isHome ? rivalLineup : ownLineup, goals: awaySide.goals ?? 0 },
          )
        : [],
      statistics: finished ? statsFor(r, homeSide.goals ?? 0, awaySide.goals ?? 0) : [],
    };
  });

  // El Barcelona juega "ahora mismo" en la demo, para ver el estado En vivo.
  if (slug === 'barcelona') {
    const elapsed = 58;
    const ownLineup = lineupFor(team.apiId, players, r, '4-3-3');
    const rivalLineup = lineupFor(533, null, r, '4-4-2');
    matches.push({
      id: team.apiId * 1000 + 99,
      season: SEASON,
      competitionId: COMP.liga.id,
      competitionName: COMP.liga.name,
      competitionLogo: COMP.liga.logo,
      round: 'Regular Season - 12',
      kickoffAt: new Date(now - (elapsed + 17) * 60 * 1000).toISOString(),
      statusShort: '2H',
      statusLong: 'Second Half',
      elapsed,
      elapsedExtra: null,
      home: { id: team.apiId, name: team.name, logoUrl: teamLogoUrl(team.apiId), goals: 2, penalties: null },
      away: { id: 533, name: 'Villarreal', logoUrl: teamLogoUrl(533), goals: 1, penalties: null },
      venue: team.stadium,
      referee: 'J. Martínez',
      lineups: [ownLineup, rivalLineup],
      events: eventsFor(r, { id: team.apiId, lineup: ownLineup, goals: 2 }, { id: 533, lineup: rivalLineup, goals: 1 }, elapsed),
      statistics: statsFor(r, 2, 1),
    });
  }

  return matches.sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt));
}

// ---------------------------------------------------------------------------
// Clasificaciones
// ---------------------------------------------------------------------------
function table(competitionId: number, competitionName: string, teams: Array<[number, string]>, played: number, seed: number): StandingTable {
  const r = rng(seed);
  const rows = teams
    .map(([id, name], i) => {
      const strength = Math.max(0, 1 - i / teams.length);
      const win = Math.min(played, Math.round(played * (0.25 + strength * 0.5) + r() * 2));
      const draw = Math.min(played - win, int(r, 0, 3));
      const lose = played - win - draw;
      const goalsFor = win * 2 + draw + int(r, 0, 4);
      const goalsAgainst = lose * 2 + draw + int(r, 0, 3);
      const form = Array.from({ length: 5 }, () => pick(r, ['W', 'W', 'D', 'L'])).join('');
      return { id, name, win, draw, lose, goalsFor, goalsAgainst, form };
    })
    .sort((a, b) => b.win * 3 + b.draw - (a.win * 3 + a.draw) || b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst));

  return {
    competitionId,
    competitionName,
    groupName: '',
    rows: rows.map(
      (t, i): StandingRow => ({
        competitionId,
        competitionName,
        groupName: '',
        rank: i + 1,
        teamId: t.id,
        teamName: t.name,
        teamLogo: teamLogoUrl(t.id),
        points: t.win * 3 + t.draw,
        played,
        win: t.win,
        draw: t.draw,
        lose: t.lose,
        goalsFor: t.goalsFor,
        goalsAgainst: t.goalsAgainst,
        goalDiff: t.goalsFor - t.goalsAgainst,
        form: t.form,
        description: competitionId === 140 && i < 4 ? 'Promotion - Champions League' : null,
      }),
    ),
  };
}

function demoStandings(slug: TeamSlug): StandingTable[] {
  const tracked: Array<[number, string]> = [
    [TEAMS['real-madrid'].apiId, TEAMS['real-madrid'].name],
    [TEAMS.barcelona.apiId, TEAMS.barcelona.name],
    [TEAMS.atletico.apiId, TEAMS.atletico.name],
  ];
  const liga = table(140, 'La Liga', [...tracked, ...LALIGA_RIVALS, [541 + 1000, 'Levante'], [541 + 1001, 'Elche'], [541 + 1002, 'Real Oviedo']], 11, 2026);
  const ucl = table(2, 'UEFA Champions League', [...tracked, ...UCL_RIVALS, [194, 'Ajax'], [211, 'Benfica'], [212, 'FC Porto']], 3, 2027);
  const id = TEAMS[slug].apiId;
  return [liga, ucl].filter((t) => t.rows.some((row) => row.teamId === id));
}

// ---------------------------------------------------------------------------
// API pública del módulo
// ---------------------------------------------------------------------------
export const demo = {
  players: demoPlayers,
  stats(slug: TeamSlug) {
    return Object.fromEntries(demoPlayers(slug).map((p) => [p.id, demoStats(p)]));
  },
  matches: demoMatches,
  standings: demoStandings,
  match(id: number) {
    for (const slug of Object.keys(TEAMS) as TeamSlug[]) {
      const found = demoMatches(slug).find((m) => m.id === id);
      if (found) return found;
    }
    return null;
  },
};
