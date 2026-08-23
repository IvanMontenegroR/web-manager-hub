-- Banner Wrapper: el carrusel de banners es un paragraph CONTENEDOR del CMS, no un
-- campo del banner.
--
-- El banner tenia un campo `slides` (varias imagenes en el Promotional) que NUNCA
-- existio en el subform de Drupal: era una aproximacion nuestra. Confirmado con el
-- Websites Expert que en el CMS el carrusel se arma con el paragraph "Banner Wrapper",
-- que agrupa varios `banner` hijos, asi que `slides` se saca del catalogo y en su lugar
-- hay un contenedor `banner_wrapper` de un solo slot.
--
-- En la DB habia UNA sola fila con `slides` ("Lo que debes saber antes de adoptar"), con
-- un unico slide VACIO: no hay ningun carrusel armado que migrar, alcanza con sacar la
-- clave muerta para que no quede contenido que la app ya no lee.

create table if not exists page_components_backup_banner_slides as
select id, page_id, component_key, content, now() as backed_up_at
from page_components
where component_key = 'banner' and content ? 'slides';

update page_components
set content = content - 'slides'
where component_key = 'banner' and content ? 'slides';
