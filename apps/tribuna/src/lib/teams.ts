export type TeamSlug = 'real-madrid' | 'barcelona' | 'atletico';

export interface TrackedTeam {
  slug: TeamSlug;
  /** ID del equipo en API-Football. */
  apiId: number;
  name: string;
  /** Etiqueta corta para el Segmented Control. */
  label: string;
  stadium: string;
  /** Color de la barra de estado en iOS / theme-color. */
  themeColor: string;
}

export const TEAMS: Record<TeamSlug, TrackedTeam> = {
  'real-madrid': {
    slug: 'real-madrid',
    apiId: 541,
    name: 'Real Madrid',
    label: 'Real Madrid',
    stadium: 'Santiago Bernabéu',
    themeColor: '#ffffff',
  },
  barcelona: {
    slug: 'barcelona',
    apiId: 529,
    name: 'FC Barcelona',
    label: 'Barcelona',
    stadium: 'Spotify Camp Nou',
    themeColor: '#fbf7fa',
  },
  atletico: {
    slug: 'atletico',
    apiId: 530,
    name: 'Atlético de Madrid',
    label: 'Atlético',
    stadium: 'Metropolitano',
    themeColor: '#fbf8f8',
  },
};

export const TEAM_SLUGS = Object.keys(TEAMS) as TeamSlug[];
export const DEFAULT_TEAM: TeamSlug = 'real-madrid';
export const TRACKED_TEAM_IDS = TEAM_SLUGS.map((slug) => TEAMS[slug].apiId);

export function isTeamSlug(value: string | undefined | null): value is TeamSlug {
  return !!value && value in TEAMS;
}

export function teamBySlug(slug: string): TrackedTeam | null {
  return isTeamSlug(slug) ? TEAMS[slug] : null;
}

export function teamByApiId(id: number): TrackedTeam | null {
  return TEAM_SLUGS.map((s) => TEAMS[s]).find((t) => t.apiId === id) ?? null;
}

/** Competiciones conocidas, para nombres cortos y orden en los filtros. */
export const COMPETITIONS: Record<number, { short: string; order: number }> = {
  140: { short: 'LaLiga', order: 0 },
  2: { short: 'Champions', order: 1 },
  143: { short: 'Copa del Rey', order: 2 },
  556: { short: 'Supercopa', order: 3 },
  15: { short: 'Mundial de Clubes', order: 4 },
  531: { short: 'Supercopa UEFA', order: 5 },
  667: { short: 'Amistosos', order: 9 },
};

export function competitionShortName(id: number | null, fallback: string | null): string {
  return (id != null && COMPETITIONS[id]?.short) || fallback || 'Competición';
}
