-- Seguridad: las tablas de respaldo salen del esquema `public`. Ya aplicado.
--
-- EL PROBLEMA
-- Cada migracion de contenido dejo su copia de seguridad con `create table ... as
-- select ...`. Una tabla creada asi NO hereda nada de la original: nace con RLS
-- APAGADA. Y como vivia en `public`, PostgREST la publicaba: con la publishable key
-- (que va en el bundle del front, es de cliente) cualquiera podia leer, editar y
-- borrar esas nueve tablas. Es lo que reporto el linter como rls_disabled_in_public.
--
-- LA SOLUCION
-- No es ponerles una politica: estas tablas no las lee NADIE desde el cliente, son
-- copias de seguridad mias. Se mueven a un esquema `backups` que PostgREST no expone
-- (solo publica `public` y `graphql_public`), asi dejan de existir para la API. Ademas
-- se les prende RLS sin ninguna politica y se revocan los grants de anon/authenticated,
-- que es redundante a proposito: si algun dia alguien expone el esquema, siguen cerradas.
--
-- Desde el service role (SQL editor, MCP) se siguen leyendo igual, que es como se usan.
--
-- DE ACA EN ADELANTE: toda tabla de respaldo va en `backups`, nunca en `public`.
--   create table backups.page_components_backup_<lo_que_sea> as select ...

create schema if not exists backups;

-- El esquema es solo para el service role: no se le da USAGE a los roles del cliente.
revoke all on schema backups from anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'page_components_backup_5050',
    'page_components_backup_adopta_ti',
    'page_components_backup_adoptar',
    'page_components_backup_adoptar_paso1',
    'page_components_backup_banner',
    'page_components_backup_banner_slides',
    'page_components_backup_cardgrid',
    'page_components_backup_ctext',
    'page_components_backup_refugios'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('revoke all on public.%I from anon, authenticated', t);
      execute format('alter table public.%I set schema backups', t);
      execute format('alter table backups.%I enable row level security', t);
    end if;
  end loop;
end $$;
