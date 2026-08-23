-- "Cómo apoyamos a refugios" (/purina-adopta/como-apoyamos-refugios) rearmada con los
-- componentes que quedaron despues de espejar el CMS. Ya aplicado.
--
-- Respaldo previo: page_components_backup_refugios.
--
-- Tres bloques estaban armados con componentes que hoy no corresponden:
--
-- 1) DOS `brand_cards` ("¿Cómo lo hacemos posible?" y "Conoce a los refugios aliados").
--    El carrusel de marcas es para MARCAS: sus cards son imagen de marca + pie, con los
--    iconos perro/gato. Para cards normales el componente del CMS es `card_grid`, que es
--    justamente de donde salen todas las variantes de cards. Cambia el `view_mode`, no
--    el componente.
--      - Los pasos van en `cards-numbers`: cards blancas sin imagen con el numero en un
--        chip. El numero NO es un campo, sale del ORDEN — por eso se le saca el "1. ",
--        "2. ", "3. " que estaba escrito a mano en el titulo.
--      - Los refugios van en `slider-default-card` (cards verticales): imagen a sangre,
--        titulo y texto abajo.
--    Se cae `pets: "Sin iconos"`, que existia solo para poder usar el carrusel de marcas
--    para algo que no era una marca.
--
-- 2) Un `text_image` (deprecated). En el CMS esa seccion no es un `c_sideimagetext`: es
--    un `c_text` con CTA y fondo, igual que los tres de Purina Adopta. Se le ponen los
--    mismos estilos de Classy (fondo Primary Red, texto Primary White, centrado, boton
--    Secondary), que ahora ademas se dibuja full bleed como en el sitio.
--
-- Los datos de los refugios pasan a usar RICH TEXT: los " - " que separaban ubicacion,
-- contacto y redes eran un parche de cuando el campo no tenia saltos de linea. Ahora van
-- en renglones con la etiqueta en negrita. Es la MISMA informacion.

create table if not exists page_components_backup_refugios as
select id, page_id, component_key, content, sort_order, now() as backed_up_at
from page_components where page_id = 'ecbd0bb3-83d6-413a-befc-2ab7439fac31';

-- 1a) Los pasos -> Card Grid numerado.
update page_components
set component_key = 'card_grid',
    content = jsonb_build_object(
      'view_mode', 'cards-numbers',
      'title',     '¿Cómo lo hacemos posible?',
      'title_tag', 'h2',
      'items', jsonb_build_array(
        jsonb_build_object('title', 'Creamos alianzas',
          'description', 'Nos aliamos con refugios para ayudar a más perros y gatos en búsqueda de un hogar responsable.'),
        jsonb_build_object('title', 'Donamos alimento',
          'description', 'Nos aseguramos que reciban una nutrición adecuada mientras esperan una familia.'),
        jsonb_build_object('title', 'Difundimos mascotas en adopción',
          'description', 'Damos visibilidad a las mascotas para ayudarlas a conectar con su futuro hogar.')
      ))
where id = 'aa1cc4ad-5d06-4901-99d1-6e4ebe32c5b5';

-- 1b) Los refugios aliados -> Card Grid de cards verticales.
update page_components
set component_key = 'card_grid',
    content = jsonb_build_object(
      'view_mode', 'slider-default-card',
      'title',     'Conoce a los refugios aliados',
      'title_tag', 'h2',
      'items', jsonb_build_array(
        jsonb_build_object('title', 'Patitas Callejeras',
          'description', E'**Ubicación:** Monterrey\n**Contacto:** 81 2572 8347\nFacebook | Instagram'),
        jsonb_build_object('title', 'Funkytown',
          'description', E'**Ubicación:** Puebla\n**Contacto:** 55 5953 7777\nFacebook | Instagram'),
        jsonb_build_object('title', 'Tierra de animales',
          'description', E'**Ubicación:** Quintana Roo\n**Contacto:** 998 1570 772\nFacebook | Instagram')
      ))
where id = 'b2b49483-72bb-43d3-8313-edd7378f9551';

-- 2) El cierre -> bloque de Texto con CTA, mismos estilos que los de Purina Adopta.
update page_components
set component_key = 'text',
    content = jsonb_build_object(
      'title',     'Si tienes un refugio, contáctanos para ayudar a más perros y gatos sin hogar.',
      'title_tag', 'h2',
      'ctas', jsonb_build_array(jsonb_build_object('label', 'Postúlate aquí')),
      'background_color', 'Primary Red',
      'text_color',       'Primary White',
      'text_align',       'text_align_center',
      'style_button',     'style_btn_secondary'
    )
where id = '5af56523-0dfa-46d3-8281-434ee23dd449';

-- PENDIENTE, no se toca sin confirmarlo: el Card Grid de las estadisticas
-- ("Juntos, hacemos la diferencia cada día") esta en `grid-cards`, que es el mosaico
-- que alterna imagen y caja de contenido — y el bloque no tiene ni una imagen cargada.
-- El componente ya es el correcto; lo que habria que revisar es el modo de vista.
