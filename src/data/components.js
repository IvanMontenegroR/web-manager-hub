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

export const COMPONENTS = [
  {
    key: 'breadcrumb',
    name: 'Breadcrumb',
    category: 'Navegacion',
    help: 'Ruta de navegacion (Inicio / ...). El ultimo item es la pagina actual.',
    fields: [
      { key: 'items', label: 'Items (en orden)', type: 'list', item: [
        { key: 'label', label: 'Texto', type: 'text' },
        { key: 'url', label: 'Link (opcional)', type: 'url' },
      ] },
    ],
  },
  {
    key: 'banner',
    name: 'Banner',
    category: 'Hero',
    help: 'Campos reales del paragraph Banner en el CMS. Segun el Banner Type cambia el layout.',
    fields: [
      { key: 'type', label: 'Banner Type', type: 'select', options: ['Main Hero', 'Secondary Hero', 'Promotional banner (Only image)', 'Banner Card', 'Full Image + Box Content', 'Brand Hero'] },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'title_tag', label: 'Title — HTML tag', type: 'select', options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'image', label: 'Media (imagen)', type: 'image' },
      { key: 'link_url', label: 'Link — URL', type: 'url' },
      { key: 'link_text', label: 'Link — Texto del enlace (CTA)', type: 'text' },
      // Avanzado
      { key: 'banner_align', label: 'Banner Align Content', type: 'select', options: ['Por defecto', 'Banner Center Bottom', 'Banner Center Center', 'Banner Center Top', 'Banner Left Bottom', 'Banner Left Bottom (Mobile) Center (Desktop)', 'Banner Left Center', 'Banner Left Top', 'Banner Right Bottom', 'Banner Right Center', 'Banner Right Top'] },
      { key: 'background_color', label: 'Background Color', type: 'select', options: ['Por defecto', 'Brand 01', 'Brand 02', 'Brand 03', 'Brand 04', 'Neutral 000', 'Neutral 100', 'Neutral 200', 'Neutral 300', 'Neutral 400', 'Neutral 500', 'Neutral 600', 'Neutral 700', 'Neutral 800', 'Primary Black', 'Primary Red', 'Primary White', 'Reds 000', 'Reds 100', 'Reds 200', 'Reds 300', 'Reds 400', 'Reds 500', 'Reds 600', 'Secondary Red'] },
      { key: 'visibility', label: 'Visibilidad (pet type)', type: 'select', options: ['Genérica (todas)', 'Gato', 'Perro', 'Gato + Perro'] },
      { key: 'see_more_text', label: 'See more — texto', type: 'text' },
      { key: 'see_more_url', label: 'See more — URL', type: 'url' },
      { key: 'section_id', label: 'Section ID', type: 'text' },
      { key: 'css_class', label: 'Custom CSS classes', type: 'text' },
    ],
    // Los tamanos de imagen dependen del Banner Type (Design Guidelines 2026).
    specKey: 'type',
    specsByType: {
      'Main Hero': [{ ratio: 'Desktop 2:1 · Mobile 9:16', desktop: '2100×1050px', mobile: '526×936px', max: '500kb / 10MB', format: 'JPG / MP4' }],
      'Secondary Hero': [{ ratio: 'Desktop 3:1 · Mobile 1:1', desktop: '2100×700px', mobile: '526×526px', max: '500kb / 10MB', format: 'JPG / MP4' }],
      'Brand Hero': [{ ratio: 'Desktop 2.5:1 · Mobile 2:3', desktop: '2088×835px', mobile: '526×789px', max: '500kb', format: 'JPG / MP4' }],
      'Full Image + Box Content': [{ ratio: 'Desktop ~2:1 · Mobile ~9:14', desktop: '1680×820px', mobile: '430×694px', max: '500kb', format: 'JPG / MP4' }],
      'Promotional banner (Only image)': [{ ratio: 'Desktop 3:1 · Mobile 2:3', desktop: '2088×696px', mobile: '465×675px', max: '500kb', format: 'JPG / MP4' }],
    },
  },
  {
    key: 'card_grid',
    name: 'Card grid',
    category: 'Contenido',
    help: 'Grilla de tarjetas (iconos, numeros, imagen + titulo...).',
    fields: [
      { key: 'type', label: 'Tipo de grilla', type: 'select', options: ['Cards Icons', 'Cards Numbers', 'Cards simple (imagen + titulo)', 'Box image + card icons', 'Full background card icons'] },
      { key: 'title', label: 'Titulo', type: 'text' },
      { key: 'subtitle', label: 'Subtitulo', type: 'text' },
      { key: 'cards', label: 'Tarjetas', type: 'list', item: [
        { key: 'image', label: 'Imagen / icono', type: 'image' },
        { key: 'title', label: 'Titulo', type: 'text' },
        { key: 'subtitle', label: 'Texto', type: 'textarea' },
        { key: 'url', label: 'Link', type: 'url' },
      ] },
    ],
  },
  {
    key: 'text',
    name: 'Texto',
    category: 'Contenido',
    help: 'Bloque de texto (una o dos columnas).',
    fields: [
      { key: 'style', label: 'Estilo', type: 'select', options: ['Una columna', 'Dos columnas', 'Dos columnas expansivo'] },
      { key: 'title', label: 'Titulo', type: 'text' },
      { key: 'body', label: 'Cuerpo', type: 'textarea' },
    ],
  },
  {
    key: 'text_image',
    name: 'Texto + Imagen',
    category: 'Contenido',
    help: 'Texto con imagen a un costado.',
    fields: [
      { key: 'title', label: 'Titulo', type: 'text' },
      { key: 'body', label: 'Cuerpo', type: 'textarea' },
      { key: 'image', label: 'Imagen', type: 'image' },
      { key: 'image_position', label: 'Posicion de la imagen', type: 'select', options: ['Izquierda', 'Derecha'] },
      { key: 'cta_label', label: 'CTA — texto', type: 'text' },
      { key: 'cta_url', label: 'CTA — link', type: 'url' },
    ],
  },
  {
    key: 'big_number_grid',
    name: 'Grilla de numeros',
    category: 'Contenido',
    help: 'Numeros grandes con su etiqueta (estadisticas).',
    fields: [
      { key: 'title', label: 'Titulo', type: 'text' },
      { key: 'numbers', label: 'Numeros', type: 'list', item: [
        { key: 'number', label: 'Numero', type: 'text' },
        { key: 'label', label: 'Etiqueta', type: 'text' },
      ] },
    ],
  },
  {
    key: 'external_video',
    name: 'Video externo',
    category: 'Contenido',
    help: 'Video embebido (YouTube/Vimeo) con miniatura.',
    fields: [
      { key: 'title', label: 'Titulo', type: 'text' },
      { key: 'video_url', label: 'URL del video', type: 'url' },
      { key: 'thumbnail', label: 'Miniatura', type: 'image' },
    ],
  },
  {
    key: 'article_list',
    name: 'Listado de articulos',
    category: 'Articulos',
    help: 'Bloque que lista articulos (el CMS los popula por tipo).',
    fields: [
      { key: 'block_type', label: 'Tipo de bloque', type: 'select', options: ['Featured', 'Highlighted', 'Recommendation List', 'Latest'] },
      { key: 'title', label: 'Titulo', type: 'text' },
      { key: 'note', label: 'Nota para el editor', type: 'textarea' },
    ],
  },

  // ===== Nuevos componentes del Design Guidelines 2026 (homepage + reusables) =====
  {
    key: 'featured_articles',
    name: 'Featured articles',
    category: 'Articulos',
    help: 'Articulo destacado: imagen grande + tarjeta con categoria, titulo, bajada y autor.',
    fields: [
      { key: 'category', label: 'Categoria (chip)', type: 'text' },
      { key: 'title', label: 'Titulo del articulo', type: 'text' },
      { key: 'description', label: 'Bajada', type: 'textarea' },
      { key: 'image', label: 'Imagen', type: 'image' },
      { key: 'author', label: 'Autor', type: 'text' },
      { key: 'date', label: 'Fecha', type: 'text' },
      { key: 'link_url', label: 'Link del articulo', type: 'url' },
    ],
    specs: [{ ratio: 'Desktop 4:3 · Mobile 4:3', desktop: '1216×912px', mobile: '303×454px', max: '500kb', format: 'JPG / MP4' }],
  },
  {
    key: 'services_carousel',
    name: 'Carrusel de servicios',
    category: 'Carruseles',
    help: 'Bloque "Aliados y Servicios": titulo sobre una imagen de fondo + tarjetas de servicio (una destacada).',
    fields: [
      { key: 'title', label: 'Titulo', type: 'text' },
      { key: 'subtitle', label: 'Subtitulo', type: 'text' },
      { key: 'background', label: 'Imagen de fondo', type: 'image' },
      { key: 'cards', label: 'Tarjetas', type: 'list', item: [
        { key: 'icon', label: 'Icono (imagen)', type: 'image' },
        { key: 'title', label: 'Titulo', type: 'text' },
        { key: 'text', label: 'Texto', type: 'textarea' },
        { key: 'url', label: 'Link', type: 'url' },
        { key: 'highlighted', label: 'Destacada (roja)', type: 'select', options: ['No', 'Si'] },
      ] },
    ],
    specs: [{ label: 'Fondo', ratio: 'Desktop 16:9 · Mobile 9:16', desktop: '2160×1212px', mobile: '562×999px', max: '500kb', format: 'JPG' }],
  },
  {
    key: 'articles_carousel',
    name: 'Carrusel de articulos',
    category: 'Carruseles',
    help: 'Sección "Nuestro Blog": cabecera + carrusel de artículos (imagen con chip de categoría y título superpuestos, botón +). Card destacada más grande a la izquierda.',
    fields: [
      { key: 'title', label: 'Titulo', type: 'text', placeholder: 'Nuestro Blog' },
      { key: 'subtitle', label: 'Subtitulo', type: 'text', placeholder: 'Artículos pensados para ti y tu mascota' },
      { key: 'cards', label: 'Articulos', type: 'list', item: [
        { key: 'image', label: 'Imagen', type: 'image' },
        { key: 'category', label: 'Categoria (chip)', type: 'text' },
        { key: 'category_color', label: 'Color del chip (hex)', type: 'text', placeholder: '#582d84' },
        { key: 'title', label: 'Titulo', type: 'text' },
        { key: 'url', label: 'Link', type: 'url' },
      ] },
      { key: 'see_more_text', label: 'Botón — texto', type: 'text', placeholder: 'Explora más artículos' },
      { key: 'see_more_url', label: 'Botón — link', type: 'url' },
    ],
    specs: [{ ratio: 'Desktop 4:3 · Mobile 4:3', desktop: '1216×912px', mobile: '303×454px', max: '500kb', format: 'JPG' }],
  },
  {
    key: 'footer_banner',
    name: 'Footer banner',
    category: 'Hero',
    help: 'Banner con forma de pastilla oscura (Pet Club): logo + título + texto + botón. Los cuadros decorativos de los lados son fijos (no editables).',
    fields: [
      { key: 'title', label: 'Titulo', type: 'text', placeholder: 'Lo mejor para tu mascota empieza aquí' },
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
      { key: 'items', label: 'Testimonios', type: 'list', item: [
        { key: 'image', label: 'Imagen', type: 'image' },
        { key: 'image_title', label: 'Texto sobre la imagen (opcional)', type: 'text' },
        { key: 'quote', label: 'Cita', type: 'textarea' },
        { key: 'author', label: 'Autor', type: 'text' },
      ] },
      { key: 'button_text', label: 'Botón — texto', type: 'text', placeholder: 'Compartir mi historia' },
      { key: 'button_url', label: 'Botón — link', type: 'url' },
    ],
    specs: [{ label: 'Imagen', ratio: 'Desktop ≈1:1', desktop: '900×840px', mobile: '640×600px', max: '500kb', format: 'JPG' }],
  },
  {
    key: 'species_selector',
    name: 'Selector de especie',
    category: 'Contenido',
    help: 'Selector de mascota Gato / Perro (estático, con los íconos de gato y perro). Solo se editan el título y el subtítulo.',
    fields: [
      { key: 'title', label: 'Titulo', type: 'text', placeholder: 'Quién manda en tu casa' },
      { key: 'subtitle', label: 'Subtitulo', type: 'text', placeholder: 'Elige tu mascota para personalizar tu experiencia:' },
    ],
  },
  {
    key: 'brand_cards',
    name: 'Carrusel de marcas',
    category: 'Marcas',
    help: 'Sección "Marcas Purina®": cabecera + carrusel de marcas. Cada card = imagen de marca (con toggles perro/gato) + pie gris con nombre y bajada. Botón "Ver todas".',
    fields: [
      { key: 'title', label: 'Titulo', type: 'text', placeholder: 'Marcas Purina®' },
      { key: 'subtitle', label: 'Subtitulo', type: 'text', placeholder: 'La variedad que buscas, con la confianza de Purina®' },
      { key: 'cards', label: 'Marcas', type: 'list', item: [
        { key: 'image', label: 'Imagen de marca', type: 'image' },
        { key: 'name', label: 'Nombre', type: 'text' },
        { key: 'description', label: 'Bajada', type: 'textarea' },
        { key: 'pets', label: 'Aplica a', type: 'select', options: ['Perro + Gato', 'Perro', 'Gato'] },
        { key: 'url', label: 'Link', type: 'url' },
      ] },
      { key: 'see_more_text', label: 'Botón — texto', type: 'text', placeholder: 'Ver todas' },
      { key: 'see_more_url', label: 'Botón — link', type: 'url' },
    ],
    specs: [{ label: 'Imagen de marca', ratio: 'Desktop 4:3 · Mobile 4:3', desktop: '822×616px', mobile: '822×616px', max: '500kb', format: 'JPG' }],
  },
  {
    key: 'product_cards',
    name: 'Cards de producto',
    category: 'Marcas',
    help: 'Grilla de cards de producto. El tipo define el tamano de imagen: A ingrediente, B producto, C marca.',
    fields: [
      { key: 'variant', label: 'Tipo de card', type: 'select', options: ['A · Ingrediente', 'B · Producto', 'C · Marca'] },
      { key: 'title', label: 'Titulo de la seccion', type: 'text' },
      { key: 'cards', label: 'Cards', type: 'list', item: [
        { key: 'image', label: 'Imagen', type: 'image' },
        { key: 'title', label: 'Titulo', type: 'text' },
        { key: 'subtitle', label: 'Texto / subtitulo', type: 'textarea' },
        { key: 'tags', label: 'Tags (separados por coma)', type: 'text' },
        { key: 'url', label: 'Link', type: 'url' },
      ] },
    ],
    specKey: 'variant',
    specsByType: {
      'A · Ingrediente': [{ ratio: 'Desktop 1:1 · Mobile 1:1', desktop: '600×600px', mobile: '600×600px', max: '500kb', format: 'JPG' }],
      'B · Producto': [{ ratio: 'Desktop 1:1 · Mobile 1:1', desktop: '540×540px', mobile: '540×540px', max: '500kb', format: 'JPG' }],
      'C · Marca': [{ ratio: 'Desktop 4:3 · Mobile 4:3', desktop: '822×616px', mobile: '822×616px', max: '500kb', format: 'JPG' }],
    },
  },
  {
    key: 'product_list',
    name: 'Listado de productos',
    category: 'Marcas',
    help: 'Sección "Más populares": tabs de filtro + carrusel de card-products. Card promo (ej. Pet ID) opcional y botón "Ver todos". Sin imagen usa placeholder. En el CMS los productos los popula la vista; acá cargás ejemplos.',
    fields: [
      { key: 'filters', label: 'Tabs de filtro (separados por coma)', type: 'text', placeholder: 'Más populares, Seco, Húmedo, Snacks' },
      { key: 'promo_title', label: 'Card promo — título (opcional)', type: 'text', placeholder: 'Pet ID' },
      { key: 'promo_text', label: 'Card promo — texto', type: 'textarea' },
      { key: 'promo_url', label: 'Card promo — link', type: 'url' },
      { key: 'products', label: 'Productos', type: 'list', item: [
        { key: 'image', label: 'Imagen del producto', type: 'image' },
        { key: 'title', label: 'Nombre', type: 'text' },
        { key: 'tag', label: 'Tag (opcional)', type: 'text' },
        { key: 'tag_color', label: 'Color del tag (hex)', type: 'text', placeholder: '#895731' },
        { key: 'url', label: 'Link', type: 'url' },
      ] },
      { key: 'see_more_text', label: 'Botón "ver todos" — texto', type: 'text', placeholder: 'Ver todos' },
      { key: 'see_more_url', label: 'Botón "ver todos" — link', type: 'url' },
    ],
    specs: [{ label: 'Imagen de producto', ratio: 'Desktop 1:1 · Mobile 1:1', desktop: '600×600px', mobile: '600×600px', max: '500kb', format: 'JPG / PNG' }],
  },
  {
    key: 'banner_ia',
    name: 'Banner IA',
    category: 'Hero',
    help: 'Banner con forma de pastilla (stadium): imagen de fondo + titulo + barra de busqueda del asistente.',
    fields: [
      { key: 'title', label: 'Titulo', type: 'text' },
      { key: 'placeholder', label: 'Texto del buscador', type: 'text', placeholder: 'Escribe tus consultas aquí…' },
      { key: 'image', label: 'Imagen de fondo', type: 'image' },
    ],
    specs: [{ ratio: 'Desktop 1.5:1 · Mobile 1.5:1', desktop: '1552×1014px', mobile: '670×446px', max: '500kb', format: 'JPG' }],
  },
  {
    key: 'section',
    name: 'Seccion con fondo',
    category: 'Contenido',
    help: 'Seccion con imagen/degradado de fondo a sangre: titulo + subtitulo arriba y tarjetas con icono abajo.',
    fields: [
      { key: 'title', label: 'Titulo', type: 'text' },
      { key: 'subtitle', label: 'Subtitulo', type: 'text' },
      { key: 'background', label: 'Imagen de fondo', type: 'image' },
      { key: 'cards', label: 'Tarjetas', type: 'list', item: [
        { key: 'icon', label: 'Icono (imagen)', type: 'image' },
        { key: 'title', label: 'Titulo', type: 'text' },
        { key: 'text', label: 'Texto', type: 'textarea' },
      ] },
    ],
    specs: [{ label: 'Fondo', ratio: 'Desktop 1:1 · Mobile 9:16', desktop: '2784×1994px', mobile: '702×1248px', max: '500kb', format: 'JPG' }],
  },
  {
    key: 'category_grid',
    name: 'Categorias',
    category: 'Navegacion',
    help: 'Bloque "Categorias populares": tarjetas horizontales con imagen de fondo y titulo por categoria.',
    fields: [
      { key: 'title', label: 'Titulo', type: 'text', placeholder: 'Categorías populares' },
      { key: 'items', label: 'Categorias', type: 'list', item: [
        { key: 'label', label: 'Nombre', type: 'text' },
        { key: 'image', label: 'Imagen', type: 'image' },
        { key: 'url', label: 'Link', type: 'url' },
      ] },
    ],
    specs: [{ ratio: 'Desktop 3:1 · Mobile 2.25:1', desktop: '758×252px', mobile: '320×142px', max: '500kb', format: 'JPG' }],
  },
  {
    key: 'header_menu',
    name: 'Header menu (cards)',
    category: 'Navegacion',
    help: 'Tarjetas promocionales del menu desplegable del header: imagen + titulo + bajada + flecha.',
    fields: [
      { key: 'items', label: 'Tarjetas', type: 'list', item: [
        { key: 'title', label: 'Titulo', type: 'text' },
        { key: 'description', label: 'Bajada', type: 'textarea' },
        { key: 'image', label: 'Imagen', type: 'image' },
        { key: 'url', label: 'Link', type: 'url' },
      ] },
    ],
    specs: [{ ratio: 'Desktop 4:3 · Mobile 4:3', desktop: '670×502px', mobile: '670×502px', max: '500kb', format: 'JPG' }],
  },
  {
    key: 'banner_tutorial',
    name: 'Banner tutorial',
    category: 'Hero',
    help: 'Banner "Cómo introducir…": fondo con asistente a la izquierda + carrusel de pasos (dia + imagen + texto) a la derecha.',
    fields: [
      { key: 'title', label: 'Titulo', type: 'text' },
      { key: 'assistant_name', label: 'Nombre del asistente', type: 'text', placeholder: 'Pandora' },
      { key: 'background', label: 'Imagen de fondo', type: 'image' },
      { key: 'steps', label: 'Pasos', type: 'list', item: [
        { key: 'day', label: 'Etiqueta (ej. Día 1 - 3)', type: 'text' },
        { key: 'description', label: 'Descripcion', type: 'textarea' },
        { key: 'image', label: 'Imagen del paso', type: 'image' },
      ] },
    ],
    specs: [
      { label: 'Fondo', ratio: 'Desktop 2.5:1', desktop: '2784×1772px', mobile: '540×940px', max: '500kb', format: 'JPG' },
      { label: 'Pasos', ratio: 'Desktop 1:1', desktop: '624×624px', mobile: '400×400px', max: '500kb', format: 'JPG' },
    ],
  },
  {
    key: 'post_image',
    name: 'Imagen de post',
    category: 'Articulos',
    help: 'Imagen dentro del cuerpo de un articulo.',
    fields: [
      { key: 'image', label: 'Imagen', type: 'image' },
      { key: 'alt', label: 'Texto alternativo', type: 'text' },
    ],
    specs: [{ ratio: 'Desktop 4:3 · Mobile 4:3', desktop: '1570×1177px', mobile: '670×502px', max: '500kb', format: 'JPG' }],
  },
]

export const COMPONENT_BY_KEY = Object.fromEntries(COMPONENTS.map((c) => [c.key, c]))

export function getComponent(key) {
  return COMPONENT_BY_KEY[key] || null
}

// Tamanos de imagen recomendados (Design Guidelines) de un componente, segun su
// contenido: si el componente tiene specsByType, se resuelve por el campo specKey
// (ej. Banner Type o variante de card); si no, devuelve specs fijas. Array vacio
// si el componente no maneja imagenes con tamano definido.
export function getSpecs(component, content) {
  if (!component) return []
  if (component.specsByType) {
    const key = content?.[component.specKey || 'type']
    return component.specsByType[key] || []
  }
  return component.specs || []
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
        return `${i + 1}) ${parts.join(' · ')}`
      })
      .join('\n')
  }
  return String(value)
}
