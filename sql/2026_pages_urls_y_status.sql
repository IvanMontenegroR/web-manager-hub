-- Paginas: enlaces de referencia + estados nuevos del proceso.
--
-- 1) Cuatro links por pagina: el sitio VIEJO (el que se migra), el sitio NUEVO (donde
--    queda publicada), el COPYDECK y el FIGMA. Son columnas opcionales:
--    `pagesDb.withOptionalCols` tolera que no existan todavia (guarda la pagina sin
--    ellas), asi que correr esto es lo que las activa. La CONTRASEÑA del Figma no se
--    guarda: cambia por vuelta de diseño y se completa en el Excel.
-- 2) Estados: se agregan `Filling Copydeck`, `Scheduled` y `QA MRM` entre los que ya
--    habia. NO hace falta migrar datos: `status` es texto libre en la DB y los valores
--    viejos ('Not started', 'In progress', 'On hold', 'Done') siguen siendo validos.

alter table public.pages add column if not exists url_old text;
alter table public.pages add column if not exists url_new text;
alter table public.pages add column if not exists url_copydeck text;
alter table public.pages add column if not exists url_figma text;
