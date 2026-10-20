-- OPCIONAL · Programar el polling en directo desde Supabase.
--
-- El plan Hobby de Vercel solo admite cron diarios, así que "*/2 * * * *" en
-- vercel.json no se ejecutará. Con pg_cron + pg_net (gratis en Supabase) la
-- base de datos llama al endpoint cada 2 minutos. El endpoint no gasta
-- ninguna petición de API-Football si el equipo no está jugando.
--
-- Antes de ejecutarlo: Database → Extensions → activa pg_cron y pg_net, y
-- sustituye <TU_DOMINIO> y <CRON_SECRET>.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('tribuna-live') where exists (select 1 from cron.job where jobname = 'tribuna-live');

select cron.schedule(
  'tribuna-live',
  '*/2 * * * *',
  $$
  select net.http_get(
    url     := 'https://<TU_DOMINIO>/api/cron/live',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
  );
  $$
);
