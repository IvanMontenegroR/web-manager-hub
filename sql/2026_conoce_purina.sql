-- "Conoce Purina" (/conoce-purina). PRIMERA pagina traducida del sitio viejo al
-- catalogo nuevo. Ya aplicada (sort_order 10, 5 bloques).
-- Vieja: https://purina.com.mx/purina/conoce-purina
--
-- COMO SE TRADUJO. La regla no fue "el componente mas parecido" sino dejar la pagina
-- nueva lo mejor posible:
--
--  1. HERO. El sitio viejo abre con DOS <h1> ("¿A ti te importa de donde viene su
--     alimento?" y "A nosotros tambien, por eso te contamos que es Purina®"). Se arma
--     como UN banner Secondary Hero: el primer titular es el h1 y el segundo pasa a ser
--     la bajada. Dos h1 en una pagina es un error de SEO que no hay razon para
--     arrastrar.
--
--     Va alineado Banner Left Center, y eso NO es decoracion: en la foto el perro esta a
--     la DERECHA, asi que el texto tiene que apoyarse a la izquierda para no taparlo. La
--     alineacion de un banner se decide MIRANDO la imagen.
--
--     La imagen del banner NO la tenemos: en el sitio viejo no es un <img>, es un
--     background-image dentro de un <style> en linea, y esta pagina se leyo antes de que
--     el extractor supiera leer eso. Queda flageada en `notes`.
--
--  1b. EL VIDEO va en su propio bloque DEBAJO del banner (`external_video`), que es donde
--     esta en la pagina real. Al principio lo habiamos metido como Media del hero porque
--     el embed viene con autoplay, sin controles y sin fullscreen y eso pinta un video de
--     fondo; no lo era.
--
--  2. "¿Que es Purina®?" NO va como bloque de texto aparte. El h2 y su bajada son el
--     Titulo y el Subtitulo del propio Card Grid ("Optional fields" del CMS): es un solo
--     paragraph en vez de dos y no quedan dos bloques que se pisan.
--
--  3. Las cards van en Slider Cards Default con el Card - Style Card en Square, o sea
--     APAISADAS. Lo que decide es que estas cards existen para MANDARTE a otra pagina:
--     el Mosaico (grid-cards) dibuja imagen, titulo y texto y NADA que diga que la card
--     es un link, asi que ahi el "Leer mas" desaparecia. Las variantes de carrusel si
--     marcan la card que tiene link. Y entre ellas la apaisada es la que se puede armar
--     con las fotos que ya existen: las de arriba son de 500×360 (apaisadas) y la card
--     vertical pide 822×1230 (retrato), o sea foto nueva.
--
--     El precio es que la card apaisada tiene ALTO FIJO y corta la descripcion cerca de
--     los 128 caracteres (ver CARD_SQUARE_DESC_MAX). Las dos pasaban, asi que se
--     acortaron; el texto original queda guardado en `notes`.
--
--     OJO, para las proximas paginas: NINGUN modo del Card Grid dibuja un boton con
--     texto. La card entera es el link y se marca con una flecha. El "Texto del enlace"
--     se carga igual en el CMS, pero no esperes verlo como boton.
--
--  4. El CIERRE (h2 + parrafo largo + el grafico del ciclo de vida + boton) es un
--     `c_image` con el Image position en "Image Bottom": texto arriba, imagen abajo. Es
--     exactamente ese layout, con el CTA adentro del mismo bloque.
--
-- DECISIONES DEL MERCADO PEDIDAS (Ivan): de las tres cards del sitio viejo queda SOLO
-- Innovacion; se suma una card nueva "Purina Cuida" con la imagen de la card que se
-- saco y con copy escrito por nosotros. Queda anotado en `notes` porque el copy hay que
-- revisarlo y el boton todavia no tiene destino.

insert into public.pages
  (name, path, market, category, status, sort_order, url_old, url_new, notes)
values (
  'Conoce Purina',
  '/conoce-purina',
  'MX',
  'Conoce Purina',
  'In progress',
  (select coalesce(max(sort_order), 0) + 1 from public.pages),
  'https://purina.com.mx/purina/conoce-purina',
  '/conoce-purina',
  -- OUTLIERS de esta pagina. Lo que NO es un espejo del sitio viejo, para que se pueda
  -- revisar despues sin tener que volver a comparar las dos paginas a mano.
  'CARDS — el sitio viejo tiene 3 y la pagina nueva tiene 2.'
  || E'\n· Se sacaron "Las mascotas nos importan" (iba a /purina/purina-en-la-sociedad) y "Calidad, nuestra promesa" (iba a /purina/conoce-purina/calidad).'
  || E'\n· Se agrego "Purina Cuida". El titulo y el texto los escribimos nosotros siguiendo el tono de la pagina: HAY QUE REVISAR EL COPY.'
  || E'\n· Su boton dice "Leer mas" pero todavia NO tiene destino: falta definir a que pagina apunta. Hasta que lo tenga, esa card no muestra la flecha de "ir".'
  || E'\n· Su imagen es, por pedido, la misma de la card que se saco (Purina-las-mascotas-nos-importan_0.png).'
  || E'\n\nLAYOUT DE LAS CARDS — Slider Cards Default con el Card - Style Card en Square (apaisadas).'
  || E'\n· NO es el Mosaico: el Mosaico no dibuja nada que indique que la card lleva a otro lado, y estas dos cards existen justamente para eso.'
  || E'\n· OJO: en el catalogo nuevo NINGUN modo del Card Grid dibuja un boton con texto. La card ENTERA es el link y se marca con una flecha. El "Leer mas" queda cargado en el CMS (Texto del enlace) pero no se ve como boton.'
  || E'\n\nCOPY ACORTADO — la card apaisada tiene alto fijo y corta cerca de los 128 caracteres. Las dos descripciones pasaban, asi que se acortaron. El texto ORIGINAL del sitio viejo, por si se quiere volver:'
  || E'\n· Innovacion (153 car.): "Continuamente nuestros expertos de todo el mundo nos ayudan a crear productos innovadores para tu mascota, una busqueda que representa lo que es Purina®."'
  || E'\n\nBANNER — va como Secondary Hero, alineado Banner Left Center.'
  || E'\n· La alineacion NO es decorativa: en la foto el perro esta a la DERECHA, asi que el texto tiene que ir a la izquierda para no taparlo.'
  || E'\n· FALTA LA IMAGEN DEL BANNER y no la tenemos. En el sitio viejo no es un <img>: es un background-image dentro de un <style> en linea, y esta pagina se leyo antes de que el extractor supiera leer eso. Hay que volver a leerla (tools/extraer.mjs ya lo hace) o sacarla a mano del sitio.'
  || E'\n· Medida del Secondary Hero: 2100×700 desktop (3:1) y 526×526 mobile (1:1).'
  || E'\n\nVIDEO — el YouTube va en su propio bloque DEBAJO del banner, no como Media del banner. (Primero lo habiamos puesto como fondo del hero por el autoplay sin controles; en la pagina real esta abajo.)'
  || E'\n\nIMAGENES DE LAS CARDS — las del sitio viejo son de 500×360 y la card apaisada pide 485×280 desktop y 335×280 mobile. Es un recorte, no un estiramiento: las fotos que hay alcanzan, hay que re-cortarlas.'
  || E'\n\nOTROS'
  || E'\n· El grafico del ciclo de vida es de 701×177 y tiene TODO el texto adentro de la imagen: no lo lee Google ni un lector de pantalla, y a ese ancho no aguanta desktop. Habria que re-entregarlo mas grande o rehacerlo como contenido de verdad.'
  || E'\n· Los dos <h1> del sitio viejo se unificaron en uno: el segundo pasa a ser la bajada del banner.'
  || E'\n· Los links que quedaron apuntan todavia a las URLs viejas (/purina/...). Se actualizan cuando esten las nuevas.'
);

-- ---------------------------------------------------------------------------------
-- Los componentes. Cuelgan de la pagina recien creada (todos sueltos: esta pagina no
-- tiene contenedores).
with p as (select id from public.pages where path = '/conoce-purina' and market = 'MX')
insert into public.page_components (page_id, component_key, parent_id, tab_index, sort_order, content)
select p.id, x.k, null, null, x.so, x.c from p, (values

 ('breadcrumb', 0, jsonb_build_object('items', jsonb_build_array(
    jsonb_build_object('label', 'Purina Mexico', 'url', '/'),
    jsonb_build_object('label', 'Conoce Purina')))),

 -- HERO. Los dos titulares del sitio viejo, uno como titulo y el otro como bajada.
 -- Sin Media: la imagen de fondo del sitio viejo no la tenemos todavia (ver `notes`).
 ('banner', 1, jsonb_build_object(
    'type',         'title-description',
    'title',        '¿A ti te importa de dónde viene su alimento?',
    'title_tag',    'h1',
    'description',  'A nosotros también, por eso te contamos qué es Purina®.',
    'banner_align', 'banner_left_center')),

 -- El video, en su propio bloque debajo del banner.
 ('external_video', 2, jsonb_build_object(
    'video_url', 'https://www.youtube.com/watch?v=3-COT6aQbPo')),

 -- "¿Que es Purina®?" + las cards, en UN solo bloque. Apaisadas: el modo de vista dice
 -- Slider Cards Default y la FORMA la decide el Card - Style Card.
 ('card_grid', 3, jsonb_build_object(
    'view_mode',       'slider-default-card',
    'card_style_card', 'card_grid_default_square',
    'title',           '¿Qué es Purina®?',
    'title_tag',       'h2',
    'subtitle',        'Somos una compañía dedicada a enriquecer la vida de las mascotas y sus dueños. Descubre qué es Purina® y lo que nos guía.',
    'items', jsonb_build_array(
      -- La unica card que sobrevive del sitio viejo. Descripcion acortada para que no la
      -- corte la card apaisada; el original esta en `notes`.
      jsonb_build_object(
        'title',       'Inspiración para innovar',
        'title_tag',   'h3',
        'description', 'Nuestros expertos de todo el mundo crean productos innovadores para tu mascota. Esa búsqueda es lo que es Purina®.',
        'image',       'https://purina.com.mx/sites/default/files/2022-11/purina-inspiraci%C3%B3n-para-innovar_0.png',
        'cta_label',   'Leer más',
        'cta_url',     '/purina/conoce-purina/innovacion'),
      -- Card NUEVA. Copy nuestro, a revisar. Sin destino todavia (ver `notes`).
      jsonb_build_object(
        'title',       'Purina Cuida',
        'title_tag',   'h3',
        'description', 'Cuidar es más que alimentar: acompañamos a las mascotas y a quienes las quieren. Eso también es Purina®.',
        'image',       'https://purina.com.mx/sites/default/files/2022-11/Purina-las-mascotas-nos-importan_0.png',
        'cta_label',   'Leer más')))),

 -- CIERRE: texto arriba, el grafico del ciclo de vida abajo, y el boton en el mismo
 -- bloque. El "Image Bottom" ES ese layout.
 ('content_image', 4, jsonb_build_object(
    'title',          'Conoce el ciclo de vida de un producto con alimento para mascotas',
    'title_tag',      'h2',
    'body',           'Nuestros esfuerzos de sustentabilidad abarcan todo el ciclo de vida de nuestros productos. Esto comprende todo lo que es Purina®, desde el abastecimiento de ingredientes de forma responsable hasta el uso de energía, agua y materias primas de forma más eficiente, la utilización de packaging reciclable optimizando la cantidad de materiales utilizados y el transporte de productos utilizando métodos de alta eficiencia.',
    'image',          'https://purina.com.mx/sites/default/files/2022-11/ciclo_de_vida_de_un_producto_ourina.png',
    'image_position', 'image_bottom',
    'ctas', jsonb_build_array(
      jsonb_build_object('label', '¿Qué es Purina®?', 'url', 'https://purina.com.mx/purina/conoce-purina/historia'))))

) as x(k, so, c);
