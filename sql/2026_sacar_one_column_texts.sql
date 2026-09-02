-- "Content Text Styles: One Column Texts" se saca de todos los bloques de texto.
-- Ya aplicado (5 bloques: 2 en "Lo que debes saber" y 3 en "Tenencia Responsable").
--
-- No cambia NADA: en el CMS el Default de ese select ya es una sola columna, y el
-- preview solo reacciona a las variantes de DOS columnas
-- (`/two_columns/.test(content_text_styles)` en ComponentPreview). Cargarlo explicito
-- solo le pedia al editor que fuera a elegir un valor que no hace diferencia, y en la
-- hoja CMS aparecia como si fuera una decision de diseño.
--
-- Vacio = Default, que es lo que corresponde. Los que SI cambian algo
-- (`two_columns_texts`, `two_columns_expansive_space_texts`) se siguen cargando.
update public.page_components
set content = content - 'content_text_styles'
where content->>'content_text_styles' = 'one_column_texts';
