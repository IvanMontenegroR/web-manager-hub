-- Paginas: enlaces de referencia + estados nuevos del proceso.
--
-- 1) Cuatro links por pagina: el sitio VIEJO (el que se migra), el sitio NUEVO (donde
--    queda publicada), el COPYDECK y el FIGMA. Son columnas opcionales:
--    `pagesDb.withOptionalCols` tolera que no existan todavia (guarda la pagina sin
--    ellas), asi que correr esto es lo que las activa. La CONTRASEÑA del Figma no se
--    guarda: cambia por vuelta de diseño y se completa en el Excel.
-- 2) Estados: quedan seis — Not started, Filling Matrix, In progress, On hold,
--    Complete (outliers), Done (ver `PAGE_STATUSES`). `status` es texto libre en la
--    DB, asi que la lista no es una constraint: el UPDATE de abajo esta por si alguna
--    fila quedo con un valor de las vueltas anteriores (cuando el estado se llamaba
--    "Filling Copydeck" / "Missing links", o existian "Scheduled" y "QA MRM").
--    Al correrlo la primera vez las 9 paginas estaban todas en 'Not started', asi que
--    no toco ninguna.

alter table public.pages add column if not exists url_old text;
alter table public.pages add column if not exists url_new text;
alter table public.pages add column if not exists url_copydeck text;
alter table public.pages add column if not exists url_figma text;

update public.pages set status = case status
    when 'Filling Copydeck' then 'Filling Matrix'
    when 'Missing links'    then 'Complete (outliers)'
    -- Los dos que se sacaron vuelven al estado anterior del proceso: agendada todavia
    -- no arranco, y QA ya esta armada.
    when 'Scheduled'        then 'Not started'
    when 'QA MRM'           then 'In progress'
  end
where status in ('Filling Copydeck', 'Missing links', 'Scheduled', 'QA MRM');
