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

-- 1b) Los refugios aliados -> Card Grid de cards verticales, con los DIEZ del sitio.
-- El texto va en rich text: los " - " que separaban ubicacion, contacto y redes eran un
-- parche de cuando el campo no tenia saltos de linea.
-- OJO: "Fundación Más por México" tiene SOLO Facebook, no Instagram — asi esta en el
-- sitio. Los telefonos van tal cual estan publicados, con el formato disparejo incluido
-- (Rescate Pitbull sin espacios, Corazón Animal con la lada entre parentesis).
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
          'description', E'**Ubicación:** Quintana Roo\n**Contacto:** 998 1570 772\nFacebook | Instagram'),
        jsonb_build_object('title', 'Adopta un amigo para siempre',
          'description', E'**Ubicación:** Estado de México\n**Contacto:** 55 6149 1850\nFacebook | Instagram'),
        jsonb_build_object('title', 'Fundación Más por México',
          'description', E'**Ubicación:** Estado de México\n**Contacto:** 55 4983 0142\nFacebook'),
        jsonb_build_object('title', 'Asociación Pocas Pulgas',
          'description', E'**Ubicación:** Metepec\n**Contacto:** 722 2534 473\nFacebook | Instagram'),
        jsonb_build_object('title', 'Rescate Pitbull',
          'description', E'**Ubicación:** Ciudad de México\n**Contacto:** 5555009125\nFacebook | Instagram'),
        jsonb_build_object('title', 'Fundación Santuario Corazón Animal',
          'description', E'**Ubicación:** Guanajuato\n**Contacto:** (473) 141 6880\nFacebook | Instagram'),
        jsonb_build_object('title', 'Refugio Franciscano A.C.',
          'description', E'**Ubicación:** Ciudad de México\n**Contacto:** 55 3986 5475\nFacebook | Instagram'),
        jsonb_build_object('title', 'CRESCA',
          'description', E'**Ubicación:** Baja California Sur\n**Contacto:** 615 155 8614\nFacebook | Instagram')
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

-- 3) Las estadisticas ("Juntos, hacemos la diferencia cada día") salen de `grid-cards`.
-- Ese modo es el mosaico que alterna imagen y caja de contenido, y el bloque no tiene
-- ni una imagen: quedaban tres placeholders vacios. Pasa a `slider-card-icons-square`
-- (Card Icon Square): banda de color a lo ancho con cards cuadradas de icono + titulo
-- + descripcion, sin una sola imagen. La cifra es el titulo de la card.
--
-- Los pasos se quedan en `cards-numbers` — ahi el chip 1/2/3 que sale del ORDEN es lo
-- correcto, son una secuencia — y asi ademas los dos bloques dejan de verse iguales.
--
-- Quedan dos cosas para cargar: el ICONO de cada card (sin elegir el mockup dibuja la
-- pata, que es la señal de que falta) y el Background Color de la banda, que por
-- defecto NO se pinta.
--
-- Y con las cards de icono, que no piden imagen y entran en un carrusel, las
-- adopciones se abren AÑO POR AÑO, con los datos del sitio real: el titulo de la card
-- es el AÑO y el orden es del mas RECIENTE al mas viejo, que es como se leen.
--
-- Las dos cards de TOTALES van primero, como en el sitio: numero destacado arriba y la
-- bajada abajo ("+1,700,000 / de platos de alimento donados").
--
-- OJO con los numeros: +994 es EXACTAMENTE 231 + 398 + 365, asi que esa card es el
-- total de las tres de abajo. Los platos NO cierran: los dos años que los tienen suman
-- 2,493,686.39, no 1,700,000. Se deja lo que dice el sitio.
--
-- OJO: 2024 no trae platos donados. En el sitio esa card muestra la meta en su lugar,
-- asi que se respeta; si el dato existe, va como los otros dos años.
update page_components
set content = (content - 'view_mode')
  || jsonb_build_object('view_mode', 'slider-card-icons-square')
  || jsonb_build_object('items', jsonb_build_array(
    jsonb_build_object('title', '+1,700,000',
      'description', 'de platos de alimento donados'),
    jsonb_build_object('title', '+994 adopciones responsables',
      'description', 'de perros y gatos sin hogar'),
    jsonb_build_object('title', '2024', 'description',
      E'**365 adopciones**\n\n¡Nuestra meta es llegar a más de 470 adopciones!'),
    jsonb_build_object('title', '2023', 'description',
      E'**398 adopciones**\n\nPlatos de comida donados\n600,204.66 perros | 417,623.21 gatos'),
    jsonb_build_object('title', '2022', 'description',
      E'**231 adopciones**\n\nPlatos de comida donados\n1,205,707.40 perros | 270,151.12 gatos')
  ))
where id = '28d6a366-90bf-40a9-939f-340626ea309d';
