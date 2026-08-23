-- Rich text en los cuerpos, Banner con los valores de maquina del CMS, y los
-- "Texto + Imagen" de Purina Adopta convertidos a bloques de Texto. Ya aplicado.
--
-- Respaldos previos: page_components_backup_banner y page_components_backup_adopta_ti.

-- =================================================================================
-- 1) BANNER -> valores de MAQUINA del CMS
-- El `field_banner_type` guarda un valor que no siempre se parece a su etiqueta:
-- "Secondary Hero" es `title-description` y "Banner Card" es `banner-menu`. Idem el
-- Banner Align Content. Ademas `field_c_link` es multivaluado, asi que el boton unico
-- (link_text/link_url) pasa a la lista `ctas`, igual que en el bloque de Texto.
-- =================================================================================

create table if not exists page_components_backup_banner as
select id, page_id, component_key, content, now() as backed_up_at
from page_components where component_key = 'banner';

update page_components
set content = jsonb_strip_nulls(
  (content - 'link_text' - 'link_url')
  || jsonb_build_object(
    'type', case content->>'type'
        when 'Main Hero' then 'main_hero'
        when 'Secondary Hero' then 'title-description'
        when 'Promotional banner (Only image)' then 'only-image'
        when 'Full Image + Box Content' then 'full-image-box-content'
        when 'Brand Hero' then 'brand_hero'
        else content->>'type' end,
    'banner_align', case content->>'banner_align'
        when 'Banner Center Bottom' then 'banner_center_bottom'
        when 'Banner Center Center' then 'banner_center_center'
        when 'Banner Center Top' then 'banner_center_top'
        when 'Banner Left Bottom' then 'banner_left_bottom'
        when 'Banner Left Bottom (Mobile) Center (Desktop)' then 'banner_left_bottom_mobile_center_desktop'
        when 'Banner Left Center' then 'banner_left_center'
        when 'Banner Left Top' then 'banner_left_top'
        when 'Banner Right Bottom' then 'banner_right_bottom'
        when 'Banner Right Center' then 'banner_right_center'
        when 'Banner Right Top' then 'banner_right_top'
        -- "Por defecto" era una opcion nuestra; en el CMS el default es el vacio.
        when 'Por defecto' then null
        else content->>'banner_align' end,
    'ctas', case when coalesce(content->>'link_text','') <> '' or coalesce(content->>'link_url','') <> ''
      then jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
             'label', nullif(content->>'link_text',''),
             'url', nullif(content->>'link_url','')))) end
  ))
where component_key = 'banner';

-- =================================================================================
-- 2) Purina Adopta: los tres "Texto + Imagen" -> bloques de Texto
-- En el CMS esa pagina no tiene ni un solo `c_sideimagetext`: los tres son `c_text`
-- con CTA. Se toman los estilos de Classy tal cual los tiene el CMS en esos bloques
-- (fondo Primary Red, texto Primary White, centrado, boton Secondary). La imagen y su
-- posicion se pierden a proposito: el `c_text` no las tiene.
-- =================================================================================

create table if not exists page_components_backup_adopta_ti as
select id, page_id, component_key, content, sort_order, now() as backed_up_at
from page_components
where page_id = '4e336e9d-460f-465d-babc-fb1e8e3cb5e9' and component_key = 'text_image';

update page_components
set component_key = 'text',
    content = jsonb_strip_nulls(jsonb_build_object(
      'title',     nullif(content->>'title',''),
      'title_tag', nullif(content->>'title_tag',''),
      'body',      nullif(content->>'body',''),
      'ctas', case when coalesce(content->>'cta_label','') <> '' or coalesce(content->>'cta_url','') <> ''
        then jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
               'label', nullif(content->>'cta_label',''),
               'url',   nullif(content->>'cta_url','')))) end,
      'background_color', 'Primary Red',
      'text_color',       'Primary White',
      'text_align',       'text_align_center',
      'style_button',     'style_btn_secondary'
    ))
where page_id = '4e336e9d-460f-465d-babc-fb1e8e3cb5e9' and component_key = 'text_image';

-- OJO: despues de esto, los bloques de sort_order 13 y 14 quedan con el MISMO
-- contenido ("Si tienes un refugio, contáctanos"). Es el duplicado ya reportado: el
-- CMS tiene uno solo. No se borra ninguno sin confirmarlo.

-- =================================================================================
-- 3) RICH TEXT: no necesita migracion
-- El formato se marca con una notacion tipo markdown DENTRO del mismo texto
-- (**negrita**, _cursiva_, [texto](link), "- " lista), asi que el contenido que ya
-- estaba sigue siendo valido: lo que cambia es como se RENDERIZA. Los saltos de linea
-- y las listas que ya venian escritas con "* " o "1. " ahora se dibujan de verdad.
-- =================================================================================
