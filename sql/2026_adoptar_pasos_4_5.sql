-- "Lo que debes saber antes de adoptar" (/purina-adopta/lo-que-debes-saber-antes-de-adoptar):
-- los pasos 4 y 5 pasan a ser el 50/50 que estan en el CMS. Ya aplicado.
--
-- Respaldo previo: page_components_backup_adoptar.
--
-- En el CMS esos dos pasos NO son un carrusel de cards: son un `layout_columns_2` con un
-- `c_image` en cada columna, con `Image position: Image Bottom` y `Text Align: Center` —
-- o sea titulo y descripcion arriba y la imagen abajo, uno al lado del otro. En la app
-- estaban como un `card_grid` en `slider-default-card`, que es un carrusel: mismo texto,
-- otra estructura.
--
-- El layout y el `c_image` del Paso 4 YA existian (quedaron a mano al final de la pagina,
-- sin Classy cargado). No se recrean: se completan y se mueven al lugar del carrusel.
--
-- Lo que NO se toca: los pasos 1, 2 y 3 y el cierre. Dos de ellos son `text_image`, que
-- esta deprecated — en el CMS no existe ese paragraph — pero rearmarlos es otro trabajo y
-- hace falta ver como estan realmente armados del otro lado.

create table if not exists page_components_backup_adoptar as
select id, page_id, component_key, content, parent_id, tab_index, sort_order, now() as backed_up_at
from page_components where page_id = '9986c2e7-a031-4c1c-a09d-729c03b3da97';

-- 1) Paso 4: se le carga el Classy que falta y se limpia el zero-width space (U+200B)
--    que arrastro el copy/paste al final del cuerpo.
update page_components
set content = content
  || jsonb_build_object(
       'title_tag',      'h3',
       'body',           replace(content->>'body', E'​', ''),
       'image_position', 'image_bottom',
       'text_align',     'text_align_center')
where id = '07efce50-8aec-47de-a0e4-0fb51eac91ed';

-- 2) Paso 5: la segunda columna. El texto es el mismo que tenia la card del carrusel,
--    con el titulo puntuado como el del Paso 4 (dos puntos, no guion).
insert into page_components (page_id, component_key, parent_id, tab_index, sort_order, content)
values (
  '9986c2e7-a031-4c1c-a09d-729c03b3da97', 'content_image',
  '6aa39ccc-69ca-4fd1-903a-3ebc14a974b8', 1, 2,
  jsonb_build_object(
    'title',          'Paso 5: Llévalo al veterinario',
    'title_tag',      'h3',
    'body',           'Es importante que lo revise un especialista para llevar el control de sus vacunas y/o esterilizarlo.',
    'image_position', 'image_bottom',
    'text_align',     'text_align_center'));

-- 3) El layout ocupa el lugar del carrusel viejo, que se cae.
update page_components set sort_order = 6
where id = '6aa39ccc-69ca-4fd1-903a-3ebc14a974b8';

delete from page_components where id = '59904374-5f29-4ae2-9a7a-6be09010a0b0';

-- 4) Y se cae tambien el `c_image` suelto y VACIO que habia quedado al final (content = {}).
delete from page_components where id = 'beb9af99-9f96-404d-aa38-7df1dbcf6218';
