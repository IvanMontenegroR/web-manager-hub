-- El layout "imagen a sangre con la caja de contenido encima" YA NO es un Banner Type.
-- En el CMS se arma con el paragraph `c_image` (nuestro componente **Imagen**) y el
-- Classy Image position en "Image Background Box". Ya aplicado.
-- Respaldo: backups.page_components_backup_box_content.
--
-- El ejemplo vivo esta en /adopta: ese bloque ya era un `content_image`, solo le faltaba
-- el Image position.

create table if not exists backups.page_components_backup_box_content as
select id, page_id, component_key, content, parent_id, tab_index, sort_order, now() as backed_up_at
from public.page_components
where content->>'type' = 'full-image-box-content'
   or id = 'fbb97620-e4ab-4783-b27b-41191f968809';
alter table backups.page_components_backup_box_content enable row level security;

-- Los banners que usaban el tipo viejo pasan a Imagen. El `type` era del Banner y no
-- existe en `c_image`: se saca, no se traduce.
update public.page_components
set component_key = 'content_image',
    content = jsonb_set(content - 'type', '{image_position}', '"image_background_box"'::jsonb)
where content->>'type' = 'full-image-box-content';

update public.page_components
set content = jsonb_set(content, '{image_position}', '"image_background_box"'::jsonb)
where id = 'fbb97620-e4ab-4783-b27b-41191f968809';

-- Del lado de la app: "Full Image + Box Content" sale de BANNER_TYPES (que no se elija
-- algo que en el CMS ya no existe), su medida (2088×1044 desktop / 526×789 mobile) se
-- muda al `specsByType` del Imagen — resuelto por `image_position` — y el mockup de la
-- card frosted (.cp-fib) tambien.
