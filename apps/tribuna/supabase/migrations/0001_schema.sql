-- Tribuna · esquema inicial
-- Todas las tablas usan los IDs de API-Football como clave primaria, de modo
-- que cada sincronización es un upsert idempotente.

-- ---------------------------------------------------------------------------
-- Equipos (los tres seguidos y cualquier rival que aparezca en un partido)
-- ---------------------------------------------------------------------------
create table if not exists public.teams (
  id           integer primary key,            -- API-Football team id
  slug         text unique,                    -- solo equipos seguidos: real-madrid, barcelona, atletico
  name         text not null,
  short_name   text,
  logo_url     text,
  country      text,
  founded      smallint,
  venue_name   text,
  venue_city   text,
  is_tracked   boolean not null default false,
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Competiciones
-- ---------------------------------------------------------------------------
create table if not exists public.competitions (
  id          integer primary key,             -- API-Football league id (140 LaLiga, 2 UCL, 143 Copa…)
  name        text not null,
  type        text,                            -- League | Cup
  country     text,
  logo_url    text,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Jugadores
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.player_position as enum ('Goalkeeper', 'Defender', 'Midfielder', 'Attacker');
exception when duplicate_object then null; end $$;

create table if not exists public.players (
  id           integer primary key,            -- API-Football player id
  team_id      integer not null references public.teams (id) on delete cascade,
  name         text not null,
  firstname    text,
  lastname     text,
  number       smallint,
  position     public.player_position,
  nationality  text,
  age          smallint,
  birth_date   date,
  height       text,
  weight       text,
  photo_url    text,
  injured      boolean not null default false,
  is_active    boolean not null default true, -- false cuando sale de la plantilla
  updated_at   timestamptz not null default now()
);
create index if not exists players_team_idx on public.players (team_id) where is_active;

-- ---------------------------------------------------------------------------
-- Partidos
-- Los nombres y escudos de ambos equipos van desnormalizados: así el payload
-- de Supabase Realtime basta para pintar el marcador sin otra consulta.
-- ---------------------------------------------------------------------------
create table if not exists public.matches (
  id                 integer primary key,      -- API-Football fixture id
  season             smallint not null,
  competition_id     integer references public.competitions (id),
  competition_name   text,
  competition_logo   text,
  round              text,
  kickoff_at         timestamptz not null,
  status_short       text not null default 'NS', -- NS, 1H, HT, 2H, ET, P, FT, AET, PEN, PST…
  status_long        text,
  elapsed            smallint,
  elapsed_extra      smallint,
  home_team_id       integer not null,
  home_team_name     text not null,
  home_team_logo     text,
  away_team_id       integer not null,
  away_team_name     text not null,
  away_team_logo     text,
  home_goals         smallint,
  away_goals         smallint,
  home_penalties     smallint,
  away_penalties     smallint,
  venue              text,
  referee            text,
  events             jsonb not null default '[]'::jsonb,  -- goles, tarjetas, cambios, VAR
  lineups            jsonb not null default '[]'::jsonb,  -- formación, titulares y suplentes
  statistics         jsonb not null default '[]'::jsonb,  -- [{type, home, away}]
  detail_synced_at   timestamptz,               -- última vez que se trajeron eventos/alineaciones/estadísticas
  updated_at         timestamptz not null default now()
);
create index if not exists matches_home_idx on public.matches (home_team_id, kickoff_at desc);
create index if not exists matches_away_idx on public.matches (away_team_id, kickoff_at desc);
create index if not exists matches_kickoff_idx on public.matches (kickoff_at);

-- ---------------------------------------------------------------------------
-- Estadísticas de jugador por temporada y competición
-- ---------------------------------------------------------------------------
create table if not exists public.player_stats (
  player_id          integer not null references public.players (id) on delete cascade,
  season             smallint not null,
  competition_id     integer not null references public.competitions (id),
  team_id            integer not null references public.teams (id),
  appearances        smallint not null default 0,
  lineups            smallint not null default 0,
  minutes            integer  not null default 0,
  goals              smallint not null default 0,
  assists            smallint not null default 0,
  shots_total        smallint not null default 0,
  shots_on           smallint not null default 0,
  passes_total       integer  not null default 0,
  passes_key         smallint not null default 0,
  pass_accuracy      smallint,                  -- %
  tackles            smallint not null default 0,
  interceptions      smallint not null default 0,
  duels_total        smallint not null default 0,
  duels_won          smallint not null default 0,
  dribbles_attempts  smallint not null default 0,
  dribbles_success   smallint not null default 0,
  saves              smallint not null default 0,
  goals_conceded     smallint not null default 0,
  yellow_cards       smallint not null default 0,
  red_cards          smallint not null default 0,
  rating             numeric(4, 2),
  updated_at         timestamptz not null default now(),
  primary key (player_id, season, competition_id)
);
create index if not exists player_stats_team_idx on public.player_stats (team_id, season);

-- ---------------------------------------------------------------------------
-- Clasificaciones
-- ---------------------------------------------------------------------------
create table if not exists public.standings (
  competition_id   integer not null references public.competitions (id),
  season           smallint not null,
  group_name       text not null default '',
  team_id          integer not null,
  rank             smallint not null,
  team_name        text not null,
  team_logo        text,
  points           smallint not null default 0,
  played           smallint not null default 0,
  win              smallint not null default 0,
  draw             smallint not null default 0,
  lose             smallint not null default 0,
  goals_for        smallint not null default 0,
  goals_against    smallint not null default 0,
  goal_diff        smallint not null default 0,
  form             text,                        -- "WWDLW"
  description      text,                        -- "Promotion - Champions League (League phase)"
  updated_at       timestamptz not null default now(),
  primary key (competition_id, season, group_name, team_id)
);

-- ---------------------------------------------------------------------------
-- Control interno: presupuesto diario de la API y estado de los cron
-- ---------------------------------------------------------------------------
create table if not exists public.api_usage (
  day    date primary key,
  calls  integer not null default 0
);

create table if not exists public.sync_state (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- Reserva una petición del presupuesto de hoy de forma atómica.
-- Devuelve el número de llamadas tras reservar, o -1 si ya no queda cupo.
create or replace function public.reserve_api_call(p_limit integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_calls integer;
begin
  insert into public.api_usage as u (day, calls)
  values ((now() at time zone 'utc')::date, 1)
  on conflict (day) do update
    set calls = u.calls + 1
    where u.calls < p_limit
  returning calls into v_calls;

  return coalesce(v_calls, -1);
end;
$$;

revoke all on function public.reserve_api_call(integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security: lectura pública, escritura solo con service_role
-- (service_role ignora RLS, así que no hacen falta políticas de escritura).
-- ---------------------------------------------------------------------------
alter table public.teams         enable row level security;
alter table public.competitions  enable row level security;
alter table public.players       enable row level security;
alter table public.matches       enable row level security;
alter table public.player_stats  enable row level security;
alter table public.standings     enable row level security;
alter table public.api_usage     enable row level security;
alter table public.sync_state    enable row level security;

do $$
declare t text;
begin
  foreach t in array array['teams', 'competitions', 'players', 'matches', 'player_stats', 'standings'] loop
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Realtime: los clientes reciben los cambios de marcador por WebSocket.
-- ---------------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.matches;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Datos semilla: los tres clubes seguidos
-- ---------------------------------------------------------------------------
insert into public.teams (id, slug, name, short_name, country, founded, venue_name, venue_city, logo_url, is_tracked) values
  (541, 'real-madrid', 'Real Madrid',        'Real Madrid', 'Spain', 1902, 'Estadio Santiago Bernabéu', 'Madrid',    'https://media.api-sports.io/football/teams/541.png', true),
  (529, 'barcelona',   'FC Barcelona',       'Barcelona',   'Spain', 1899, 'Spotify Camp Nou',          'Barcelona', 'https://media.api-sports.io/football/teams/529.png', true),
  (530, 'atletico',    'Atlético de Madrid', 'Atlético',    'Spain', 1903, 'Riyadh Air Metropolitano',  'Madrid',    'https://media.api-sports.io/football/teams/530.png', true)
on conflict (id) do update set slug = excluded.slug, is_tracked = true;
