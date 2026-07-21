-- ============================================================================
-- Web Manager Hub — setup para: Purina Región/Mercado + feriados de Panamá
-- Correr UNA vez en el SQL Editor de Supabase (proyecto Purina-Hub).
-- Es idempotente: se puede correr de nuevo sin duplicar nada.
-- ============================================================================

-- 1) Columna para elegir el calendario de feriados de "Purina Región" por
--    proyecto (varía según el mercado que coordine la región).
alter table public.projects
  add column if not exists region_country text;

-- 2) Dividir Purina en dos partners:
--    - "Purina Mercado": usa el market del proyecto (comportamiento actual).
--    - "Purina Región": usa projects.region_country (elegible por proyecto).
--    Ambos con country NULL (el país sale del proyecto) y rojo de marca.
--    La app distingue "Región" por el nombre (debe contener "Región").

-- Renombra el Purina existente a "Purina Mercado" (conserva sus tareas).
update public.partners
   set name = 'Purina Mercado'
 where lower(name) = 'purina';

-- Crea "Purina Región" si todavía no existe.
insert into public.partners (name, color, country)
select 'Purina Región', '#ED1C24', null
 where not exists (
   select 1 from public.partners where name ilike '%purina%regi%'
 );

-- 3) Feriados 2026 de Panamá (código de calendario 'PA').
--    Best-effort; editables desde el modal Feriados. No duplica (unique country,date).
insert into public.holidays (country, date, name) values
  ('PA', '2026-01-01', 'Año Nuevo'),
  ('PA', '2026-01-09', 'Día de los Mártires'),
  ('PA', '2026-02-16', 'Lunes de Carnaval'),
  ('PA', '2026-02-17', 'Martes de Carnaval'),
  ('PA', '2026-04-03', 'Viernes Santo'),
  ('PA', '2026-05-01', 'Día del Trabajador'),
  ('PA', '2026-11-03', 'Separación de Panamá de Colombia'),
  ('PA', '2026-11-04', 'Día de los Símbolos Patrios'),
  ('PA', '2026-11-05', 'Día de Colón'),
  ('PA', '2026-11-10', 'Primer Grito de Independencia'),
  ('PA', '2026-11-28', 'Independencia de Panamá de España'),
  ('PA', '2026-12-08', 'Día de las Madres'),
  ('PA', '2026-12-20', 'Día de Duelo Nacional'),
  ('PA', '2026-12-25', 'Navidad')
on conflict (country, date) do nothing;
