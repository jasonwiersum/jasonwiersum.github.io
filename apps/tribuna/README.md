# Tribuna

Aplicación web para seguir al **Real Madrid**, el **FC Barcelona** y el
**Atlético de Madrid** en todas las competiciones: dashboard, plantilla con
estadísticas, calendario y partidos en directo. Estética inspirada en las Human
Interface Guidelines de Apple: superficies translúcidas, Segmented Control para
cambiar de club y sheets para el detalle.

Next.js 16 (App Router) · Tailwind CSS v4 · Framer Motion · Recharts ·
Supabase (Postgres + Realtime) · API-Football · Vercel.

```bash
cd apps/tribuna
npm install
npm run dev        # http://localhost:3000
```

Sin variables de entorno la app arranca en **modo demo** con datos de ejemplo
generados localmente (resultados y estadísticas inventados); una píldora en la
cabecera lo indica. En cuanto se configura Supabase se usan los datos reales.

---

## 1. Estructura del proyecto

```
apps/tribuna/
├── supabase/migrations/
│   ├── 0001_schema.sql           tablas, RLS, Realtime, reserve_api_call()
│   └── 0002_cron_optional.sql    polling en directo con pg_cron (plan Hobby de Vercel)
├── vercel.json                   cron jobs de Vercel
└── src/
    ├── app/
    │   ├── layout.tsx            layout raíz: fuente + AppHeader (fuera de /[team])
    │   ├── page.tsx              → /real-madrid
    │   ├── [team]/               real-madrid | barcelona | atletico (SSG + ISR)
    │   │   ├── layout.tsx        data-team="…" → colores del club
    │   │   ├── page.tsx          Team Hub: partido destacado, forma, clasificación, goleadores
    │   │   ├── plantilla/        plantilla por demarcación + sheet del jugador
    │   │   └── partidos/         calendario con filtro y [id] detalle del partido
    │   └── api/cron/
    │       ├── sync/route.ts     sincronización diaria (calendario, clasificación, plantillas, stats)
    │       └── live/route.ts     polling en directo (solo si hay partido)
    ├── components/
    │   ├── header/               AppHeader · TeamSwitcher · NavTabs/TabBar
    │   ├── matches/              MatchWidget · MatchCard · FixturesList · MatchDetail
    │   │                         Lineups · EventsTimeline · StatComparison · Countdown
    │   ├── players/              PlayerCard · PlayerPhoto · PlayerSheet · RosterGrid
    │   ├── charts/               StatsChart (forma) · AttributeRadar
    │   ├── standings/            StandingsTable
    │   └── ui/                   Card · Sheet · TeamCrest · OutcomeBadge · LiveDot
    ├── hooks/useLiveMatches.ts   suscripción a Supabase Realtime
    └── lib/
        ├── teams.ts              los tres clubes (IDs de la API) y competiciones
        ├── types.ts · match.ts   tipos de dominio y estados de partido
        ├── api-football/         cliente HTTP con presupuesto diario + tipos
        ├── sync/                 mapeadores API → Postgres y trabajos de sincronización
        ├── data/                 capa de lectura (repository) · filas de BD · demo
        └── supabase/             clientes público (anon) y admin (service_role)
```

### Flujo de datos

```
API-Football ──(cron, service_role)──▶ Supabase Postgres ──(anon, RLS)──▶ Server Components (ISR)
                                              │
                                              └──(Realtime, WebSocket)──▶ useLiveMatches() en el navegador
```

Las páginas **nunca** llaman a API-Football: leen de Supabase. El número de
peticiones no depende del número de visitantes.

---

## 2. Base de datos (Supabase)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. **SQL Editor** → pega y ejecuta `supabase/migrations/0001_schema.sql`.
   Con la CLI: `supabase link` + `supabase db push`.

| Tabla           | Contenido                                                      |
|-----------------|----------------------------------------------------------------|
| `teams`         | los tres clubes seguidos (semilla) + metadatos                 |
| `competitions`  | LaLiga, Champions, Copa del Rey… (upsert al sincronizar)       |
| `players`       | plantilla: dorsal, posición, nacionalidad, foto; `is_active`   |
| `matches`       | partidos + `events`, `lineups`, `statistics` en `jsonb`        |
| `player_stats`  | estadísticas por jugador · temporada · competición             |
| `standings`     | clasificación por competición/grupo                            |
| `api_usage`     | peticiones a la API por día (presupuesto)                      |
| `sync_state`    | estado de los cron (última consulta en directo)                |

- **RLS**: lectura pública en las tablas de datos; escritura solo con `service_role`.
- **Realtime**: `matches` se añade a la publicación `supabase_realtime`.
- En `matches` los nombres y escudos de ambos equipos van desnormalizados: el
  payload de Realtime basta para pintar el marcador sin otra consulta.

---

## 3. Cliente de API y estrategia de caché

### Presupuesto de peticiones (plan gratuito: 100/día)

`apiFootball()` (`src/lib/api-football/client.ts`) llama a la función de Postgres
`reserve_api_call()` **antes** de cada petición. La función suma uno al contador
del día de forma atómica y se niega cuando se alcanza `API_FOOTBALL_DAILY_BUDGET`
(95 por defecto). Dos cron en paralelo no pueden superar el tope.

| Trabajo (cron diario) | Endpoint                         | Peticiones   |
|-----------------------|----------------------------------|--------------|
| `fixtures`            | `/fixtures?team&season` ×3       | 3            |
| `standings`           | `/standings?league&season` ×2    | 2            |
| `details`             | `/fixtures?ids=a-b-c…` (≤20)     | 0–1          |
| `squads`              | `/players/squads?team` ×3        | 3            |
| `stats`               | `/players?team&season&page`      | ~8           |
| **Total**             |                                  | **≈ 17/día** |

Quedan ~78 para los directos: a una petición cada 150 s, un partido (~2 h con el
descanso consultado cada 5 min) cuesta ~45. Caben dos partidos el mismo día; si
coinciden en hora, **una sola petición** cubre ambos.

Se pueden lanzar trabajos sueltos: `GET /api/cron/sync?only=fixtures,standings`.

### Partidos en directo

`GET /api/cron/live` (`pollLive()` en `src/lib/sync/jobs.ts`):

1. Busca en Supabase un partido de los tres clubes en juego o a punto de empezar.
   **Si no hay ninguno, responde sin llamar a la API.**
2. Mira `sync_state.live.lastPollAt`: consulta como mucho cada
   `LIVE_POLL_INTERVAL_SECONDS` (150 s; 5 min durante el descanso).
3. Pide los partidos activos y hace upsert de marcador, minuto, eventos,
   alineaciones y estadísticas en `matches`.
4. Postgres emite el cambio → Supabase Realtime → `useLiveMatches()` actualiza el
   `MatchWidget`, el calendario y el detalle sin recargar, y anima el marcador.
5. Al pitido final refresca la clasificación y regenera las páginas ISR
   (`revalidatePath`).

Por defecto usa `/fixtures?ids=…` en lugar de `/fixtures?live=all`: sigue siendo
una petición, pero devuelve eventos, alineaciones y estadísticas solo de
nuestros partidos, mientras que `live=all` trae todos los partidos del mundo y
sin estadísticas. Si prefieres `live=all`, pon `LIVE_SOURCE=live-all`; en ese
modo, un partido que desaparece de la lista en vivo se cierra con una petición
`ids=` adicional para guardar el resultado final.

### ISR

| Ruta                          | `revalidate` |
|-------------------------------|--------------|
| `/[team]`                     | 300 s        |
| `/[team]/partidos`            | 300 s        |
| `/[team]/plantilla`           | 3600 s       |
| `/[team]/partidos/[id]`       | 60 s         |

Además, los cron llaman a `revalidatePath('/', 'layout')` tras escribir, así que
los datos nuevos aparecen sin esperar a la ventana. El filtro por competición del
calendario se aplica en el cliente para que la página siga siendo estática.

---

## 4. Componentes de UI

- **`TeamSwitcher`**: Segmented Control al estilo iOS. Vive en el layout raíz (no
  en `/[team]`), así que no se desmonta y su *thumb* se desliza con un spring de
  `layoutId`. Se mueve al tocar (estado optimista) y navega dentro de un
  `startTransition`. Conserva la sección (`/real-madrid/plantilla →
  /barcelona/plantilla`), precarga los otros dos clubes y admite flechas del
  teclado.
- **Colores del club**: `data-team` define `--team-accent`, `--team-accent-2` y
  `--team-glow`. Están registradas con `@property`, de modo que al cambiar de
  club los colores se funden en 500 ms. Cada pareja tiene variante clara y
  oscura, comprobadas para daltonismo y contraste.
- **`PlayerCard` / `PlayerPhoto` / `PlayerSheet`**: la foto viene de
  `media.api-sports.io`; si falta o falla, se muestra un avatar con iniciales
  sobre un degradado del club. Al tocar se abre un Apple Sheet (sube desde
  abajo en móvil, se arrastra para cerrar, Esc) con fichas de estadísticas,
  filtro por competición, radar de atributos y barras de ratios.
- **`MatchWidget`**: cambia según el estado. Antes del partido, cuenta atrás; en
  directo, marcador con Realtime y minuto; después, resultado final con
  victoria/empate/derrota y goleadores.
- **`StatsChart`**: racha V/E/D (letra + color), totales y gráfico de barras de
  Recharts con goles a favor/en contra por partido, leyenda y tooltip.
- **`MatchDetail`**: marcador + pestañas: cronología de eventos, campo con los
  titulares colocados por formación (`grid` de la API) con foto, y barras
  comparativas de estadísticas.

> API-Football no ofrece **mapas de calor** de jugadores. El radar del sheet
> resume el perfil con métricas por 90 minutos que la API sí da (goles, tiros a
> puerta, pases clave, regates, recuperaciones, precisión de pase; en porteros:
> paradas y goles encajados).

---

## 5. Configuración y despliegue

### Variables de entorno

Copia `.env.example` a `.env.local`:

| Variable                          | Dónde                       | Notas                                 |
|-----------------------------------|-----------------------------|---------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`        | Supabase → Settings → API   | pública                               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Supabase → Settings → API   | pública, solo lectura vía RLS         |
| `SUPABASE_SERVICE_ROLE_KEY`       | Supabase → Settings → API   | **solo servidor**                     |
| `API_FOOTBALL_PROVIDER`           | —                           | `apisports` o `rapidapi`              |
| `API_FOOTBALL_KEY`                | dashboard.api-football.com / RapidAPI |                             |
| `API_FOOTBALL_SEASON`             | —                           | `2026` = temporada 2026/27            |
| `API_FOOTBALL_DAILY_BUDGET`       | —                           | 95 por defecto                        |
| `API_FOOTBALL_STANDINGS_LEAGUES`  | —                           | `140,2` (LaLiga, Champions)           |
| `LIVE_POLL_INTERVAL_SECONDS`      | —                           | 150 por defecto                       |
| `LIVE_SOURCE`                     | —                           | opcional: `live-all`                  |
| `CRON_SECRET`                     | `openssl rand -hex 32`      | Vercel lo envía en cada cron          |

> **Comprueba las temporadas de tu plan.** El plan gratuito de API-Football ha
> limitado históricamente qué temporadas se pueden consultar. Si `/fixtures`
> devuelve un error de plan, la respuesta del cron lo muestra
> (`results[].error`). Revisa en tu dashboard qué temporadas cubre tu clave y
> ajusta `API_FOOTBALL_SEASON`.

### Primera carga

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync
```

Devuelve el resultado de cada trabajo y el presupuesto restante. La primera
ejecución lo rellena todo; `details` trae hasta 20 partidos jugados por
ejecución y completa el histórico en los días siguientes.

### Vercel

1. **Add New → Project** → importa el repositorio.
2. **Root Directory**: `apps/tribuna` (el repo también contiene el portfolio).
   Framework preset: Next.js.
3. **Settings → Environment Variables**: las variables de arriba (Production y
   Preview).
4. Despliega. `vercel.json` registra dos cron:
   - `/api/cron/sync` cada día a las 05:15 UTC.
   - `/api/cron/live` cada 2 minutos.

**Plan Hobby**: Vercel solo permite cron diarios, así que el de 2 minutos no se
ejecutará. Programa el directo desde Supabase: ejecuta
`supabase/migrations/0002_cron_optional.sql` (activa antes `pg_cron` y `pg_net`
y sustituye el dominio y el `CRON_SECRET`). El endpoint no gasta peticiones si
no hay partido, así que llamarlo cada 2 minutos todo el día es seguro. En el
plan **Pro**, `vercel.json` funciona tal cual.

### Comprobaciones

```bash
npm run typecheck
npm run build
curl -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/cron/live
# → {"polled":false,"reason":"sin partidos activos",...}
```
