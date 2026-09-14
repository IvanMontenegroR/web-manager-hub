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
      ...T.titulo,
      // OJO: la bajada del banner NO es `field_c_text` como en los demas: es `field_html`.
      description: 'field_html',
      show_search: 'field_show_search',
      search_fixed_mobile: 'field_search_ai_pos_fixed_mob',
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

  external_video: {
    tipo: 'c_externalvideo',
    campos: { ...T.titulo, video_url: 'field_c_external_video' },
  },

  card_grid: {
    tipo: 'ln_c_cardgrid',
    campos: {
      view_mode: 'field_c_cardgrid_view_mode',
      show_card_pet_id: 'field_show_card_pet_id',
      ...T.titulo, ...T.subtitulo, ...T.tamanos,
    },
    media: { background_image: 'field_media' },
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

