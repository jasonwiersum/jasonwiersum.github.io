const TZ = 'Europe/Madrid';

export function formatMatchDate(iso: string) {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: TZ,
  }).format(new Date(iso));
}

export function formatKickoffTime(iso: string) {
  return new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(new Date(iso));
}

export function formatLongDate(iso: string) {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  }).format(new Date(iso));
}

export const POSITION_LABEL = {
  Goalkeeper: 'Porteros',
  Defender: 'Defensas',
  Midfielder: 'Centrocampistas',
  Attacker: 'Delanteros',
} as const;

export const POSITION_SINGULAR = {
  Goalkeeper: 'Portero',
  Defender: 'Defensa',
  Midfielder: 'Centrocampista',
  Attacker: 'Delantero',
} as const;

const NATIONALITY_ES: Record<string, string> = {
  Spain: 'España',
  France: 'Francia',
  Brazil: 'Brasil',
  England: 'Inglaterra',
  Germany: 'Alemania',
  Belgium: 'Bélgica',
  Uruguay: 'Uruguay',
  Argentina: 'Argentina',
  Netherlands: 'Países Bajos',
  Poland: 'Polonia',
  Portugal: 'Portugal',
  Turkey: 'Turquía',
  Türkiye: 'Turquía',
  Austria: 'Austria',
  Ukraine: 'Ucrania',
  Slovenia: 'Eslovenia',
  Slovakia: 'Eslovaquia',
  Norway: 'Noruega',
  Italy: 'Italia',
  Mexico: 'México',
  Morocco: 'Marruecos',
  Croatia: 'Croacia',
  Denmark: 'Dinamarca',
  'United States': 'Estados Unidos',
  Colombia: 'Colombia',
  Ghana: 'Ghana',
  Guinea: 'Guinea',
};

export function nationalityEs(n: string | null) {
  if (!n) return '—';
  return NATIONALITY_ES[n] ?? n;
}

export function initials(name: string) {
  const parts = name.replace(/\./g, ' ').split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function playerPhotoUrl(id: number | null) {
  return id && id > 0 ? `https://media.api-sports.io/football/players/${id}.png` : null;
}

export function teamLogoUrl(id: number) {
  return `https://media.api-sports.io/football/teams/${id}.png`;
}
