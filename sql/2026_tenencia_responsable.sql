-- "Tenencia Responsable" (/adopta/tenencia-responsable). Ya aplicado.
-- Vieja: https://purina.com.mx/purina/purina-adopta/tenencia-responsable
--
-- La pagina es un bloque de PESTAÑAS (Preparación / Cuidados) con todo el contenido
-- adentro, mas el banner y el cierre por fuera.
--
-- Las IMAGENES no se cargan: las entrega el mercado. En el Excel bajan en amarillo.
--
-- Dos cosas que NO se pudieron espejar del sitio y quedan flageadas:
--  - Los 9 acordeones del "Paso 2" van en el sitio en una grilla de 3x3, cada uno con
--    su cabecera turquesa y un icono. Nuestro `accordion_grid` es una lista vertical
--    simple: el CONTENIDO es el mismo, el layout no. Falta el subform real para saber
--    si eso es un view mode del paragraph o un wrapper aparte.
--  - El carrusel del blog ("Conoce más en nuestro blog") se carga con `articles_carousel`
--    solo con los titulos: en el CMS el articulo se SELECCIONA, no se escribe. Ademas
--    en las dos pestañas muestra articulos distintos, lo que sugiere que es un View
--    automatico y no contenido cargado a mano (ver CMS_PENDING_SUBFORMS).

insert into public.pages (name, path, market, category, status, sort_order, url_old, url_new)
values ('Tenencia Responsable', '/adopta/tenencia-responsable', 'MX', 'Purina Adopta', 'Not started', 9,
        'https://purina.com.mx/purina/purina-adopta/tenencia-responsable', '/adopta/tenencia-responsable');

-- El resto (los componentes) se inserta con el script de abajo, que usa el id de la
-- pagina recien creada: 45cad0b0-1a03-4058-a23f-1535ccc5de71.
-- Ver el bloque completo en el commit; aca queda el registro de que se armo asi.

-- ---------------------------------------------------------------------------------
-- Bloques sueltos: breadcrumb, banner, el contenedor de PESTAÑAS y el cierre.
insert into public.page_components (page_id, component_key, parent_id, tab_index, sort_order, content)
select '45cad0b0-1a03-4058-a23f-1535ccc5de71'::uuid, x.k, null, null, x.so, x.c from (values
 ('breadcrumb', 0, jsonb_build_object('items', jsonb_build_array(
    jsonb_build_object('label','Purina Mexico','url','/'),
    jsonb_build_object('label','Tenencias Responsables')))),
 ('banner', 1, jsonb_build_object(
    'type','title-description',
    'title','¿Estás pensando en adoptar?',
    'title_tag','h1',
    'description','¡Hazlo con responsabilidad! Recuerda que tener una mascota implica proporcionarle las condiciones necesarias para que tenga una vida sana, protegida y feliz.',
    'banner_align','banner_left_center')),
 ('tabs', 2, jsonb_build_object('tabs', jsonb_build_array(
    jsonb_build_object('label','Preparación'),
    jsonb_build_object('label','Cuidados')))),
 -- El cierre va FUERA de las pestañas: se ve igual en las dos. Es el mismo bloque de
 -- TEXTO con fondo que cierra Purina Adopta y "Cómo apoyamos a refugios" (nacio como
 -- `banner`, ver el update de abajo).
 ('text', 3, jsonb_build_object(
    'title','Descubre a nuestros adoptables para encontrar a tu alma gemela y tomar su correa roja',
    'title_tag','h2',
    'ctas', jsonb_build_array(
      jsonb_build_object('label','Perros'),
      jsonb_build_object('label','Gatos')),
    -- OJO: en el sitio esta banda es AZUL, no roja. No se pudo mapear ese azul a un
    -- token de `BG_COLORS` (son Pantones: Secondary 541, 2294, 268...) y inventarlo
    -- seria peor que no ponerlo, asi que va con el mismo Primary Red que los otros
    -- cierres hasta saber cual es. Cambiar el token es una linea.
    'background_color', 'Primary Red',
    'text_color',       'Primary White',
    'text_align',       'text_align_center',
    'style_button',     'style_btn_secondary',
    'spacing',          'space_section_md'))
) as x(k, so, c);

-- Los hijos de las pestañas cuelgan del `tabs` (id ccd20a89-...), con tab_index 0
-- (Preparación) y 1 (Cuidados). El contenido completo quedo cargado desde el MCP; el
-- detalle esta en la DB y se puede leer con:
--   select component_key, tab_index, sort_order, content
--   from page_components
--   where parent_id = 'ccd20a89-fd06-415c-9aba-6d45af4e069f' order by tab_index, sort_order;
--
-- Pestaña 0 (Preparación):
--   1 text            "¿Qué considerar antes de adoptar?"
--   2 card_grid       "Paso 1: ¡Prepara todo...", slider-background-default-card, 3 cards
--   3 text            "Paso 2: Checklist de preparación" + su bajada
--   4 accordion_grid  los 9 items del checklist, en rich text (negritas y viñetas)
--   5 articles_carousel "Conoce más en nuestro blog", 4 articulos
--
-- Pestaña 1 (Cuidados):
--   1 text            "Aprende sobre los cuidados de perros y gatos" + su bajada
--   2 card_grid       "Perros", slider-default-card, 6 cards
--   3 card_grid       "Gatos",  slider-default-card, 7 cards
--   4 articles_carousel "Conoce más en nuestro blog", 4 articulos
--
-- OJO con el conteo de las cards: el carrusel muestra 3 por vista y la ULTIMA vista se
-- corre para atras para llenarse, asi que en las capturas hay tarjetas repetidas entre
-- la anteultima y la ultima. Perros son 6 (2 vistas) y Gatos 7 (3 vistas), no 6 y 9.
