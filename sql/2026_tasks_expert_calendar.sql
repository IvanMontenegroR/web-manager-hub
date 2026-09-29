-- Tarea que ORGANIZA el Websites Expert (ej. el kick-off con un mercado): ademas del
-- calendario de su partner, la frenan los feriados del Expert (Paraguay, EXPERT_COUNTRY en
-- src/lib/countries.js). Es una marca POR TAREA y no una regla por tipo: si algo esta en
-- manos del mercado (su feedback), el feriado del Expert no cuenta para ellos.
-- Ya aplicado en Purina-Hub (migracion `tasks_expert_calendar`).

alter table public.tasks add column if not exists expert_calendar boolean not null default false;
