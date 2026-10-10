// LA TABLA: que paragraph del CMS es cada componente del hub, y a que machine name va
// cada campo. Los nombres salieron de volcar el formulario de verdad, no de memoria.
//
// Vive aparte de la traduccion porque la usan DOS herramientas: `traducir.js`, que la
// recorre para armar el manifiesto, y `medios.js`, que necesita saber en que paragraph
// hijo se convierte cada item de una lista para nombrar su imagen igual que el traductor.
// Una sola tabla es la unica forma de que no se separen.
const T = {
  titulo: { title: 'field_c_advanced_title', title_tag: 'field_c_advanced_title.html_tag' },
  subtitulo: { subtitle: 'field_c_advanced_subtitle', subtitle_tag: 'field_c_advanced_subtitle.html_tag' },
  tamanos: { title_size: 'field_title_size', subtitle_size: 'field_subtitle_size' },
}

export const PARAGRAFOS = {
  // El breadcrumb no existe como paragraph: el sitio lo arma solo con la ruta del nodo.
  breadcrumb: { omitir: 'el sitio lo arma solo con la ruta del nodo, no es un paragraph' },

  banner: {
    tipo: 'banner',
    campos: {
      type: 'field_banner_type',
      remove_overlay: 'field_remover_overlay_background',
      // El buscador con IA del hero (va en todas las homes de marca, ver CRITERIOS.md).
      show_search: 'field_show_search',
      search_fixed_mobile: 'field_search_ai_pos_fixed_mob',
      ...T.titulo,
      // OJO: la bajada del banner NO es `field_c_text` como en los demas: es `field_html`.
      description: 'field_html',
    },
    // En el CMS es UN Media que resuelve desktop y mobile solo; en el hub son dos campos
    // porque el mercado entrega los dos archivos.
    media: { image: 'field_c_image', image_mobile: null },
    ctas: 'field_c_link',
  },

  text: {
    tipo: 'c_text',
    campos: { body: 'field_c_text', ...T.titulo, ...T.subtitulo },
    ctas: 'field_c_link',
  },

  content_image: {
    tipo: 'c_image',
    campos: { body: 'field_c_text', ...T.titulo, ...T.subtitulo, ...T.tamanos },
    media: { image: 'field_c_image', image_alt: null, image_mobile: null, image_mobile_alt: null },
    ctas: 'field_c_link',
  },

  // Texto al costado de una imagen. En el hub la posicion es un select NUESTRO
  // (Izquierda / Derecha); en el CMS es un select de Classy cuyos valores de maquina
  // todavia no estan confirmados contra el formulario real. Por eso va en `conOpciones`:
  // el valor del hub se traduce con la tabla `opciones` de ESE campo en el mapping, y si
  // la tabla no esta, frena en vez de adivinar.
  text_image: {
    tipo: 'c_sideimagetext',
    campos: { body: 'field_c_text', ...T.titulo, image_position: 'classy.dsu_c_sideimagetext_image_position' },
    conOpciones: ['image_position'],
    media: { image: 'field_c_image', image_alt: null, image_mobile: null, image_mobile_alt: null },
    // Como la card: UN link suelto, no una lista.
    ctaPlano: { cta_label: 'field_c_link.title', cta_url: 'field_c_link.uri', cta_target: 'field_c_link.target' },
  },

  external_video: {
    tipo: 'c_externalvideo',
    campos: { ...T.titulo, video_url: 'field_c_external_video' },
  },

  card_grid: {
    tipo: 'ln_c_cardgrid',
    campos: {
      view_mode: 'field_c_cardgrid_view_mode',
      ...T.titulo, ...T.subtitulo, ...T.tamanos,
    },
    media: { background_image: 'field_media', background_image_mobile: null },
    lista: { campo: 'items', como: 'card_grid_item', slot: 0 },
  },

  card_grid_item: {
    tipo: 'ln_c_grid_card_item',
    campos: {
      ...T.titulo, ...T.subtitulo,
      icon: 'field_icon', description: 'field_c_text', show_ia_icon: 'field_show_ia_icon',
      section_id: 'advanced.section_id', css_class: 'advanced.css_class',
      bg_color: 'classy.background_color',
    },
    media: { image: 'field_c_image', image_alt: null, image_mobile: null, image_mobile_alt: null },
    // La card tiene UN link suelto, no una lista.
    ctaPlano: { cta_label: 'field_c_link.title', cta_url: 'field_c_link.uri', cta_target: 'field_c_link.target' },
  },

  // CARDS INFO: cards con icono, titulo y texto que NO corta el texto (el Card Grid si).
  // Sus items son `card_infos`, en la misma lista `field_c_subitems` que el Card Grid.
  cards_info: {
    tipo: 'cards_info',
    campos: { ...T.titulo, ...T.subtitulo, ...T.tamanos },
    lista: { campo: 'items', como: 'cards_info_item', slot: 0 },
  },

  cards_info_item: {
    tipo: 'card_infos',
    campos: { ...T.titulo, icon: 'field_icon', description: 'field_c_text' },
  },

  // EL CARRUSEL DE PRODUCTOS. En el CMS no es un componente propio: es un paragraph Block
  // con el bloque "Selected Product" en Carousel, que es como lo arma F5 en /proplan y
  // /dogchow. Los productos son referencias a productos del CMS; mientras no esten
  // migrados van MUESTRAS de la misma marca (`productosMuestra` del mapping).
  // Lo que el Block no tiene: las pestañas de filtro y la card Pet ID (no van en el
  // lanzamiento). La imagen de la izquierda es `field_background_image`.
  product_list: {
    tipo: 'block',
    fijos: { 'field_block.plugin': 'pl_product_selected_product_block', 'field_block.display': 'carousel' },
    campos: { ...T.titulo, subtitle: 'field_c_advanced_subtitle' },
    media: { left_image: 'field_background_image' },
    productos: 'field_block.productos',
    verMas: { texto: 'see_more_text', url: 'see_more_url' },
    // Interruptores del builder: dicen que se ve, no son contenido del CMS.
    descartar: ['show_left_image', 'show_filters', 'filters', 'show_petid'],
  },

  // LA PAGINA DE PRODUCTOS de una marca: el filtro Perro / Gato y el listado de TODOS los
  // productos de la marca del nodo. Dos Block del CMS, configurados como los de F5.
  product_filter: {
    tipo: 'block',
    fijos: {
      'field_block.plugin': 'pl_base_pet_type_url_filter_block',
      'field_block.query_name': 'pettype',
      'field_block.display_name': 'menu_block',
      'field_block.check_unavailability': true,
    },
    campos: { title: 'field_block.filtro_titulo' },
  },
  product_grid: {
    tipo: 'block',
    fijos: {
      'field_block.plugin': 'views_block:products_search-product_results_block_cont_brand',
      'field_block.items_per_page': '20',
    },
    campos: {},
  },

  // LA LINEA DE TIEMPO = History Grid. Cada hito es un `history_grid_item` con año (un
  // select), imagen (OBLIGATORIA en el CMS), titulo y cuerpo.
  timeline: {
    tipo: 'history_grid',
    campos: { ...T.titulo, subtitle: 'field_c_advanced_subtitle' },
    lista: { campo: 'items', como: 'timeline_item', slot: 0 },
  },
  timeline_item: {
    tipo: 'history_grid_item',
    campos: { year: 'field_history_year', ...T.titulo, description: 'field_c_text' },
    media: { image: 'field_c_image' },
  },

  // El carrusel de banners: sus hijos son Banners (un solo slot, el orden es el de los slides).
  banner_wrapper: { tipo: 'banner_wrapper', campos: {} },

  // CONTENEDORES. Sus hijos son componentes de verdad y van a una ranura: en el layout, la
  // columna (el `tab_index` del hub es el indice de columna); en las pestañas, un
  // `comp_tabs_tab_item` por pestaña con UN componente adentro (ver `pestanas`).
  // Los 12 layouts del CMS tienen la MISMA forma (columnas `field_column_first..fifth`,
  // Classy con background_color/position/spacing): solo cambia el nombre y cuantas columnas.
  // Leidos del formulario de alta de content (2026-10).
  layout_columns_1: { tipo: 'layout_columns_1', campos: {} },
  layout_columns_2: { tipo: 'layout_columns_2', campos: {} },
  layout_columns_3: { tipo: 'layout_columns_3', campos: {} },
  layout_columns_4: { tipo: 'layout_columns_4', campos: {} },
  layout_columns_20: { tipo: 'layout_columns_20', campos: {} },
  layout_75_25: { tipo: 'layout_75_25', campos: {} },
  layout_66_33: { tipo: 'layout_66_33', campos: {} },
  layout_50_25_25: { tipo: 'layout_50_25_25', campos: {} },
  layout_25_75: { tipo: 'layout_25_75', campos: {} },
  layout_33_66: { tipo: 'layout_33_66', campos: {} },
  layout_25_25_50: { tipo: 'layout_25_25_50', campos: {} },
  layout_25_50_25: { tipo: 'layout_25_50_25', campos: {} },

  // El Tabs del CMS NO tiene titulo ni subtitulo propios (el formulario real trae solo el
  // tipo, Avanzado y Classy). Por eso no estan en `campos`: si el bloque del hub trae uno,
  // el traductor frena en vez de perderlo — donde va ese titulo es una decision de la
  // pagina, no de la tabla.
  tabs: {
    tipo: 'comp_tabs',
    campos: { tab_type: 'field_tab_type' },
    pestanas: {
      como: 'comp_tabs_tab_item',
      campos: { label: 'field_title', description: 'field_description' },
      // El fondo de una pestaña Full Background. El mobile vive en el mismo medio.
      media: { image: 'field_c_image', image_mobile: null },
      // Lo que una pestaña del CMS acepta adentro (el dropbutton de Gin del formulario).
      admite: ['banner', 'banner_wrapper', 'block', 'html', 'ln_c_cardgrid', 'c_externalvideo',
        'c_image', 'c_sideimagetext', 'c_text'],
    },
  },

  accordion_grid: {
    tipo: 'accordion_grid',
    campos: {},
    lista: { campo: 'items', como: 'accordion_item', slot: 0 },
  },

  accordion_item: {
    tipo: 'accordion_item',
    campos: {
      ...T.titulo, text: 'field_c_text',
      visibility: 'advanced.enable_visibility_control',
      section_id: 'advanced.section_id', css_class: 'advanced.css_class',
    },
  },
}

