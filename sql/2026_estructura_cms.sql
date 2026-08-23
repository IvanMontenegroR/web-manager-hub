-- Alineacion ESTRUCTURAL del catalogo con el CMS. Ya aplicada.
--
-- Tres cosas, en este orden:
--   1) el bloque de Texto pasa a los campos reales de `c_text`
--   2) el 50/50 deja de ser un componente y se parte en los tres que existen en Drupal
--   3) verificacion
--
-- Respaldos previos: page_components_backup_ctext y page_components_backup_5050.
-- Se puede volver atras desde ahi.

-- =================================================================================
-- 1) TEXTO -> `c_text`
-- Lo visual sale ahora del panel Classy (los mismos nombres que usa el CMS) y el CTA
-- pasa a ser REPETIBLE, porque `field_c_link` es multivaluado en Drupal.
--   style      -> content_text_styles   (valores de maquina)
--   cta_style  -> style_button          ("Default" es el vacio, igual que el resto
--                                        de Classy: por eso no se guarda)
--   align      -> text_align            (no habia ninguno cargado, va por prolijidad)
--   cta_label + cta_url -> ctas[0]
-- =================================================================================

create table if not exists page_components_backup_ctext as
select id, page_id, component_key, content, now() as backed_up_at
from page_components where component_key = 'text';

update page_components
set content = jsonb_strip_nulls(
  (content - 'style' - 'cta_style' - 'cta_label' - 'cta_url' - 'align')
  || jsonb_build_object(
    'content_text_styles', case content->>'style'
        when 'Una columna' then 'one_column_texts'
        when 'Dos columnas' then 'two_columns_texts'
        when 'Dos columnas expansivo' then 'two_columns_expansive_space_texts' end,
    'style_button', case content->>'cta_style' when 'Secondary' then 'style_btn_secondary' end,
    'text_align', case content->>'align'
        when 'Centro' then 'text_align_center'
        when 'Derecha' then 'text_align_right'
        when 'Izquierda' then 'text_align_left' end,
    'ctas', case when coalesce(content->>'cta_label','') <> '' or coalesce(content->>'cta_url','') <> ''
      then jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
             'label', nullif(content->>'cta_label',''),
             'url', nullif(content->>'cta_url','')))) end
  ))
where component_key = 'text';

-- =================================================================================
-- 2) 50/50 -> `layout_columns_2` + `c_text` + `accordion_grid`
-- En el CMS esto nunca fue un componente: es un contenedor de dos columnas con un
-- texto en la primera y un acordeon (o mas texto) en la segunda. Cada 50/50 se
-- convierte en TRES filas: el contenedor se queda con el id original — asi no se
-- pierde su posicion en la pagina — y los dos hijos se crean apuntando a el.
-- =================================================================================

create table if not exists page_components_backup_5050 as
select id, page_id, component_key, content, parent_id, tab_index, sort_order, now() as backed_up_at
from page_components where component_key = 'fifty_fifty';

-- Primera columna: el titulo y el texto de la izquierda.
insert into page_components (page_id, component_key, parent_id, tab_index, sort_order, content)
select ff.page_id, 'text', ff.id, 0, 0,
       jsonb_strip_nulls(jsonb_build_object(
         'title', nullif(ff.content->>'title',''),
         'title_tag', nullif(ff.content->>'title_tag',''),
         'body', nullif(ff.content->>'text','')))
from page_components ff where ff.component_key = 'fifty_fifty';

-- Segunda columna: acordeon o texto, segun lo que tuviera cargado el bloque.
insert into page_components (page_id, component_key, parent_id, tab_index, sort_order, content)
select ff.page_id,
       case when ff.content->>'right_type' = 'Texto' then 'text' else 'accordion_grid' end,
       ff.id, 1, 0,
       case when ff.content->>'right_type' = 'Texto'
            then jsonb_strip_nulls(jsonb_build_object('body', nullif(ff.content->>'right_text','')))
            else jsonb_build_object('items', coalesce(ff.content->'items', '[]'::jsonb)) end
from page_components ff where ff.component_key = 'fifty_fifty';

-- El contenedor no tiene contenido propio: su contenido son los dos hijos.
update page_components set component_key = 'layout_columns_2', content = '{}'::jsonb
where component_key = 'fifty_fifty';

-- =================================================================================
-- 3) Verificacion: ningun 50/50 vivo, y cada contenedor con sus dos columnas.
-- =================================================================================

-- select count(*) from page_components where component_key = 'fifty_fifty';  -- 0
-- select parent_id, count(*) from page_components
--   where parent_id in (select id from page_components where component_key = 'layout_columns_2')
--   group by parent_id;  -- 2 por contenedor
