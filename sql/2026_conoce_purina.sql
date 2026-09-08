-- "Conoce Purina" (/conoce-purina). PRIMERA pagina traducida del sitio viejo al
-- catalogo nuevo. NO aplicada todavia: correr entera en el SQL editor de Purina-Hub.
-- Vieja: https://purina.com.mx/purina/conoce-purina
--
-- COMO SE TRADUJO. La regla no fue "el componente mas parecido" sino dejar la pagina
-- nueva lo mejor posible:
--
--  1. HERO. El sitio viejo abre con DOS <h1> ("¿A ti te importa de donde viene su
--     alimento?" y "A nosotros tambien, por eso te contamos que es Purina®") y un
--     YouTube con autoplay, sin controles y sin fullscreen — o sea un video de fondo,
--     no un video para mirar. Se arma como UN banner Main Hero: el primer titular es el
--     h1 y el segundo pasa a ser la bajada. Dos h1 en una pagina es un error de SEO que
--     no hay razon para arrastrar.
--
--  2. "¿Que es Purina®?" NO va como bloque de texto aparte. El h2 y su bajada son el
--     Titulo y el Subtitulo del propio Card Grid ("Optional fields" del CMS): es un solo
--     paragraph en vez de dos y no quedan dos bloques que se pisan.
--
--  3. Las cards van en modo Grid Cards (el "Mosaico"). Con DOS cards es el layout que
--     mejor las sostiene — ocupa el ancho completo y alterna imagen y caja — y ademas es
--     el unico de los candidatos que no le pone tope al largo de la descripcion: las
--     cards apaisadas cortan cerca de los 128 caracteres y el texto de Innovacion tiene
--     152, o sea que ahi se veria mochado.
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
  || E'\n· Su boton dice "Leer mas" pero todavia NO tiene destino: falta definir a que pagina apunta.'
  || E'\n· Su imagen es, por pedido, la misma de la card que se saco (Purina-las-mascotas-nos-importan_0.png).'
  || E'\n\nIMAGENES — ninguna de las del sitio viejo sirve como esta.'
  || E'\n· Las de las cards son de 500×360 y el modo Grid Cards pide 760×760 (1:1). Hay que recortarlas y re-entregarlas; no se pueden estirar.'
  || E'\n· El grafico del ciclo de vida es de 701×177 y tiene TODO el texto adentro de la imagen: no lo lee Google ni un lector de pantalla, y a ese ancho no aguanta desktop. Habria que re-entregarlo mas grande o rehacerlo como contenido de verdad.'
  || E'\n\nOTROS'
  || E'\n· El hero del sitio viejo es un video de YouTube de fondo (autoplay, sin controles): va cargado como Media del banner (https://www.youtube.com/watch?v=3-COT6aQbPo).'
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
 ('banner', 1, jsonb_build_object(
    'type',        'main_hero',
    'title',       '¿A ti te importa de dónde viene su alimento?',
    'title_tag',   'h1',
    'description', 'A nosotros también, por eso te contamos qué es Purina®.',
    'image',       'https://www.youtube.com/watch?v=3-COT6aQbPo')),

 -- "¿Que es Purina®?" + las cards, en UN solo bloque.
 ('card_grid', 2, jsonb_build_object(
    'view_mode',  'grid-cards',
    'title',      '¿Qué es Purina®?',
    'title_tag',  'h2',
    'subtitle',   'Somos una compañía dedicada a enriquecer la vida de las mascotas y sus dueños. Descubre qué es Purina® y lo que nos guía.',
    'items', jsonb_build_array(
      -- La unica card que sobrevive del sitio viejo, tal cual.
      jsonb_build_object(
        'title',       'Inspiración para innovar',
        'title_tag',   'h3',
        'description', 'Continuamente nuestros expertos de todo el mundo nos ayudan a crear productos innovadores para tu mascota, una búsqueda que representa lo que es Purina®.',
        'image',       'https://purina.com.mx/sites/default/files/2022-11/purina-inspiraci%C3%B3n-para-innovar_0.png',
        'cta_label',   'Leer más',
        'cta_url',     '/purina/conoce-purina/innovacion'),
      -- Card NUEVA. Copy nuestro, a revisar. Sin destino todavia (ver `notes`).
      jsonb_build_object(
        'title',       'Purina Cuida',
        'title_tag',   'h3',
        'description', 'Cuidar es más que alimentar: acompañamos a las mascotas y a las familias que las quieren en cada etapa de su vida. Descubre cómo cuida Purina®.',
        'image',       'https://purina.com.mx/sites/default/files/2022-11/Purina-las-mascotas-nos-importan_0.png',
        'cta_label',   'Leer más')))),

 -- CIERRE: texto arriba, el grafico del ciclo de vida abajo, y el boton en el mismo
 -- bloque. El "Image Bottom" ES ese layout.
 ('content_image', 3, jsonb_build_object(
    'title',          'Conoce el ciclo de vida de un producto con alimento para mascotas',
    'title_tag',      'h2',
    'body',           'Nuestros esfuerzos de sustentabilidad abarcan todo el ciclo de vida de nuestros productos. Esto comprende todo lo que es Purina®, desde el abastecimiento de ingredientes de forma responsable hasta el uso de energía, agua y materias primas de forma más eficiente, la utilización de packaging reciclable optimizando la cantidad de materiales utilizados y el transporte de productos utilizando métodos de alta eficiencia.',
    'image',          'https://purina.com.mx/sites/default/files/2022-11/ciclo_de_vida_de_un_producto_ourina.png',
    'image_position', 'image_bottom',
    'ctas', jsonb_build_array(
      jsonb_build_object('label', '¿Qué es Purina®?', 'url', 'https://purina.com.mx/purina/conoce-purina/historia'))))

) as x(k, so, c);
