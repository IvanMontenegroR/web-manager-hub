-- Tarea EXTRA: no estaba en el plan original, se agrego porque aparecio trabajo que no
-- estaba previsto (tipicamente una vuelta adicional de feedback). Se marca en el Gantt
-- (icono + chip EXTRA) y en el Excel (prefijo ➕ + nombre en negrita + entrada en
-- Referencias) para que quede a la vista que el proyecto se corrio por algo no planificado.
-- Ya aplicado en Purina-Hub (migracion `tasks_is_extra`).

alter table public.tasks add column if not exists is_extra boolean not null default false;
