-- Se elimina el campo "Problema / situacion" (issue) del Kanban de Tareas: se solapaba
-- con las notas, y la NOTA es el campo que baja al resumen del 1:1. El contenido que ya
-- existia se pasa a `notes` para no perderlo (el issue va primero y la nota debajo,
-- separados por una linea en blanco).
-- La columna `issue` se deja en la tabla como respaldo, pero la app ya no la escribe.
-- Ya aplicado en Purina-Hub (migracion `ecosystem_tasks_merge_issue_into_notes`).

update public.ecosystem_tasks
set notes = case
  when notes is null or notes = '' then issue
  else issue || E'\n\n' || notes
end
where issue is not null and issue <> '';

update public.ecosystem_tasks set issue = null;

-- Segundo paso: tambien se elimina "Accion a tomar" (action). Una tarjeta queda con
-- TEMA + NOTA y nada mas. La accion era lo que bajaba al resumen del 1:1, asi que va
-- ARRIBA de la nota (primero que hacer, despues el contexto).
-- (migracion `ecosystem_tasks_merge_action_into_notes`)
update public.ecosystem_tasks
set notes = case
  when notes is null or notes = '' then action
  else action || E'\n\n' || notes
end
where action is not null and action <> '';

update public.ecosystem_tasks set action = null;
