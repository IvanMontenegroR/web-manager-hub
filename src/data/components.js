// Catalogo de componentes del backend Purina Ecosystem v2.0, curado a partir del
// Component playbook. Cada componente define sus CAMPOS de Drupal (los que el editor
// tiene que cargar en el CMS). Este catalogo alimenta 3 cosas: la paleta del builder,
// el formulario de contenido, y las columnas del export de matriz de contenido.
//
// Tipos de campo:
//   text | textarea | url | select (options) | image | list (item: [subcampos])
// 'list' = campo repetible (cards, logos, numeros...); su contenido es un array de
// objetos con los subcampos.
//
// Es un catalogo INICIAL (piloto). Se van sumando componentes/campos a medida que se
// documentan; agregar uno = una entrada aca + un render en ComponentPreview.

// Variantes del "Carrusel de cards". Nombres en español; entre parentesis, como se
// llaman en el CMS, para que el editor las pueda mapear.
export const CMT_VERTICAL = 'Cards verticales'                      // la de Compromiso Purina®
export const CMT_ICON = 'Cards con icono'                           // Card icon square
export const CMT_WIDE_BOTTOM = 'Cards apaisadas con texto abajo'    // Slider background cards
export const CMT_WIDE_TOP = 'Cards apaisadas con título arriba'     // Slider cards
export const CMT_NUMBERS = 'Cards numeradas'                        // Cards numbers
export const CMT_VARIANTS = [CMT_VERTICAL, CMT_ICON, CMT_WIDE_BOTTOM, CMT_WIDE_TOP, CMT_NUMBERS]

// Paleta de TOKENS del CMS (no hex). Es la MISMA lista para todos los selects de color
// del panel Classy: Background Color, Card - Background Color, Text Color, Card - Title
// Color, Card - Icon Color, etc. Sale tal cual del formulario de Drupal (39 valores).
// Vacio = "Default" en el CMS, por eso "Default" NO esta en la lista: seria la misma
// opcion dos veces (el select ya trae su "—").
export const BG_COLORS = [
  'Brand 01', 'Brand 02', 'Brand 03', 'Brand 04',
  'Neutral 000', 'Neutral 100', 'Neutral 200', 'Neutral 300', 'Neutral 400',
  'Neutral 500', 'Neutral 600', 'Neutral 700', 'Neutral 800',
  'Primary Black', 'Primary Red', 'Primary White',
  'Reds 000', 'Reds 100', 'Reds 200', 'Reds 300', 'Reds 400', 'Reds 500', 'Reds 600',
  'Secondary 123', 'Secondary 131', 'Secondary 1665', 'Secondary 187',
  'Secondary 2280', 'Secondary 2294', 'Secondary 2577', 'Secondary 268',
  'Secondary 433', 'Secondary 433 8', 'Secondary 538', 'Secondary 541',
  'Secondary 636', 'Secondary 7567', 'Secondary 7704', 'Secondary Red',
]
// Etiqueta que ve el editor en Drupal cuando el campo esta vacio.
export const TOKEN_DEFAULT = 'Default'

// Hex de cada token, para poder PINTAR el fondo en el mockup. Solo estan los que
// conocemos con certeza; el resto queda sin pintar a proposito (inventar un color de
// un design system seria peor que no mostrarlo). Completar cuando desarrollo pase la
// paleta: agregar la entrada aca y el mockup la toma sola.
export const BG_TOKENS = {
  'Primary Red': '#ED1C24',
  'Primary White': '#FFFFFF',
}

// Set de iconos del CMS, tal cual el select de Drupal. El VALOR es lo que identifica
// al icono, asi que es lo que se guarda y lo que baja al Excel: el editor elige ese
// mismo nombre en el formulario. En el mockup se dibuja el equivalente que tengamos
// (ver FeatureIcon en ComponentPreview) y el resto cae a un icono generico.
export const CMS_ICONS = [
  'action_key', 'add_2', 'add_a_photo', 'add_comment', 'add_link', 'add_location_alt',
  'add_photo_alternate', 'add_shopping_cart', 'adocao', 'ai', 'apple', 'arming_countdown',
  'arrow-down', 'arrow-left', 'arrow-right', 'arrow-up', 'arrow_outward', 'article',
  'aspect_ratio', 'atr', 'attachment', 'audio-ai', 'audio', 'beef', 'bolt', 'bookmark_star',
  'bookmark_star_fill', 'border_color', 'browse', 'calculate', 'calendar_add_on',
  'calendar_month', 'call', 'cat-ai', 'cat', 'chat', 'chat_add_on', 'chat_bubble',
  'chat_error', 'check', 'check_box', 'check_box_outline_blank', 'chevron_backward',
  'chevron_forward', 'close', 'content_copy', 'cookie', 'counter_4', 'crop_free',
  'dark_mode', 'dehaze', 'delete', 'dog-ai', 'dog', 'done_all', 'download',
  'ellipsis-vertical', 'facebook-positive', 'facebook', 'family_home', 'female',
  'filter-1', 'filter', 'folder_open', 'format_bold', 'format_italic',
  'format_list_bulleted', 'format_list_numbered', 'format_quote', 'format_size',
  'format_underlined', 'forum', 'genetics', 'google', 'groups', 'handshake',
  'health_cross', 'heart', 'help', 'history', 'hotel', 'instagram',
  'keyboard_arrow_down', 'keyboard_arrow_up', 'language', 'light_mode', 'linked_services',
  'linkedin', 'logout', 'mail', 'male', 'mic', 'more_horiz', 'move_item', 'my_location',
  'newsmode', 'open_in_new', 'password_2', 'pause_circle', 'paw-solid', 'paw',
  'percent_discount', 'person', 'person_add', 'person_edit', 'pet_supplies', 'pin_drop',
  'pinterest', 'play_circle', 'post_add', 'search-ai', 'search', 'search_activity',
  'settings', 'share', 'star-1', 'star-void', 'star', 'stethoscope', 'storefront',
  'strikethrough_s', 'text_decrease', 'text_increase', 'thumb_down', 'thumb_up', 'tiktok',
  'verified', 'video_camera_back_add', 'visibility_off', 'whatsapp', 'workspace_premium',
  'x', 'youtube',
]

// ---- Content: Card Grid --------------------------------------------------------
// UN solo paragraph del CMS (`ln_c_cardgrid`) del que salen todas estas variantes: el
// "Modo de vista" cambia el layout, no el componente. Se guarda el VALOR de maquina
// (grid-cards, cards-numbers...) que es el identificador estable; la etiqueta es la que
// ve el editor en el desplegable de Drupal y es la que baja al Excel.
export const CARD_GRID_MODES = [
  { value: 'cards-icons', label: 'Cards Icons' },
  { value: 'cards-numbers', label: 'Cards Numbers' },
  { value: 'cards-simple', label: 'Cards Simple (Only Image + Title)' },
  { value: 'full-background-card-icons', label: 'Full Background Card Icons (Without Box - Max 3 cards)' },
  { value: 'full-background-card-icons-box', label: 'Full Background Card Icons (Max 3 cards)' },
  { value: 'grid-cards', label: 'Grid Cards (Max 3 Cards)' },
  { value: 'image-card-icons', label: 'Box Image + Card Icons' },
  { value: 'slider-default-card', label: 'Slider Cards Default' },
  { value: 'slider-background-default-card', label: 'Slider Background Cards Default (Max 3 cards)' },
  { value: 'slider-card-icons-square', label: 'Card Icon Square' },
  { value: 'full-background-card-icons-square', label: 'Full Background Card Icons Square' },
]
export const CARD_GRID_DEFAULT_MODE = 'grid-cards'
// La card de estos modos NO lleva imagen propia: o va con icono, o es la card blanca
// numerada. Pedirle al mercado una imagen que ese layout no dibuja es ruido.
// OJO: los tres `full-background-card-icons*` estan aca por su NOMBRE ("card icons"),
// no porque hayamos visto el layout — si alguno lleva imagen, se saca de la lista.
export const CARD_GRID_ICON_MODES = [
  'cards-icons', 'cards-numbers', 'slider-card-icons-square',
  'full-background-card-icons', 'full-background-card-icons-box',
  'full-background-card-icons-square',
]
// Y al reves: estos van con imagen, asi que no piden icono.
export const CARD_GRID_IMAGE_MODES = [
  'grid-cards', 'cards-simple', 'slider-default-card', 'slider-background-default-card',
]

// Un `option` de un select puede ser un string (valor = etiqueta) o { value, label }
// cuando lo que se guarda y lo que se muestra son distintos (ej. el Modo de vista).
export const optValue = (o) => (o && typeof o === 'object' ? o.value : o)
export const optLabel = (o) => (o && typeof o === 'object' ? o.label : o)
export function labelOf(options, value) {
  const hit = (options || []).find((o) => optValue(o) === value)
  return hit ? optLabel(hit) : (value || '')
}

// Opciones del panel Classy que NO son de color (esas usan BG_COLORS).
export const BG_POSITIONS = [
  { value: 'bg_position_boxed', label: 'Boxed' },
  { value: 'bg_position_full_width', label: 'Full Width' },
]
export const CARD_STYLES = [
  { value: 'card_grid_default_square', label: 'Card Grid Default Square' },
  { value: 'card_grid_default_vertical', label: 'Card Grid Default Vertical' },
]
export const CARD_TITLE_POSITIONS = [
  { value: 'card_grid_title_bottom', label: 'Card Grid Title Bottom' },
]
export const ARROW_POSITIONS = [
  { value: 'position_arrows_bottom_left', label: 'bottom left' },
  { value: 'position_arrows_bottom_right', label: 'bottom right' },
  { value: 'position_arrows_top_left', label: 'top left' },
  { value: 'position_arrows_top_right', label: 'top right' },
]
export const CLASSY_ALIGNS = [
  { value: 'text_align_center', label: 'Text Align Center' },
  { value: 'text_align_left', label: 'Text Align Left' },
  { value: 'text_align_right', label: 'Text Align Right' },
]
export const SPACINGS = [
  { value: 'space_py_0', label: 'Sem espaço vertical' },
  { value: 'space_py_1', label: 'Espaço vertical mínimo — 4px' },
  { value: 'space_py_2', label: 'Espaço vertical muito pequeno — 8px' },
  { value: 'space_py_3', label: 'Espaço vertical pequeno — 12px' },
  { value: 'space_py_4', label: 'Espaço vertical regular — 16px' },
  { value: 'space_py_5', label: 'Espaço vertical médio — 20px' },
  { value: 'space_py_6', label: 'Espaço vertical médio plus — 24px' },
  { value: 'space_py_7', label: 'Espaço vertical grande — 32px' },
  { value: 'space_py_8', label: 'Espaço vertical grande plus — 36px' },
  { value: 'space_py_9', label: 'Espaço vertical extra grande — 40px' },
  { value: 'space_py_10', label: 'Espaço vertical máximo — 60px' },
  { value: 'space_py_11', label: 'Espaço vertical super máximo — 80px' },
  { value: 'space_py_12', label: 'Espaço vertical extremo — 120px' },
  { value: 'space_section_2xs', label: 'Espaçamento de Seção: Mínimo' },
  { value: 'space_section_xs', label: 'Espaçamento de Seção: Extra Pequeno' },
  { value: 'space_section_sm', label: 'Espaçamento de Seção: Pequeno' },
  { value: 'space_section_md', label: 'Espaçamento de Seção: Médio' },
  { value: 'space_section_lg', label: 'Espaçamento de Seção: Grande' },
  { value: 'space_section_xl', label: 'Espaçamento de Seção: Extra Grande' },
]
export const LINK_TARGETS = [
  { value: '_self', label: 'Same window (_self)' },
  { value: '_blank', label: 'New window (_blank)' },
]
export const PET_VISIBILITY = ['Gato', 'Perro', 'Gato + Perro']
export const HTML_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p']

// Estilo del bloque de texto (`content_text_styles` del panel Classy). Vacio = Default.
export const CONTENT_TEXT_STYLES = [
  { value: 'one_column_texts', label: 'One Column Texts' },
  { value: 'two_columns_expansive_space_texts', label: 'Two Columns Expansive Space Texts' },
  { value: 'two_columns_texts', label: 'Two Columns Texts' },
]

// Estilo del boton (`style_button`). Vacio = Default, el boton rojo — igual que el
// resto de Classy, por eso "Default" no esta en la lista: seria la opcion dos veces.
export const BUTTON_STYLES = [
  { value: 'style_btn_outline', label: 'Style Outline' },
  { value: 'style_btn_secondary', label: 'Style Secondary' },
  { value: 'style_btn_text', label: 'Style Text' },
]

// ---- Banner ---------------------------------------------------------------------
// `field_banner_type` es OBLIGATORIO en el CMS (el select no trae opcion vacia).
// El valor de maquina no siempre se parece a la etiqueta: "Secondary Hero" se guarda
// como `title-description` y "Banner Card" como `banner-menu`.
export const BT_MAIN_HERO = 'main_hero'
export const BT_SECONDARY_HERO = 'title-description'
export const BT_ONLY_IMAGE = 'only-image'
export const BT_CARD = 'banner-menu'
export const BT_FULL_BOX = 'full-image-box-content'
export const BT_BRAND_HERO = 'brand_hero'
export const BANNER_TYPES = [
  { value: BT_MAIN_HERO, label: 'Main Hero' },
  { value: BT_SECONDARY_HERO, label: 'Secondary Hero' },
  { value: BT_ONLY_IMAGE, label: 'Promotional banner (Only image)' },
  { value: BT_CARD, label: 'Banner Card' },
  { value: BT_FULL_BOX, label: 'Full Image + Box Content' },
  { value: BT_BRAND_HERO, label: 'Brand Hero' },
]

// Classy propio del Banner: donde se apoya el contenido sobre la imagen.
export const BANNER_ALIGNS = [
  { value: 'banner_center_bottom', label: 'Banner Center Bottom' },
  { value: 'banner_center_center', label: 'Banner Center Center' },
  { value: 'banner_center_top', label: 'Banner Center Top' },
  { value: 'banner_left_bottom', label: 'Banner Left Bottom' },
  { value: 'banner_left_bottom_mobile_center_desktop', label: 'Banner Left Bottom (Mobile)  Center (Desktop)' },
  { value: 'banner_left_center', label: 'Banner Left Center' },
  { value: 'banner_left_top', label: 'Banner Left Top' },
  { value: 'banner_right_bottom', label: 'Banner Right Bottom' },
  { value: 'banner_right_center', label: 'Banner Right Center' },
  { value: 'banner_right_top', label: 'Banner Right Top' },
]

// ---- Content: Image -------------------------------------------------------------
// Classy propio de `c_image` + los dos tamaños de tipografia de su subform.
export const IMAGE_POSITIONS = [
  { value: 'image_bottom', label: 'Image Bottom' },
  { value: 'image_center', label: 'Image Center' },
  { value: 'image_fixed_background', label: 'Image Fixed (Background)' },
  { value: 'image_background_box', label: 'Image Background Box' },
  { value: 'image_background_full', label: 'Image Background Full' },
]
export const IMAGE_STYLES = [
  { value: 'bg_position_full_width', label: 'Full Width' },
]
export const TITLE_SIZES = [
  { value: 'fs-headline-sm', label: 'Small' },
  { value: 'fs-headline-md', label: 'Medium' },
  { value: 'fs-headline-md--headline-xl', label: 'Large' },
]
export const SUBTITLE_SIZES = [
  { value: 'fs-body-sm', label: 'Small' },
  { value: 'fs-body-md', label: 'Medium' },
  { value: 'fs-body-lg', label: 'Large' },
]

// Que dice Drupal cuando el select esta vacio. No es siempre lo mismo ("Default" en el
// panel Classy, "- Ninguno -" en los HTML tag), y el editor tiene que buscar esa opcion
// exacta en el desplegable. Se resuelve por la LISTA de opciones, asi no hay que
// declararlo campo por campo.
const EMPTY_LABELS = new Map([
  [BG_COLORS, TOKEN_DEFAULT], [BG_POSITIONS, TOKEN_DEFAULT], [CARD_STYLES, TOKEN_DEFAULT],
  [CARD_TITLE_POSITIONS, TOKEN_DEFAULT], [ARROW_POSITIONS, TOKEN_DEFAULT],
  [CLASSY_ALIGNS, TOKEN_DEFAULT], [SPACINGS, TOKEN_DEFAULT],
  [CONTENT_TEXT_STYLES, TOKEN_DEFAULT], [BUTTON_STYLES, TOKEN_DEFAULT],
  [BANNER_ALIGNS, TOKEN_DEFAULT], [IMAGE_POSITIONS, TOKEN_DEFAULT], [IMAGE_STYLES, TOKEN_DEFAULT],
  [HTML_TAGS, '- Ninguno -'], [LINK_TARGETS, '- Ninguno -'],
  [TITLE_SIZES, '- Ninguno -'], [SUBTITLE_SIZES, '- Ninguno -'],
  [CMS_ICONS, '- Select an icon -'],
  [PET_VISIBILITY, 'Vista genérica (todas)'],
])
export function emptyLabelFor(field) {
  return (field?.options && EMPTY_LABELS.get(field.options)) || '—'
}

// Nombre de los grupos plegables del form (ver ContentForm).
export const G_ADV = 'Avanzado (CMS)'
export const G_CLASSY = 'Classy — estilos (CMS)'
// Grupo propio del Banner: el buscador con IA que se monta encima.
export const G_SEARCH = 'Search AI (CMS)'

// `cmsGroup` es OTRA cosa que `group`: no es como agrupamos NOSOTROS el form, es el
// desplegable de Drupal adentro del cual vive el campo. Va solo en la hoja CMS (el
// editor tiene que abrirlo para encontrarlo) y por eso lleva el nombre EXACTO del CMS.
// Un campo puede estar en un `cmsGroup` y no tener `group`: en nuestro form el titulo
// del bloque es lo primero que se carga, esconderlo en un plegable seria peor.
export const G_OPTIONAL = 'Optional fields'

// ---- Los dos grupos que Drupal repite en TODOS los paragraphs -------------------
// "Avanzado" y "Classy" no son campos de UN componente: el CMS se los agrega a cada
// paragraph. Antes estaban copiados a mano adentro de card_grid, asi que cada
// componente nuevo tenia que repetir veinte campos. Ahora se declaran una sola vez:
// el Avanzado es siempre el mismo, y del Classy cada componente pide los selects que
// le aplican (`classy('background_color', 'spacing', ...)`), en el mismo orden en que
// los muestra el formulario de Drupal.

// Bloque "Avanzado": visibilidad por especie, boton See more, Section ID y CSS.
// Devuelve objetos NUEVOS en cada llamada para que un componente no pise al otro.
export function advanced() {
  return [
    { key: 'see_more', label: 'Mostrar botón "See more"', cmsLabel: 'Show "See more" button', type: 'checkbox', cms: true, default: false, group: G_ADV },
    { key: 'see_more_label', label: 'See more — texto', cmsLabel: 'Texto del enlace (See more)', type: 'text', cms: true, group: G_ADV, requiresTrue: 'see_more' },
    { key: 'see_more_url', label: 'See more — link', cmsLabel: 'URL (See more)', type: 'url', cms: true, group: G_ADV, requiresTrue: 'see_more' },
    { key: 'visibility', label: 'Visibilidad (pet type)', cmsLabel: 'Paragraph visibility', type: 'select', cms: true, options: PET_VISIBILITY, group: G_ADV,
      hint: 'Vacío = se ve en la vista genérica. Con una opción elegida, el bloque solo aparece para esa especie.' },
    { key: 'section_id', label: 'Section ID', cmsLabel: 'Section ID', type: 'text', cms: true, group: G_ADV },
    { key: 'css_class', label: 'Custom CSS classes', cmsLabel: 'Custom CSS classes', type: 'text', cms: true, group: G_ADV },
  ]
}

// Catalogo de selects del panel Classy. La key es la del CMS; `options` apunta SIEMPRE
// al mismo array (de ahi sale la etiqueta de "vacio", ver emptyLabelFor).
const CLASSY_FIELDS = {
  background_color: { label: 'Background Color', options: BG_COLORS },
  background_position: { label: 'Background Position', options: BG_POSITIONS },
  spacing: { label: 'Spacing', options: SPACINGS },
  text_align: { label: 'Text Align', options: CLASSY_ALIGNS },
  text_color: { label: 'Text Color', options: BG_COLORS },
  content_text_styles: { label: 'Content Text Styles', options: CONTENT_TEXT_STYLES },
  style_button: { label: 'Style Button', options: BUTTON_STYLES },
  background_card_color: { label: 'Card - Background Color', options: BG_COLORS },
  background_degrade_color: { label: 'Background Degrade Color', cmsLabel: 'Background Degrade Color Cards Grid', options: BG_COLORS },
  title_card_color: { label: 'Card - Title Color', options: BG_COLORS },
  text_card_color: { label: 'Card - Text Color', options: BG_COLORS },
  icon_card_color: { label: 'Card - Icon Color', options: BG_COLORS },
  card_style_card: { label: 'Card - Style Card', options: CARD_STYLES },
  card_title_position: { label: 'Card - Title Position', options: CARD_TITLE_POSITIONS },
  position_arrows: { label: 'Position Arrows', options: ARROW_POSITIONS },
  banner_align: { label: 'Banner Align Content', options: BANNER_ALIGNS },
  image_position: { label: 'Image position', options: IMAGE_POSITIONS },
  image_style: { label: 'Image Style', options: IMAGE_STYLES },
}

// Los selects de Classy que le aplican a un componente, en el orden del formulario.
// Un item puede ser la key a secas o `{ key, ...overrides }`, para que un componente le
// agregue algo suyo (ej. un `defaultByType`) sin tocar la definicion compartida.
export function classy(...keys) {
  return keys.map((k) => {
    const { key, ...extra } = typeof k === 'string' ? { key: k } : k
    const f = CLASSY_FIELDS[key]
    if (!f) throw new Error(`Classy: no existe el campo "${key}"`)
    return {
      key, label: f.label, cmsLabel: f.cmsLabel || f.label,
      type: 'select', cms: true, options: f.options, group: G_CLASSY, ...extra,
    }
  })
}

// Pestañas de ejemplo del bloque "Pestañas". Un bloque recien agregado ya muestra
// estas dos, para poder meterle contenido adentro antes de renombrarlas.
export const TAB_SAMPLE = [
  { label: 'Gato', description: 'TABS gato description' },
  { label: 'Cachorro', description: 'TABS cachorro description' },
]

// Pestañas EFECTIVAS de un bloque: las cargadas o, si no hay ninguna, las de ejemplo.
// El `tab_index` de los componentes hijos apunta a la posicion en ESTA lista.
export function tabList(content) {
  const arr = Array.isArray(content?.tabs) ? content.tabs.filter(Boolean) : []
  return arr.length ? arr : TAB_SAMPLE
}

// ---- Contenedores: SLOTS --------------------------------------------------------
// Un contenedor no tiene contenido visual propio: su contenido son OTROS componentes.
// Cada contenedor declara sus SLOTS, las ranuras donde caen los hijos. Hay dos clases:
//   - slots FIJOS, declarados en el componente (`slots`): las columnas de un layout.
//   - slots VARIABLES, que salen del contenido: una pestaña por cada `tabs` cargada.
// El hijo apunta a su slot con `page_components.tab_index`. La columna se sigue
// llamando asi por historia (nacio con las pestañas) pero es el INDICE DE SLOT y vale
// para cualquier contenedor.
export function slotsOf(def, content) {
  if (!def?.container) return []
  if (def.slots) return def.slots
  return tabList(content).map((t, i) => ({
    label: t.label || `Pestaña ${i + 1}`, description: t.description || '',
  }))
}

// ---- Layout Columns -------------------------------------------------------------
// La familia de contenedores de COLUMNAS del CMS. Igual que las pestañas, no tienen
// contenido visual propio: cada columna es un SLOT donde caen otros componentes. Los
// `widths` son porcentajes reales y los usa el mockup para dibujar la grilla.
const COL_ES = ['Primera', 'Segunda', 'Tercera', 'Cuarta', 'Quinta']
const COL_EN = ['First', 'Second', 'Third', 'Fourth', 'Fifth']

function layoutColumns(key, cmsName, label, widths) {
  return {
    key,
    name: `Columnas ${label}`,
    cmsName,
    category: 'Layout',
    container: true,
    slots: widths.map((w, i) => ({
      label: `${COL_ES[i]} columna`, cmsLabel: `${COL_EN[i]} column`, width: w,
    })),
    help: `Contenedor de ${widths.length} columna${widths.length > 1 ? 's' : ''} (${label}). Cada columna acepta los componentes que hagan falta.`,
    fields: [
      ...advanced(),
      // Orden exacto del panel Classy de `layout_columns_2` en Drupal.
      ...classy('background_color', 'background_position', 'spacing'),
    ],
  }
}

const T3 = 100 / 3
export const LAYOUT_COLUMNS = [
  layoutColumns('layout_columns_1', 'Layout Columns - 100', '100', [100]),
  layoutColumns('layout_columns_2', 'Layout Columns - 50', '50/50', [50, 50]),
  layoutColumns('layout_columns_3', 'Layout Columns - 33', '33/33/33', [T3, T3, T3]),
  layoutColumns('layout_columns_4', 'Layout Columns - 25', '25/25/25/25', [25, 25, 25, 25]),
  layoutColumns('layout_columns_20', 'Layout Columns - 20', '20 x5', [20, 20, 20, 20, 20]),
  layoutColumns('layout_25_75', 'Layout_25_75', '25/75', [25, 75]),
  layoutColumns('layout_75_25', 'Layout_75_25', '75/25', [75, 25]),
  layoutColumns('layout_33_66', 'Layout_33_66', '33/66', [T3, T3 * 2]),
  layoutColumns('layout_66_33', 'Layout_66_33', '66/33', [T3 * 2, T3]),
  layoutColumns('layout_25_25_50', 'Layout_25_25_50', '25/25/50', [25, 25, 50]),
  layoutColumns('layout_25_50_25', 'Layout_25_50_25', '25/50/25', [25, 50, 25]),
  layoutColumns('layout_50_25_25', 'Layout_50_25_25', '50/25/25', [50, 25, 25]),
]

export const COMPONENTS = [
  ...LAYOUT_COLUMNS,
  {
    key: 'brand_menu',
    name: 'Menú de marca',
    category: 'Navegacion',
    help: 'Barra de navegación de la marca: logo a la izquierda y los ítems del menú. El PRIMER ítem es SIEMPRE el nombre de la marca (sale de la marca de la página, no se carga acá). El fondo usa el color primario de la marca. Cada ítem puede tener subítems (uno por línea) que se despliegan al pasar el mouse.',
    fields: [
      { key: 'logo', label: 'Logo de la marca', type: 'image' },
      { key: 'items', label: 'Ítems del menú (después del nombre de la marca)', type: 'list', itemLabel: 'Ítem', sample: [
        { label: 'Productos', subitems: 'Alimento seco\nAlimento húmedo\nSnacks' },
        { label: 'Momento especial' },
        { label: 'Calidad en tus manos' },
      ], item: [
        { key: 'label', label: 'Texto', type: 'text' },
        { key: 'url', label: 'Link', type: 'url' },
        { key: 'subitems', label: 'Subítems (uno por línea, opcional)', type: 'textarea' },
      ] },
    ],
    // Mismo tamaño en desktop y mobile (por eso el logo no lleva link mobile).
    specs: [{ label: 'Logo', ratio: 'Desktop 1:1 - Mobile 1:1', desktop: '100×100px', mobile: '100×100px', max: '500kb', format: 'JPG / PNG' }],
  },
  {
    key: 'breadcrumb',
    name: 'Breadcrumb',
    category: 'Navegacion',
    help: 'Ruta de navegacion (Inicio / ...). El ultimo item es la pagina actual.',
    matrixExclude: true, // no va en el Excel de matriz (se arma solo)
    fields: [
      { key: 'items', label: 'Items (en orden)', type: 'list', itemLabel: 'Item', item: [
        { key: 'label', label: 'Texto', type: 'text' },
        { key: 'url', label: 'Link (opcional)', type: 'url' },
      ] },
    ],
  },
  {
    key: 'banner',
    name: 'Banner',
    cmsName: 'Banner',
    category: 'Hero',
    help: 'El paragraph `banner` del CMS. El Banner Type cambia el layout, no los campos. La Description es rich text y el Link es REPETIBLE.',
    fields: [
      { key: 'type', label: 'Banner Type', cmsLabel: 'Banner Type', type: 'select', cms: true, options: BANNER_TYPES },
      { key: 'remove_overlay', label: 'Remover Overlay Background', cmsLabel: 'Remover Overlay Background', type: 'checkbox', cms: true, default: false },
      // El Promotional (Only image) es solo imagen: no lleva titulo, descripcion ni
      // boton. El resto de los tipos usa todo. (hideTypes/onlyTypes)
      { key: 'title', label: 'Título', cmsLabel: 'Title', type: 'text', hideTypes: [BT_ONLY_IMAGE] },
      { key: 'title_tag', label: 'Título — HTML tag', cmsLabel: 'HTML tag (Title)', type: 'select', cms: true, hideTypes: [BT_ONLY_IMAGE], options: HTML_TAGS },
      { key: 'description', label: 'Descripción', cmsLabel: 'Description', type: 'textarea', hideTypes: [BT_ONLY_IMAGE] },
      // En el CMS es UN Media (responsive image) que resuelve solo desktop y mobile;
      // aca son dos campos porque el mercado tiene que entregar los dos archivos. Va en
      // TODOS los tipos, el Promotional incluido: ahi la imagen es lo unico que hay.
      { key: 'image', label: 'Imagen / Video (link)', cmsLabel: 'Media', type: 'image' },
      { key: 'image_mobile', label: 'Imagen / Video mobile (link)', cmsLabel: 'Media (mobile)', type: 'image' },
      // `field_c_link` es multivaluado, igual que en el bloque de Texto. A diferencia
      // de `c_text`, este widget NO trae el panel de Atributos (sin destino/rel/aria).
      { key: 'ctas', label: 'Botones', cmsLabel: 'Link', type: 'list', itemLabel: 'Link', hideTypes: [BT_ONLY_IMAGE], item: [
        { key: 'label', label: 'Texto', cmsLabel: 'Texto del enlace', type: 'text' },
        { key: 'url', label: 'Link', cmsLabel: 'URL', type: 'url' },
      ] },
      // Grupo "Search AI" del formulario: el buscador con IA sobre el banner.
      { key: 'show_search', label: 'Show Search', cmsLabel: 'Show Search', type: 'checkbox', cms: true, default: false, group: G_SEARCH },
      { key: 'search_fixed_mobile', label: 'Position Fixed Mobile', cmsLabel: 'Position Fixed Mobile', type: 'checkbox', cms: true, default: false, group: G_SEARCH, requiresTrue: 'show_search' },
      { key: 'search_suggestions', label: 'Search AI Suggestions', cmsLabel: 'Search AI Suggestions', type: 'list', itemLabel: 'Sugerencia', cms: true, group: G_SEARCH, requiresTrue: 'show_search', item: [
        { key: 'text', label: 'Sugerencia', cmsLabel: 'Search AI Suggestions', type: 'text' },
      ] },
      ...advanced(),
      // Classy del Banner: solo estos dos (orden exacto del formulario de Drupal).
      ...classy('background_color', 'banner_align'),
    ],
    // Los tamanos de imagen dependen del Banner Type (Design Guidelines 2026).
    specKey: 'type',
    defaultType: BT_MAIN_HERO,
    specsByType: {
      [BT_MAIN_HERO]: [{ ratio: 'Desktop 2:1 - Mobile 9:16', desktop: '2100×1050px', mobile: '526×936px', max: '500kb / 2-4MB', format: 'JPG / PNG / MP4 / YouTube' }],
      'title-description': [{ ratio: 'Desktop 3:1 - Mobile 1:1', desktop: '2100×700px', mobile: '526×526px', max: '500kb / 2-4MB', format: 'JPG / PNG / MP4 / YouTube' }],
      brand_hero: [{ ratio: 'Desktop 2.5:1 - Mobile 2:3', desktop: '2088×835px', mobile: '526×789px', max: '500kb / 2-4MB', format: 'JPG / PNG / MP4 / YouTube' }],
      'full-image-box-content': [{ ratio: 'Desktop ~2:1 - Mobile ~2:3', desktop: '2088×1044px', mobile: '526×789px', max: '500kb / 2-4MB', format: 'JPG / PNG / MP4 / YouTube' }],
      [BT_ONLY_IMAGE]: [{ ratio: 'Desktop 3:1 - Mobile 2:3', desktop: '2088×696px', mobile: '465×675px', max: '500kb / 2-4MB', format: 'JPG / PNG / MP4 / YouTube' }],
      // Banner Card: medidas PENDIENTES de confirmar con desarrollo.
      'banner-menu': [],
    },
  },
  {
    key: 'banner_wrapper',
    name: 'Carrusel de banners',
    cmsName: 'Banner Wrapper',
    category: 'Hero',
    help: 'El paragraph `Banner Wrapper` del CMS: NO es un banner, es el envoltorio que agrupa varios banners y los rota. Los banners van ADENTRO (se agregan desde el botón de la ranura) y cada uno se carga como cualquier otro banner. Con un solo banner adentro no rota: es lo mismo que poner el banner suelto.',
    // Contenedor de UN solo slot fijo: en el CMS los banners son un campo multivaluado
    // del wrapper, no ranuras distintas. Los hijos se ordenan entre ellos (sort_order) y
    // ese orden ES el orden de los slides.
    container: true,
    slots: [{ label: 'Banners del carrusel', cmsLabel: 'Banners' }],
    // Sin campos propios: falta el subform real de Drupal (ver CMS_PENDING_SUBFORMS), asi
    // que no se le inventa ni Classy ni configuracion de autoplay. Avanzado si va: Drupal
    // se lo agrega a TODOS los paragraphs por igual.
    fields: [...advanced()],
  },
  {
    key: 'text',
    name: 'Texto',
    cmsName: 'Content: Text',
    category: 'Contenido',
    help: 'El paragraph `c_text` del CMS. El cuerpo es el único campo propio; título y subtítulo (cada uno con su HTML tag) son opcionales. El CTA es REPETIBLE: se pueden cargar varios botones, cada uno con su destino, rel y ARIA label. La alineación, los colores, el estilo del botón y el layout de columnas salen del panel Classy.',
    fields: [
      { key: 'body', label: 'Cuerpo', cmsLabel: 'Description', type: 'textarea' },
      { key: 'title', label: 'Título', cmsLabel: 'Título', type: 'text' },
      { key: 'title_tag', label: 'Título — HTML tag', cmsLabel: 'HTML tag (Título)', type: 'select', cms: true, options: HTML_TAGS },
      { key: 'subtitle', label: 'Subtítulo', cmsLabel: 'Subtítulo', type: 'text' },
      { key: 'subtitle_tag', label: 'Subtítulo — HTML tag', cmsLabel: 'HTML tag (Subtítulo)', type: 'select', cms: true, options: HTML_TAGS },
      // `field_c_link` es multivaluado en el CMS ("Añadir otro elemento"): un bloque de
      // texto puede llevar mas de un boton.
      { key: 'ctas', label: 'Botones', cmsLabel: 'CTA', type: 'list', itemLabel: 'Botón', item: [
        { key: 'label', label: 'Texto', cmsLabel: 'Texto del enlace', type: 'text' },
        { key: 'url', label: 'Link', cmsLabel: 'URL', type: 'url' },
        { key: 'target', label: 'Destino', cmsLabel: 'Destino', type: 'select', cms: true, options: LINK_TARGETS },
        { key: 'rel', label: 'Rel (follow / nofollow)', cmsLabel: 'Rel (follow/nofollow tags). Default is blank', type: 'text', cms: true },
        { key: 'aria_label', label: 'ARIA Label', cmsLabel: 'ARIA Label', type: 'text', cms: true },
      ] },
      ...advanced(),
      // Orden exacto del panel Classy de `c_text` en Drupal.
      ...classy('background_color', 'background_position', 'content_text_styles', 'spacing', 'style_button', 'text_align', 'text_color'),
    ],
  },
  {
    key: 'text_image',
    name: 'Texto + Imagen',
    cmsName: 'Content: Text + Image',
    category: 'Contenido',
    help: 'Texto con imagen a un costado (`c_sideimagetext`). El Media va primero (desktop y mobile, cada uno con su alt) y el título con su cuerpo viven en el desplegable "Optional fields" del formulario.',
    fields: [
      // El Media va PRIMERO en el formulario, igual que en `c_image`: dos archivos,
      // cada uno con su alt. Del mercado se pide la imagen; el alt lo carga SEO.
      { key: 'image', label: 'Imagen desktop', cmsLabel: 'Image Desktop', type: 'image' },
      { key: 'image_alt', label: 'Alt text (desktop)', cmsLabel: 'Texto alternativo (Desktop)', type: 'text', cms: true },
      { key: 'image_mobile', label: 'Imagen mobile', cmsLabel: 'Image Mobile', type: 'image' },
      { key: 'image_mobile_alt', label: 'Alt text (mobile)', cmsLabel: 'Texto alternativo (Mobile)', type: 'text', cms: true },
      // Optional fields: el desplegable de Drupal donde viven el titulo y el cuerpo.
      // El cuerpo se llama "Description" en el CMS, no "Body".
      { key: 'title', label: 'Título', cmsLabel: 'Título', type: 'text', cmsGroup: G_OPTIONAL },
      { key: 'title_tag', label: 'Título — HTML tag', cmsLabel: 'HTML tag (Título)', type: 'select', cms: true, options: HTML_TAGS, cmsGroup: G_OPTIONAL },
      { key: 'body', label: 'Cuerpo', cmsLabel: 'Description', type: 'textarea', cmsGroup: G_OPTIONAL },
      { key: 'cta_label', label: 'Botón — texto', cmsLabel: 'Texto del enlace', type: 'text', cmsGroup: G_OPTIONAL },
      { key: 'cta_url', label: 'Botón — link', cmsLabel: 'URL', type: 'url', cmsGroup: G_OPTIONAL },
      // Fuera del grupo y ULTIMO a proposito: la posicion de la imagen es un campo
      // NUESTRO (el subform real de `c_sideimagetext` todavia no lo tenemos), asi que
      // no puede quedar en el medio del desplegable y cortarlo en dos.
      { key: 'image_position', label: 'Posición de la imagen', type: 'select', options: ['Izquierda', 'Derecha'] },
      // Classy PENDIENTE: falta el subform real de `c_sideimagetext` (ver TODO al pie).
      ...advanced(),
    ],
  },
  {
    key: 'accordion_grid',
    name: 'Acordeón',
    cmsName: 'Accordion Grid',
    category: 'Contenido',
    help: 'Lista de desplegables (`accordion_grid`). Cada item es un "Accordion Item" del CMS: título obligatorio con su HTML tag, y cuerpo. En el CMS cada item es un paragraph hijo, pero como lo único que lleva es título + texto, acá va como campo repetible: son los mismos datos con mucha menos maquinaria.',
    exportWidth: 820,
    fields: [
      { key: 'items', label: 'Items', cmsLabel: 'Items', type: 'list', itemLabel: 'Accordion Item', item: [
        { key: 'title', label: 'Título', cmsLabel: 'Title', type: 'text' },
        { key: 'title_tag', label: 'Título — HTML tag', cmsLabel: 'HTML tag (Title)', type: 'select', cms: true, options: HTML_TAGS },
        { key: 'text', label: 'Cuerpo', cmsLabel: 'Body', type: 'textarea' },
        // El "Avanzado" del item. El accordion_item NO tiene panel Classy en el CMS
        // (el wrapper viene vacio en el formulario), asi que aca tampoco.
        { key: 'visibility', label: 'Visibilidad (pet type)', cmsLabel: 'Paragraph visibility', type: 'select', cms: true, options: PET_VISIBILITY },
        { key: 'section_id', label: 'Section ID', cmsLabel: 'Section ID', type: 'text', cms: true },
        { key: 'css_class', label: 'Custom CSS classes', cmsLabel: 'Custom CSS classes', type: 'text', cms: true },
      ] },
      ...advanced(),
      // Orden exacto del panel Classy de `accordion_grid` en Drupal.
      ...classy('background_color', 'background_position', 'spacing', 'text_align', 'text_color'),
    ],
  },
  {
    key: 'content_image',
    name: 'Imagen',
    cmsName: 'Content: Image',
    category: 'Contenido',
    help: 'El paragraph `c_image`: una imagen con texto encima y CTA opcional. La imagen es un Media con sus dos archivos (desktop y mobile), cada uno con su alt OBLIGATORIO; acá se cargan como link + alt, que es lo único que el mercado tiene que entregar.',
    fields: [
      // El Media es obligatorio en el CMS. El editor ya sabe subirlo: lo que necesita
      // del mercado son los links y los alt.
      { key: 'image', label: 'Imagen desktop', cmsLabel: 'Image Desktop', type: 'image' },
      { key: 'image_alt', label: 'Alt text (desktop)', cmsLabel: 'Texto alternativo (Desktop)', type: 'text', cms: true },
      { key: 'image_mobile', label: 'Imagen mobile', cmsLabel: 'Image Mobile', type: 'image' },
      { key: 'image_mobile_alt', label: 'Alt text (mobile)', cmsLabel: 'Texto alternativo (Mobile)', type: 'text', cms: true },
      // Optional fields: el desplegable de Drupal, en el orden del formulario. Todo lo
      // que sigue hasta el bloque Avanzado vive adentro.
      { key: 'title', label: 'Título', cmsLabel: 'Título', type: 'text', cmsGroup: G_OPTIONAL },
      { key: 'title_tag', label: 'Título — HTML tag', cmsLabel: 'HTML tag (Título)', type: 'select', cms: true, options: HTML_TAGS, cmsGroup: G_OPTIONAL },
      { key: 'title_size', label: 'Tamaño del título', cmsLabel: 'Title Size', type: 'select', cms: true, options: TITLE_SIZES, cmsGroup: G_OPTIONAL },
      { key: 'subtitle', label: 'Subtítulo', cmsLabel: 'Subtítulo', type: 'text', cmsGroup: G_OPTIONAL },
      { key: 'subtitle_tag', label: 'Subtítulo — HTML tag', cmsLabel: 'HTML tag (Subtítulo)', type: 'select', cms: true, options: HTML_TAGS, cmsGroup: G_OPTIONAL },
      { key: 'subtitle_size', label: 'Tamaño del subtítulo', cmsLabel: 'SubTitle Size', type: 'select', cms: true, options: SUBTITLE_SIZES, cmsGroup: G_OPTIONAL },
      { key: 'ctas', label: 'Botones', cmsLabel: 'CTA', type: 'list', itemLabel: 'Botón', cmsGroup: G_OPTIONAL, item: [
        { key: 'label', label: 'Texto', cmsLabel: 'Texto del enlace', type: 'text' },
        { key: 'url', label: 'Link', cmsLabel: 'URL', type: 'url' },
        { key: 'target', label: 'Destino', cmsLabel: 'Destino', type: 'select', cms: true, options: LINK_TARGETS },
        { key: 'rel', label: 'Rel (follow / nofollow)', cmsLabel: 'Rel (follow/nofollow tags). Default is blank', type: 'text', cms: true },
        { key: 'aria_label', label: 'ARIA Label', cmsLabel: 'ARIA Label', type: 'text', cms: true },
      ] },
      { key: 'body', label: 'Cuerpo', cmsLabel: 'Description', type: 'textarea', cmsGroup: G_OPTIONAL },
      ...advanced(),
      // Orden exacto del panel Classy de `c_image` en Drupal.
      ...classy('background_color', 'background_position', 'image_position', 'image_style',
        'spacing', 'style_button', 'text_align', 'text_color'),
    ],
  },
  {
    key: 'services_carousel',
    name: 'Carrusel de servicios',
    category: 'Carruseles',
    help: 'Bloque "Aliados y Servicios": titulo sobre una imagen de fondo + tarjetas de servicio (una destacada).',
    fields: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'title_tag', label: 'Título — HTML tag', type: 'select', cms: true, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'background', label: 'Imagen de fondo', type: 'image' },
      { key: 'background_mobile', label: 'Imagen de fondo mobile', type: 'image' },
      { key: 'cards', label: 'Tarjetas', type: 'list', itemLabel: 'Tarjeta', item: [
        { key: 'icon', label: 'Icono', type: 'select', options: ['pata'] },
        { key: 'title', label: 'Título', type: 'text' },
        { key: 'text', label: 'Texto', type: 'textarea' },
        { key: 'url', label: 'Link', type: 'url' },
        { key: 'highlighted', label: 'Destacada (roja)', type: 'select', options: ['No', 'Si'] },
      ] },
    ],
    specs: [{ label: 'Fondo', ratio: 'Desktop 16:9 · Mobile 9:16', desktop: '2160×1212px', mobile: '562×999px', max: '500kb', format: 'JPG / PNG' }],
  },
  {
    key: 'articles_carousel',
    name: 'Carrusel de articulos',
    category: 'Carruseles',
    help: 'Sección "Nuestro Blog": cabecera + carrusel de artículos (imagen con chip de categoría y título superpuestos, botón +). Card destacada más grande a la izquierda.',
    fields: [
      { key: 'title', label: 'Título', type: 'text', placeholder: 'Nuestro Blog' },
      { key: 'title_tag', label: 'Título — HTML tag', type: 'select', cms: true, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
      { key: 'subtitle', label: 'Subtítulo', type: 'text', placeholder: 'Artículos pensados para ti y tu mascota' },
      // En el CMS el articulo se SELECCIONA (no se cargan imagen/categoria/link):
      // por eso en el Excel de matriz solo va el titulo del articulo. El resto se
      // marca cms:true (sigue editable en el builder para el mockup, pero no exporta).
      { key: 'cards', label: 'Artículos', type: 'list', itemLabel: 'Artículo', item: [
        { key: 'image', label: 'Imagen', type: 'image', cms: true },
        { key: 'category', label: 'Categoria (chip)', type: 'text', cms: true },
        { key: 'category_color', label: 'Color del chip (hex)', type: 'text', placeholder: '#582d84', cms: true },
        { key: 'title', label: 'Título del artículo', type: 'text' },
        { key: 'url', label: 'Link', type: 'url', cms: true },
      ] },
      { key: 'see_more_text', label: 'Botón — texto', type: 'text', placeholder: 'Explora más artículos' },
      { key: 'see_more_url', label: 'Botón — link', type: 'url' },
    ],
  },
  {
    key: 'footer_banner',
    name: 'Banner CTA',
    category: 'Componentes reusables',
    help: 'Banner con forma de pastilla oscura (Pet Club): logo + título + texto + botón. Los cuadros decorativos de los lados son fijos (no editables).',
    reusable: true, // reutilizable: en el Excel de una pagina va con los campos deshabilitados
    fields: [
      { key: 'title', label: 'Título', type: 'text', placeholder: 'Lo mejor para tu mascota empieza aquí' },
      { key: 'title_tag', label: 'Título — HTML tag', type: 'select', cms: true, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
      { key: 'subtitle', label: 'Texto', type: 'textarea' },
      { key: 'button_text', label: 'Botón — texto', type: 'text', placeholder: 'Unirme al club' },
      { key: 'button_url', label: 'Botón — link', type: 'url' },
    ],
  },
  {
    key: 'testimonials',
    name: 'Carrusel de testimonios',
    category: 'Carruseles',
    help: 'Sección "Historias que inspiran": imagen ovalada a la izquierda + cita, autor y botón a la derecha, con flechas de carrusel.',
    fields: [
      { key: 'eyebrow', label: 'Antetítulo', type: 'text', placeholder: 'Historias que inspiran' },
      { key: 'title_tag', label: 'Antetítulo — HTML tag', type: 'select', cms: true, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
      { key: 'items', label: 'Testimonios', type: 'list', itemLabel: 'Testimonio', item: [
        { key: 'image', label: 'Imagen', type: 'image' },
        { key: 'image_mobile', label: 'Imagen mobile', type: 'image' },
        { key: 'image_title', label: 'Texto sobre la imagen (opcional)', type: 'text' },
        { key: 'quote', label: 'Cita', type: 'textarea' },
        { key: 'author', label: 'Autor', type: 'text' },
      ] },
      { key: 'button_text', label: 'Botón — texto', type: 'text', placeholder: 'Compartir mi historia' },
      { key: 'button_url', label: 'Botón — link', type: 'url' },
    ],
    specs: [{ label: 'Imagen', ratio: 'Desktop 1.5:1', desktop: '1552×1014px', mobile: '670×446px', max: '500kb', format: 'JPG / PNG' }],
  },
  {
    key: 'species_selector',
    name: 'Selector de especie',
    category: 'Componentes reusables',
    help: 'Selector de mascota Gato / Perro (estático, con los íconos de gato y perro). Solo se editan el título y el subtítulo.',
    reusable: true, // reutilizable: en el Excel de una pagina va con los campos deshabilitados
    fields: [
      { key: 'title', label: 'Título', type: 'text', placeholder: 'Quién manda en tu casa' },
      { key: 'title_tag', label: 'Título — HTML tag', type: 'select', cms: true, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
      { key: 'subtitle', label: 'Subtítulo', type: 'text', placeholder: 'Elige tu mascota para personalizar tu experiencia:' },
    ],
  },
  {
    key: 'brand_cards',
    name: 'Carrusel de marcas',
    category: 'Marcas',
    help: 'Sección "Marcas Purina®": cabecera + carrusel de marcas. Cada card = imagen de marca (con toggles perro/gato) + pie gris con nombre y bajada. Botón "Ver todas".',
    fields: [
      { key: 'title', label: 'Título', type: 'text', placeholder: 'Marcas Purina®' },
      { key: 'title_tag', label: 'Título — HTML tag', type: 'select', cms: true, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
      { key: 'subtitle', label: 'Subtítulo', type: 'text', placeholder: 'La variedad que buscas, con la confianza de Purina®' },
      { key: 'cards', label: 'Marcas', type: 'list', itemLabel: 'Marca', item: [
        { key: 'image', label: 'Imagen de marca', type: 'image' },
        { key: 'name', label: 'Nombre', type: 'text' },
        { key: 'description', label: 'Bajada', type: 'textarea' },
        // "Sin iconos" (noneOption) apaga los iconos perro/gato sobre la imagen: sirve
        // cuando el carrusel se usa para algo que no es una marca (pasos, refugios...).
        // Elegido, el campo tampoco baja al Excel: no hay nada que cargar.
        { key: 'pets', label: 'Aplica a', type: 'select', options: ['Perro + Gato', 'Perro', 'Gato', 'Sin iconos'], noneOption: 'Sin iconos' },
        { key: 'url', label: 'Link', type: 'url' },
      ] },
      { key: 'see_more_text', label: 'Botón — texto', type: 'text', placeholder: 'Ver todas' },
      { key: 'see_more_url', label: 'Botón — link', type: 'url' },
    ],
    specs: [{ label: 'Imagen de marca', ratio: 'Desktop 4:3 · Mobile 4:3', desktop: '822×616px', mobile: '822×616px', max: '500kb', format: 'JPG / PNG' }],
  },
  {
    key: 'product_list',
    name: 'Carrusel de productos',
    category: 'Marcas',
    help: 'Sección "Más populares": tabs de filtro + carrusel de productos. Los productos los POPULA la vista del CMS (son pulleados): acá cada producto es solo un placeholder con el nombre, sin imagen. La card Pet ID es un componente fijo no editable (checkbox mostrar/ocultar).',
    fields: [
      { key: 'title', label: 'Título (opcional)', type: 'text', placeholder: 'Explora Pro Plan® y encuentra la nutrición ideal con apoyo experto' },
      { key: 'title_tag', label: 'Título — HTML tag', type: 'select', cms: true, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
      // Imagen izquierda OPCIONAL: toggle del builder (cms). Si esta activo, se muestra
      // la columna de imagen a la izquierda del carrusel y su campo se exporta.
      { key: 'show_left_image', label: 'Mostrar imagen izquierda', type: 'checkbox', cms: true, default: false },
      { key: 'left_image', label: 'Imagen izquierda', type: 'image', requiresTrue: 'show_left_image' },
      // Filtro por categoria: toggle SOLO del builder (cms, no se exporta). Si esta
      // activo, el campo de tabs SI se exporta (requires: 'show_filters'); si no, se oculta.
      { key: 'show_filters', label: 'Activar filtros de categoría', type: 'checkbox', cms: true },
      { key: 'filters', label: 'Pestañas de filtro (separadas por coma)', type: 'text', placeholder: 'Más populares, Seco, Húmedo, Snacks', requires: 'show_filters' },
      // Pet ID: componente fijo (no editable). Checkbox solo del builder (cms) para
      // mostrar/ocultar la card; NO sale como campo en el Excel.
      { key: 'show_petid', label: 'Mostrar card Pet ID', type: 'checkbox', cms: true },
      // Productos pulleados por el CMS: en la matriz solo el nombre (sin imagen).
      { key: 'products', label: 'Productos', type: 'list', itemLabel: 'Producto', item: [
        { key: 'title', label: 'Nombre', type: 'text' },
      ] },
      { key: 'see_more_text', label: 'Botón — texto', type: 'text', placeholder: 'Ver todos' },
      { key: 'see_more_url', label: 'Botón — link', type: 'url' },
    ],
    // Imagen izquierda opcional: mismo tamaño en desktop y mobile (por eso sin link
    // mobile). La spec solo aplica si la imagen izquierda esta activada.
    specs: [{ label: 'Imagen izquierda (imagen única)', ratio: 'Vertical ≈0.94:1 (650×692)', desktop: '650×692px', mobile: '650×692px', max: '500kb', format: 'JPG / PNG', requiresTrue: 'show_left_image' }],
  },
  {
    key: 'timeline',
    name: 'Línea de tiempo',
    category: 'Contenido',
    help: 'Sección "Historia": título + subtítulo centrados y una línea de tiempo horizontal (carrusel). Cada hito: año en pill roja sobre la línea, imagen, título y descripción; un punto rojo cierra el conector.',
    fields: [
      { key: 'title', label: 'Título', type: 'text', placeholder: 'Historia Purina®' },
      { key: 'title_tag', label: 'Título — HTML tag', type: 'select', cms: true, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
      { key: 'subtitle', label: 'Subtítulo', type: 'text', placeholder: 'Ayudamos a los dueños de mascotas a asegurar que sus adorables perros y gatos disfruten de una vida más larga, saludable y feliz.' },
      { key: 'items', label: 'Hitos', type: 'list', itemLabel: 'Hito', item: [
        { key: 'year', label: 'Año', type: 'text' },
        { key: 'image', label: 'Imagen', type: 'image' },
        { key: 'title', label: 'Título', type: 'text' },
        { key: 'description', label: 'Descripción', type: 'textarea' },
      ] },
    ],
    specs: [{ ratio: 'Desktop 4:3 · Mobile 4:3', desktop: '670×502px', mobile: '670×502px', max: '500kb', format: 'JPG / PNG' }],
  },
  {
    key: 'commitment_carousel',
    name: 'Carrusel de cards',
    category: 'Carruseles',
    // REEMPLAZADO por card_grid: sus variantes son modos de vista del mismo paragraph.
    deprecated: 'Card Grid',
    help: 'Carrusel de cards con header (título + subtítulo) y flechas. Cinco VARIANTES: verticales con imagen a sangre (la de "Compromiso Purina®"), con icono sobre una banda de color, dos apaisadas que se diferencian en dónde va el texto, y numeradas (cards blancas sin imagen, con el número en un chip arriba). El número NO se carga: sale del orden de las cards. La flecha circular de una card aparece cuando esa card tiene link. El color de fondo del bloque y el del título/subtítulo se configuran por página; el color del texto NO toca el contenido de las cards.',
    fields: [
      // `type` (y no otro nombre) porque es la key que filtra campos por variante y
      // resuelve las specs, igual que el Banner Type.
      { key: 'type', label: 'Variante', type: 'select', cms: true, options: CMT_VARIANTS },
      { key: 'title', label: 'Título', type: 'text', placeholder: 'Compromiso Purina®' },
      { key: 'title_tag', label: 'Título — HTML tag', type: 'select', cms: true, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
      { key: 'subtitle', label: 'Subtítulo', type: 'text', placeholder: 'La nutrición de las mascotas es clave, pero hacemos más por ellas, sus dueños y el planeta. Este es nuestro Compromiso Purina®.' },
      // FONDO DEL BLOQUE. Son dos keys para el mismo concepto, y nunca se ven juntas:
      // en la variante con iconos la banda de color es parte del diseño y HEREDA de la
      // marca (`color`, que ya existia); en el resto el fondo es opcional y por defecto
      // NO hay ninguno (`background_color`), para no repintar las paginas ya armadas.
      { key: 'color', label: 'Color de fondo del bloque', type: 'color', cms: true, clearable: true, onlyTypes: [CMT_ICON] },
      { key: 'background_color', label: 'Color de fondo del bloque', type: 'color', cms: true, clearable: true, hideTypes: [CMT_ICON] },
      // Afecta SOLO al header (titulo, subtitulo y flechas), no al texto de las cards.
      { key: 'text_color', label: 'Color del título y subtítulo', type: 'color', cms: true, clearable: true },
      // En las numeradas el color no es un fondo: pinta el chip del numero y el titulo.
      { key: 'accent', label: 'Color de los números y títulos de las cards', type: 'color', cms: true, brandDefault: true, onlyTypes: [CMT_NUMBERS] },
      { key: 'items', label: 'Cards', type: 'list', itemLabel: 'Card', item: [
        { key: 'icon', label: 'Icono', type: 'select', options: ['pata', 'gato', 'perro'], onlyTypes: [CMT_ICON] },
        { key: 'image', label: 'Imagen', type: 'image', hideTypes: [CMT_ICON, CMT_NUMBERS] },
        { key: 'image_mobile', label: 'Imagen mobile', type: 'image', onlyTypes: [CMT_VERTICAL] },
        { key: 'title', label: 'Título', type: 'text' },
        { key: 'description', label: 'Descripción', type: 'textarea' },
        { key: 'url', label: 'Link', type: 'url' },
      ] },
    ],
    specKey: 'type',
    defaultType: CMT_VERTICAL,
    specsByType: {
      [CMT_VERTICAL]: [{ ratio: 'Desktop 1:1.5 - Mobile 1:1.15', desktop: '822×1230px', mobile: '670×1004px', max: '500kb', format: 'JPG / PNG' }],
      // Sin imagen: la card es un icono sobre la banda de color / un numero en un chip.
      [CMT_ICON]: [],
      [CMT_NUMBERS]: [],
      // Medidas en px PENDIENTES de confirmar con desarrollo; por ahora solo el ratio.
      [CMT_WIDE_BOTTOM]: [{ ratio: 'Desktop 3:2 - Mobile 3:2', max: '500kb', format: 'JPG / PNG' }],
      [CMT_WIDE_TOP]: [{ ratio: 'Desktop 3:2 - Mobile 3:2', max: '500kb', format: 'JPG / PNG' }],
    },
  },
  {
    key: 'card_grid',
    name: 'Card Grid',
    cmsName: 'Content: Card Grid',
    category: 'Carruseles',
    help: 'El componente del CMS del que salen el mosaico y todas las variantes de cards: lo que cambia el layout es el "Modo de vista", no el componente. Cada card es un "Content: Card Grid Item" con su título, icono, descripción, imagen (desktop y mobile, con alt) y CTA.',
    fields: [
      { key: 'view_mode', label: 'Modo de vista', cmsLabel: 'Modo de vista', type: 'select', cms: true, options: CARD_GRID_MODES,
        hint: 'Es el campo obligatorio del CMS. Cambia el layout de todo el bloque.' },
      // Titulo y subtitulo del BLOQUE (no los de cada card) viven en el desplegable
      // "Optional fields" de Drupal: si el editor no lo abre, no los encuentra.
      { key: 'title', label: 'Título', cmsLabel: 'Título', type: 'text', cmsGroup: G_OPTIONAL },
      { key: 'title_tag', label: 'Título — HTML tag', cmsLabel: 'HTML tag (Título)', type: 'select', cms: true, options: HTML_TAGS, cmsGroup: G_OPTIONAL },
      { key: 'subtitle', label: 'Subtítulo', cmsLabel: 'Subtitle', type: 'textarea', cmsGroup: G_OPTIONAL },
      { key: 'subtitle_tag', label: 'Subtítulo — HTML tag', cmsLabel: 'HTML tag (Subtitle)', type: 'select', cms: true, options: HTML_TAGS, cmsGroup: G_OPTIONAL },
      { key: 'background_image', label: 'Imagen de fondo (opcional)', cmsLabel: 'Background Image', type: 'image' },
      { key: 'items', label: 'Cards', cmsLabel: 'Subitems', type: 'list', itemLabel: 'Card', item: [
        { key: 'title', label: 'Título', cmsLabel: 'Título', type: 'text' },
        // El titulo de una CARD siempre cuelga del titulo del bloque, asi que su tag por
        // defecto es h3 y no "- Ninguno -": es lo que hay que poner en el CMS salvo que
        // se elija otra cosa a proposito.
        { key: 'title_tag', label: 'Título — HTML tag', cmsLabel: 'HTML tag (Título)', type: 'select', cms: true, options: HTML_TAGS, default: 'h3' },
        { key: 'icon', label: 'Icono', cmsLabel: 'Icon', type: 'select', options: CMS_ICONS, hideTypes: CARD_GRID_IMAGE_MODES },
        { key: 'description', label: 'Descripción', cmsLabel: 'Description', type: 'textarea' },
        { key: 'subtitle', label: 'Subtítulo (opcional)', cmsLabel: 'Subtítulo', type: 'text' },
        { key: 'subtitle_tag', label: 'Subtítulo — HTML tag', cmsLabel: 'HTML tag (Subtítulo)', type: 'select', cms: true, options: HTML_TAGS },
        { key: 'image', label: 'Imagen desktop', cmsLabel: 'Image Desktop', type: 'image', hideTypes: CARD_GRID_ICON_MODES },
        { key: 'image_alt', label: 'Alt text (desktop)', cmsLabel: 'Texto alternativo (Desktop)', type: 'text', cms: true,
          hideTypes: CARD_GRID_ICON_MODES },
        { key: 'image_mobile', label: 'Imagen mobile', cmsLabel: 'Image Mobile', type: 'image', hideTypes: CARD_GRID_ICON_MODES },
        { key: 'image_mobile_alt', label: 'Alt text (mobile)', cmsLabel: 'Texto alternativo (Mobile)', type: 'text', cms: true,
          hideTypes: CARD_GRID_ICON_MODES },
        { key: 'cta_label', label: 'Botón — texto', cmsLabel: 'Texto del enlace', type: 'text' },
        { key: 'cta_url', label: 'Botón — link', cmsLabel: 'URL', type: 'url' },
        { key: 'cta_target', label: 'Botón — destino', cmsLabel: 'Destino', type: 'select', cms: true, options: LINK_TARGETS },
        { key: 'bg_color', label: 'Color de fondo de la card', cmsLabel: 'Background Color (item)', type: 'select', cms: true, options: BG_COLORS },
        { key: 'section_id', label: 'Section ID', cmsLabel: 'Section ID', type: 'text', cms: true },
        { key: 'css_class', label: 'Custom CSS classes', cmsLabel: 'Custom CSS classes', type: 'text', cms: true },
      ] },
      ...advanced(),
      // Orden exacto del panel Classy de `ln_c_cardgrid` en Drupal.
      ...classy('background_color', 'background_card_color', 'background_degrade_color',
        'text_color', 'title_card_color', 'text_card_color', 'icon_card_color',
        'background_position',
        // El estilo de card no es libre: lo pide el layout. Las apaisadas van en
        // "Card Grid Default Square".
        { key: 'card_style_card', defaultByType: { 'slider-background-default-card': 'card_grid_default_square' } },
        'card_title_position', 'position_arrows',
        'text_align', 'spacing'),
    ],
    specKey: 'view_mode',
    defaultType: CARD_GRID_DEFAULT_MODE,
    specsByType: {
      // Medidas PENDIENTES de confirmar por modo de vista; la unica que tenemos
      // documentada es la de las cards verticales (Brand cards del Design Guidelines).
      'slider-default-card': [{ ratio: 'Desktop 1:1.5 - Mobile 1:1.5', desktop: '822×1230px', mobile: '670×1004px', max: '500kb', format: 'JPG / PNG' }],
      'grid-cards': [{ label: 'Imagen de la card', ratio: 'Desktop 1:1', desktop: '760×760px', max: '500kb', format: 'JPG / PNG' }],
    },
  },
  {
    key: 'fifty_fifty',
    name: '50/50',
    category: 'Contenido',
    // REEMPLAZADO: en el CMS esto no es un componente, son TRES — un `layout_columns_2`
    // con un `c_text` en la primera columna y un `accordion_grid` (o otro texto) en la
    // segunda. Sigue renderizando lo ya armado, pero no se puede agregar uno nuevo.
    deprecated: 'Columnas 50/50 + Acordeón',
    help: 'Bloque a dos columnas (50/50): título + texto a la izquierda; a la derecha, un texto o un desplegable (acordeón) de items (título + texto). El item abierto marca su título en rojo.',
    exportWidth: 820, // se captura mas angosto para que la imagen del Excel no salga tan baja
    fields: [
      { key: 'title', label: 'Titulo (izquierda)', type: 'text', placeholder: 'Nutriendo mascotas. Enriqueciendo vidas.' },
      { key: 'title_tag', label: 'Título — HTML tag', type: 'select', cms: true, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
      { key: 'text', label: 'Texto (izquierda)', type: 'textarea' },
      { key: 'right_type', label: 'Columna derecha', type: 'select', cms: true, options: ['Desplegable', 'Texto'] },
      { key: 'right_text', label: 'Texto (derecha)', type: 'textarea' },
      { key: 'items', label: 'Desplegables', type: 'list', itemLabel: 'Item', item: [
        { key: 'title', label: 'Título', type: 'text' },
        { key: 'text', label: 'Texto', type: 'textarea' },
      ] },
    ],
  },
  {
    key: 'gradient_cards',
    name: 'Banner con tarjetas',
    category: 'Contenido',
    help: 'Banner con fondo en gradiente (color configurable): título + subtítulo centrados arriba y una fila de tarjetas (ícono + título + texto) sobre el gradiente. La imagen de fondo es opcional.',
    fields: [
      { key: 'title', label: 'Título', type: 'text', placeholder: 'Dorem ipsum dolor sit' },
      { key: 'title_tag', label: 'Título — HTML tag', type: 'select', cms: true, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
      { key: 'subtitle', label: 'Subtítulo', type: 'text', placeholder: 'Corem ipsum dolor sit amet, consectetur adipiscing elit.' },
      { key: 'color', label: 'Color del gradiente', type: 'color', cms: true },
      { key: 'background', label: 'Imagen de fondo (opcional)', type: 'image' },
      { key: 'background_mobile', label: 'Imagen de fondo mobile (opcional)', type: 'image' },
      { key: 'cards', label: 'Tarjetas', type: 'list', itemLabel: 'Tarjeta', sample: [
        { icon: 'gato', title: 'Dorem ipsum', text: 'Yorem ipsum dolor sit amet, consectetur adipiscing elit' },
        { icon: 'gato', title: 'Adipiscing elit', text: 'Morem ipsum dolor sit amet, consectetur adipiscing elit.' },
        { icon: 'gato', title: 'Forem ipsum dolor', text: 'Corem ipsum dolor sit amet, consectetur adipiscing elit.' },
      ], item: [
        { key: 'icon', label: 'Icono', type: 'select', options: ['pata', 'gato', 'perro'] },
        { key: 'title', label: 'Título', type: 'text' },
        { key: 'text', label: 'Texto', type: 'textarea' },
        { key: 'url', label: 'Link', type: 'url' },
      ] },
    ],
    specs: [{ label: 'Fondo', ratio: 'Desktop 1:1 · Mobile ~9:16 (aprox., para adecuar a la cantidad de texto de la descripción)', desktop: '2784×1994px', mobile: '702×1600px', max: '500kb', format: 'JPG / PNG' }],
  },
  {
    key: 'text_wide_image',
    name: 'Texto con imagen ancha',
    category: 'Contenido',
    help: 'Título a la izquierda, una imagen ancha debajo y un párrafo de texto al pie.',
    fields: [
      { key: 'title', label: 'Título', type: 'text', placeholder: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
      { key: 'title_tag', label: 'Título — HTML tag', type: 'select', cms: true, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
      { key: 'image', label: 'Imagen', type: 'image' },
      { key: 'body', label: 'Texto', type: 'textarea' },
    ],
    specs: [{ ratio: 'Desktop 16:6', desktop: '2100×760px', max: '500kb', format: 'JPG / PNG' }],
  },
  {
    key: 'image_features',
    name: 'Imagen + destacados',
    category: 'Contenido',
    help: 'Título + subtítulo centrados, una imagen ancha y una fila de destacados (ícono + título de color configurable + texto).',
    fields: [
      { key: 'title', label: 'Título', type: 'text', placeholder: 'Worem ipsum dolor sit amet, consectetur adipiscing elit' },
      { key: 'title_tag', label: 'Título — HTML tag', type: 'select', cms: true, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
      { key: 'subtitle', label: 'Subtítulo', type: 'text', placeholder: 'Vorem ipsum dolor sit amet, consectetur adipiscing elit.' },
      { key: 'color', label: 'Color de los títulos', type: 'color', cms: true },
      { key: 'image', label: 'Imagen', type: 'image' },
      { key: 'features', label: 'Destacados', type: 'list', itemLabel: 'Destacado', sample: [
        { icon: 'gato', title: 'Rorem ipsum dolor sit amet, consectetur', text: 'Worem ipsum dolor sit amet, consectetur adipiscing elit.' },
        { icon: 'gato', title: 'Jorem ipsum dolor sit amet, consectetur adipiscing elit', text: 'Yorem ipsum dolor sit amet, consectetur adipiscing elit.' },
        { icon: 'gato', title: 'Lorem ipsum dolor sit amet, consectetur', text: 'Porem ipsum dolor sit amet, consectetur adipiscing elit.' },
      ], item: [
        { key: 'icon', label: 'Icono', type: 'select', options: ['pata', 'gato', 'perro'] },
        { key: 'title', label: 'Título', type: 'text' },
        { key: 'text', label: 'Texto', type: 'textarea' },
      ] },
    ],
    specs: [{ ratio: 'Desktop 16:9', desktop: '2160×1080px', max: '500kb', format: 'JPG / PNG' }],
  },
  {
    key: 'tabs',
    name: 'Pestañas',
    cmsName: 'Tabs',
    category: 'Contenido',
    help: 'Bloque con pestañas (`comp_tabs`, con un `comp_tabs_tab_item` por pestaña). Cada pestaña tiene su nombre y una descripción opcional, y ADENTRO puede llevar los componentes que hagan falta: se agregan desde el botón que aparece dentro de la pestaña activa.',
    // Contenedor de slots VARIABLES: hay un slot por pestaña cargada, y los hijos
    // apuntan al suyo con `tab_index` (ver slotsOf).
    container: true,
    fields: [
      { key: 'title', label: 'Título (opcional)', type: 'text', placeholder: 'Título de la sección' },
      { key: 'title_tag', label: 'Título — HTML tag', type: 'select', cms: true, options: HTML_TAGS },
      { key: 'subtitle', label: 'Subtítulo (opcional)', type: 'textarea' },
      { key: 'tabs', label: 'Pestañas', type: 'list', itemLabel: 'Pestaña', sample: TAB_SAMPLE, item: [
        { key: 'label', label: 'Nombre de la pestaña', type: 'text' },
        { key: 'description', label: 'Descripción (opcional)', type: 'textarea' },
      ] },
      // Classy PENDIENTE: falta el subform real de `comp_tabs` (ver TODO al pie).
      ...advanced(),
    ],
  },
  {
    key: 'external_video',
    name: 'Video externo',
    category: 'Contenido',
    help: 'Video embebido a lo ancho (YouTube o MP4): título y subtítulo opcionales arriba, y el video con el botón de play encima. El preview NO se carga a mano: sale del propio YouTube.',
    fields: [
      { key: 'title', label: 'Título (opcional)', type: 'text', placeholder: 'External Video' },
      { key: 'title_tag', label: 'Título — HTML tag', type: 'select', cms: true, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
      { key: 'subtitle', label: 'Subtítulo (opcional)', type: 'textarea' },
      { key: 'video_url', label: 'Link del video (YouTube o MP4)', type: 'url' },
    ],
    specs: [
      { label: 'Video', ratio: 'Desktop 16:9 - Mobile 16:9', max: '2-4MB', format: 'MP4 / YouTube' },
    ],
  },
  {
    key: 'mosaic',
    name: 'Mosaico',
    category: 'Contenido',
    // REEMPLAZADO por card_grid en modo grid-cards, que es lo que existe en el CMS.
    // Sigue renderizando las paginas ya armadas, pero no se puede agregar uno nuevo.
    deprecated: 'Card Grid — Grid Cards',
    help: 'Grilla tipo mosaico que alterna imágenes con cajas de contenido (color configurable) con título y texto. Los bloques se alternan automáticamente (imagen, caja, imagen…): cargá la imagen en los de imagen y el título/texto en los de contenido.',
    fields: [
      { key: 'title', label: 'Título', type: 'text', placeholder: 'Worem ipsum dolor sit amet, consectetur adipiscing elit' },
      { key: 'title_tag', label: 'Título — HTML tag', type: 'select', cms: true, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
      { key: 'subtitle', label: 'Subtítulo', type: 'text', placeholder: 'Vorem ipsum dolor sit amet, consectetur adipiscing elit.' },
      // Un solo color para TODAS las cajas de contenido (las que alternan con las
      // imagenes). Por defecto usa el secundario de la marca (ej. Pro Plan #d7bb77).
      { key: 'color', label: 'Color de las cajas', type: 'color', cms: true, brandDefault: true },
      // El mosaico tiene SIEMPRE 6 bloques fijos que alternan imagen / contenido. Cada
      // bloque muestra solo los campos de su rol (roles + subcampos con roles).
      { key: 'blocks', label: 'Bloques', type: 'list', itemLabel: 'Bloque', fixed: 6,
        roles: ['Imagen', 'Contenido', 'Imagen', 'Contenido', 'Imagen', 'Contenido'], sample: [
        {}, { title: 'Sorem ipsum dolor sit amet, consectetur.', text: 'Worem ipsum dolor sit amet, consectetur adipiscing elit.' },
        {}, { title: 'Borem ipsum dolor sit amet, consectetur.', text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
        {}, { title: 'Porem ipsum dolor sit amet, consectetur.', text: 'Torem ipsum dolor sit amet, consectetur adipiscing elit.' },
      ], item: [
        { key: 'image', label: 'Imagen', type: 'image', roles: ['Imagen'] },
        { key: 'title', label: 'Título', type: 'text', roles: ['Contenido'] },
        { key: 'text', label: 'Texto', type: 'textarea', roles: ['Contenido'] },
      ] },
    ],
    specs: [{ label: 'Imagen del mosaico', ratio: 'Desktop 1:1', desktop: '760×760px', max: '500kb', format: 'JPG / PNG' }],
  },
  {
    key: 'stats_grid',
    name: 'Grilla de números',
    category: 'Contenido',
    help: 'Título centrado y una fila de estadísticas: número grande (color configurable), etiqueta y una línea inferior.',
    fields: [
      { key: 'title', label: 'Título', type: 'text', placeholder: 'Forem ipsum dolor sit amet.' },
      { key: 'title_tag', label: 'Título — HTML tag', type: 'select', cms: true, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
      { key: 'color', label: 'Color de los números', type: 'color', cms: true },
      { key: 'stats', label: 'Números', type: 'list', itemLabel: 'Número', sample: [
        { value: '40+', label: 'Torem ipsum dolor sit amet' },
        { value: '540+', label: 'Porem ipsum dolor sit amet' },
        { value: '300+', label: 'Korem ipsum dolor sit amet' },
        { value: '25+', label: 'Jorem ipsum dolor sit amet' },
      ], item: [
        { key: 'value', label: 'Número', type: 'text', placeholder: '40+' },
        { key: 'label', label: 'Etiqueta', type: 'text' },
      ] },
    ],
  },
  {
    key: 'logo_cards',
    name: 'Cards con logo',
    category: 'Contenido',
    help: 'Sección oscura: título + subtítulo centrados y dos (o más) cards grandes con imagen de fondo, un título, una lista de bullets y un botón. Pensada para páginas de marca (ej. Pro Plan). Cada bullet va en una línea.',
    fields: [
      { key: 'title', label: 'Título', type: 'text', placeholder: 'Respaldo experto para quienes cuidan su salud' },
      { key: 'title_tag', label: 'Título — HTML tag', type: 'select', cms: true, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
      { key: 'subtitle', label: 'Subtítulo', type: 'textarea', placeholder: 'Purina® Pro Plan® acompaña a médicos veterinarios con herramientas, conocimiento y servicios diseñados para apoyar su práctica clínica y fortalecer cada decisión nutricional.' },
      { key: 'cards', label: 'Cards', type: 'list', itemLabel: 'Card', sample: [
        { title: 'Ciencia aplicada a la nutrición', bullets: 'Investigación actualizada en nutrición de perros y gatos\nContenidos educativos y formación continua\nHerramientas para la toma de decisiones nutricionales', cta_label: 'Explorar recursos' },
        { title: 'Soluciones para la práctica diaria', bullets: 'Plataforma exclusiva para médicos veterinarios\nAcceso a materiales técnicos y guías clínicas\nContenidos profesionales y especializados', cta_label: 'Acceder a la plataforma' },
      ], item: [
        { key: 'image', label: 'Imagen de fondo', type: 'image' },
        { key: 'image_mobile', label: 'Imagen de fondo mobile', type: 'image' },
        { key: 'title', label: 'Título', type: 'text' },
        { key: 'bullets', label: 'Bullets (uno por línea)', type: 'textarea' },
        { key: 'cta_label', label: 'Botón — texto', type: 'text' },
        { key: 'cta_url', label: 'Botón — link', type: 'url' },
      ] },
    ],
    specs: [{ label: 'Imagen de fondo', ratio: 'Desktop ~1.38:1 · Mobile ~2:3', desktop: '768×557px', mobile: '702×1048px', max: '500kb', format: 'JPG / PNG' }],
  },
]

export const COMPONENT_BY_KEY = Object.fromEntries(COMPONENTS.map((c) => [c.key, c]))

export function getComponent(key) {
  return COMPONENT_BY_KEY[key] || null
}

// PALETA del builder. Un item puede ser un componente a secas, o un ATAJO: el mismo
// componente con algo de contenido ya puesto. Los modos de vista del Card Grid entran
// como atajos, asi se elige por como se ve y no por el nombre tecnico del modo — pero
// lo que se guarda es siempre un `card_grid` con su `view_mode`, o sea exactamente lo
// que existe en el CMS.
const CG = (name, view_mode, help) => ({
  key: `card_grid:${view_mode}`, name, help, component_key: 'card_grid', content: { view_mode },
  category: 'Carruseles',
})
export const PALETTE = [
  ...COMPONENTS.filter((c) => c.key !== 'card_grid' && !c.deprecated).map((c) => ({
    key: c.key, name: c.name, help: c.help, component_key: c.key, content: {},
    container: c.container, category: c.category || 'Otros',
  })),
  CG('Mosaico', 'grid-cards', 'Card Grid en modo Grid Cards: la grilla que alterna imagen y caja de contenido. Máximo 3 cards.'),
  CG('Cards verticales', 'slider-default-card', 'Card Grid en modo Slider Cards Default: cards altas con la imagen a sangre, título arriba y texto abajo (la de Compromiso Purina®).'),
  CG('Cards numeradas', 'cards-numbers', 'Card Grid en modo Cards Numbers: cards blancas sin imagen, con el número en un chip arriba. El número sale del orden de las cards.'),
  CG('Cards con icono', 'slider-card-icons-square', 'Card Grid en modo Card Icon Square: cards cuadradas con icono sobre una banda de color.'),
  CG('Cards apaisadas', 'slider-background-default-card', 'Card Grid en modo Slider Background Cards Default: cards apaisadas con la imagen de fondo y el texto agrupado abajo. Máximo 3 cards.'),
  CG('Card Grid (elegir modo)', '', 'El componente crudo: lo agregás y elegís cualquiera de los 11 modos de vista adentro.'),
]

// Como se llama el componente en la MATRIZ. Es el nombre que usamos en la app, no el
// del CMS: el mercado lo lee ahi y con el tiempo puede pedir por el ("quiero unas cards
// con icono acá"). Dos componentes necesitan mas que su nombre a secas:
//   - el Card Grid es UNO solo del que salen muchos layouts, asi que tres bloques
//     seguidos se llamarian igual. Se usa el nombre del ATAJO de la paleta, que es por
//     donde se eligen ("Mosaico", "Cards con icono"...).
//   - el Banner guarda el valor de MAQUINA del tipo (`title-description`): se muestra la
//     etiqueta del desplegable, que es lo que se lee en la app.
export function componentTitle(def, content = {}) {
  if (!def) return ''
  if (def.key === 'card_grid') {
    const mode = content.view_mode || CARD_GRID_DEFAULT_MODE
    const shortcut = PALETTE.find((p) => p.component_key === 'card_grid' && p.content?.view_mode === mode)
    if (shortcut) return shortcut.name
    return `${def.name} — ${labelOf(CARD_GRID_MODES, mode) || mode}`
  }
  if (def.key === 'banner' && content.type) {
    return `${def.name} — ${labelOf(BANNER_TYPES, content.type) || content.type}`
  }
  return def.name
}

// La paleta se muestra agrupada por familia: con los 12 layouts adentro, una lista
// plana de 30 items no se puede leer. Lo que no este en el orden va al final.
const PALETTE_ORDER = [
  'Hero', 'Contenido', 'Carruseles', 'Layout', 'Marcas', 'Navegacion',
  'Componentes reusables', 'Otros',
]

export function paletteGroups(items = PALETTE) {
  const by = new Map()
  for (const it of items) {
    const k = it.category || 'Otros'
    if (!by.has(k)) by.set(k, [])
    by.get(k).push(it)
  }
  const rank = (c) => { const i = PALETTE_ORDER.indexOf(c); return i < 0 ? 99 : i }
  return [...by.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .map(([category, list]) => ({ category, items: list }))
}

// Tamanos de imagen recomendados (Design Guidelines) de un componente, segun su
// contenido: si el componente tiene specsByType, se resuelve por el campo specKey
// (ej. Banner Type o variante de card); si no, devuelve specs fijas. Array vacio
// si el componente no maneja imagenes con tamano definido.
export function getSpecs(component, content) {
  if (!component) return []
  if (component.specsByType) {
    // Sin variante cargada vale la variante POR DEFECTO (la que renderiza el preview),
    // no "ninguna": si no, un componente recien agregado se quedaria sin medidas.
    const key = content?.[component.specKey || 'type'] || component.defaultType
    return component.specsByType[key] || []
  }
  // Una spec puede ser condicional (ej. la imagen izquierda opcional del carrusel de
  // productos): solo aplica si su toggle esta activo.
  return (component.specs || []).filter((s) => !s.requiresTrue || content?.[s.requiresTrue] === true)
}

// Contenido de EJEMPLO para un componente (galeria "Todos los componentes" + su
// export). Objetivo: validar campos y referencias de tamaño/peso con la agencia, asi
// que todo campo de LISTA trae al menos 2 items (productos, marcas, cards...). Las
// imagenes van vacias a proposito -> el mockup muestra el placeholder CON el tamaño.
function sampleFieldValue(f, i = 0) {
  const n = i + 1
  switch (f.type) {
    case 'image': return '' // vacio: el placeholder muestra el tamaño recomendado
    case 'checkbox': return true
    // `clearable` = vacio significa "sin color": el ejemplo tiene que quedar sin cargar.
    case 'color': return f.clearable ? '' : (f.default || '#ED1C24')
    // La opcion puede ser `{ value, label }`: lo que se guarda es SIEMPRE el valor de
    // maquina del CMS. Guardar el objeto rompia el preview (React no renderiza objetos).
    case 'select': return optValue(f.options && f.options[0]) || ''
    case 'url': return `https://ejemplo.com/${f.key}-${n}`
    case 'textarea': return f.placeholder || `Texto de ejemplo ${n} para validar el campo “${f.label}”.`
    default: return f.placeholder || `${f.label} ${n}`
  }
}

export function sampleContent(def) {
  const c = {}
  for (const f of def.fields || []) {
    if (f.type === 'list') {
      // Si el campo define `sample` (contenido fiel a la referencia), se usa tal cual
      // para que la galeria muestre la cantidad/estructura real; si no, 2 items genericos.
      if (Array.isArray(f.sample)) {
        c[f.key] = f.sample.map((it) => ({ ...it }))
      } else {
        c[f.key] = [0, 1].map((i) => {
          const item = {}
          for (const sf of f.item || []) item[sf.key] = sampleFieldValue(sf, i)
          return item
        })
      }
    } else {
      c[f.key] = sampleFieldValue(f)
    }
  }
  return c
}


// Campos VISIBLES de un componente segun su contenido: filtra por Banner Type
// (hideTypes/onlyTypes). Con { excel:true } ademas oculta los tecnicos (cms).
export function visibleFields(def, content = {}, opts = {}) {
  const type = variantOf(content)
  return (def?.fields || []).filter((f) => {
    if (opts.excel && f.cms) return false
    // Campo condicional: depende de otro (ej. filtros de producto). Si el otro esta
    // apagado, este campo no se muestra ni se exporta.
    // `requires` = toggle default ON (oculta solo si === false).
    // `requiresTrue` = toggle default OFF (muestra solo si === true).
    if (f.requires && content[f.requires] === false) return false
    if (f.requiresTrue && content[f.requiresTrue] !== true) return false
    if (f.hideTypes && type && f.hideTypes.includes(type)) return false
    if (f.onlyTypes && !f.onlyTypes.includes(type)) return false
    return true
  })
}

// La VARIANTE del componente, que es la que decide que campos aplican. Casi todos la
// guardan en `type` (el Banner Type); el Card Grid la guarda en `view_mode`, que es como
// se llama en el CMS. Sin esto, un Card Grid en modo iconos le pediria al mercado las
// cuatro imagenes de cada card, que en ese layout no se ven.
function variantOf(content) {
  return (content && (content.type ?? content.view_mode)) || undefined
}

// ¿Este campo se OMITE del Excel para este valor? Un campo con `noneOption` (ej.
// "Aplica a" -> "Sin iconos") no tiene nada que cargar cuando esta en esa opcion,
// asi que no se le pide una fila al mercado.
// ¿Este campo NO baja a la hoja Contenido? Se saca cuando no hay NADA que cargar:
//   - quedo en su `noneOption` (ej. "Aplica a: Sin iconos"): no hay dato que pedir.
//   - esta VACIO. La hoja es lo que ESTA pagina lleva, no el catalogo de todo lo que el
//     componente podria llevar: un campo que se dejo vacio al armarla es un campo que
//     esta pagina no usa, y mostrarlo con un guion solo hace dudar al mercado.
export function excelSkip(field, value) {
  if (!field) return false
  if (field.noneOption && value === field.noneOption) return true
  // Lo que entrega el mercado baja SIEMPRE, aunque no tengamos nada cargado: es
  // justamente lo que hay que pedirles.
  if (isMarketField(field)) return false
  return isEmptyValue(value)
}

// ¿Este dato lo entrega el MERCADO? Es lo unico que se les pide aunque este VACIO: no
// es contenido que podamos sacar del sitio viejo ni del Figma, lo tienen ellos. Por eso
// baja igual y en el Excel se pinta, para que se vea que falta completarlo.
//
// Regla: toda IMAGEN, menos las que su propia etiqueta marca como "(opcional)" — un
// fondo decorativo no es un pedido al mercado. El alt text NO entra: es tecnico
// (`cms: true`) y lo carga SEO en la hoja CMS, igual que las metas. Cualquier caso que
// no entre en la regla se fuerza con `market: true` / `market: false` en el campo.
export function isMarketField(f) {
  if (!f) return false
  if (typeof f.market === 'boolean') return f.market
  if (f.cms) return false
  if (/\(opcional\)/i.test(f.label || '')) return false
  return f.type === 'image'
}

// El valor que REALMENTE va en el CMS. Casi siempre es lo cargado; si no hay nada
// cargado hay dos formas de que igual haya un valor:
//   - `defaultByType`: lo pide la VARIANTE y no se elige (ej. el Card - Style Card de
//     las cards apaisadas, que va si o si en "Card Grid Default Square").
//   - `default`: el valor que damos por sentado cuando no se eligio otro (ej. el HTML
//     tag del titulo de una card, que es h3).
// En los dos casos el editor lee en la hoja CMS lo que hay que poner, y no un "Default"
// o un "- Ninguno -" que no es lo que corresponde.
export function effectiveValue(f, content = {}) {
  const v = content?.[f?.key]
  if (!isEmptyValue(v)) return v
  const byType = f?.defaultByType?.[variantOf(content)]
  if (byType != null) return byType
  // Los `default` BOOLEANOS son otra cosa: dicen como se dibuja un checkbox que nadie
  // toco (ver ContentForm), no un valor a cargar. No entran aca.
  if (f?.default == null || typeof f.default === 'boolean') return v
  return f.default
}

// Vacio = sin dato. Un booleano SI es dato (false = destildado a proposito).
export function isEmptyValue(value) {
  if (value == null || value === '') return true
  if (Array.isArray(value)) return value.length === 0
  return false
}

// Sub-campos VISIBLES de un item de una lista. Filtra por:
//   - `roles`: el rol del item (mosaico: bloque de imagen vs de contenido)
//   - `onlyTypes`/`hideTypes`: la variante del componente (misma key `type` que arriba;
//     ej. el icono solo existe en la variante con iconos del carrusel de cards)
//   - `cms`: los tecnicos, solo con { excel: true }
export function visibleSubFields(field, role, content = {}, opts = {}) {
  const type = variantOf(content)
  return (field?.item || []).filter((sf) => {
    if (opts.excel && sf.cms) return false
    if (sf.roles && role && !sf.roles.includes(role)) return false
    if (sf.hideTypes && type && sf.hideTypes.includes(type)) return false
    if (sf.onlyTypes && !sf.onlyTypes.includes(type)) return false
    return true
  })
}

// Valor legible de un campo para el export/preview (list -> texto multilinea).
export function fieldToText(field, value) {
  if (value == null || value === '') return ''
  if (field.type === 'list') {
    if (!Array.isArray(value) || !value.length) return ''
    return value
      .map((item, i) => {
        const parts = field.item
          .map((sf) => (item[sf.key] ? `${sf.label}: ${item[sf.key]}` : null))
          .filter(Boolean)
        return `${i + 1}) ${parts.join(' - ')}`
      })
      .join('\n')
  }
  if (field.type === 'checkbox') return value ? 'Sí' : 'No'
  // Selects con { value, label }: se guarda el valor, se muestra la etiqueta (que es
  // lo que el editor ve en el desplegable de Drupal).
  if (field.type === 'select' && Array.isArray(field.options)) return labelOf(field.options, value)
  return String(value)
}

// ---- Lo que todavia NO esta -----------------------------------------------------
// Inventario, para no perder de vista cuanto falta para espejar el CMS. Sale del
// dialogo "Add Component" de Drupal (la lista completa de paragraphs disponibles).
// No se usa en la app: es documentacion viva, al lado del catalogo que describe.

// Paragraphs que existen en el CMS y no tenemos construidos.
export const CMS_PENDING_PARAGRAPHS = [
  'Additional Information', 'Additional Information Item',
  'Feeding Guide Grid', 'Feeding Guide Item',
  'Nutritional Table', 'Nutritional Item',
  'History Grid', 'History Grid Item',
  'Media Gallery', 'Media Gallery Modal', 'Media',
  'Contact Card', 'Contact Card Grid',
  'Content: Tint', 'TINT Component', 'TINT Component Item CTA',
  'Content: Forms', 'Block', 'HTML', 'Flag Anonymous Modal',
]

// Componentes NUESTROS a los que les falta el subform real del CMS para cerrarlos.
// Hasta tener el HTML del formulario de Drupal, sus campos son una aproximacion y no
// se les puede declarar el panel Classy sin inventar.
export const CMS_PENDING_SUBFORMS = {
  banner_wrapper: 'Falta el subform de `Banner Wrapper`: sus campos propios (¿autoplay, intervalo?) y el panel Classy. Hoy solo declara Avanzado, que Drupal agrega a todos los paragraphs por igual.',
  text_image: 'Falta el subform de `c_sideimagetext`: panel Classy.',
  tabs: 'Falta el subform de `comp_tabs`: panel Classy.',
  brand_cards: 'No aparece en el dialogo del CMS. Confirmar si es un View/bloque y no un paragraph.',
  articles_carousel: 'Idem: confirmar si es un View/bloque y no un paragraph.',
}
