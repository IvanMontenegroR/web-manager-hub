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
    category: 'Hero',
    help: 'Campos reales del paragraph Banner en el CMS. Segun el Banner Type cambia el layout.',
    fields: [
      { key: 'type', label: 'Banner Type', type: 'select', cms: true, options: ['Main Hero', 'Secondary Hero', 'Promotional banner (Only image)', 'Banner Card', 'Full Image + Box Content', 'Brand Hero'] },
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'title_tag', label: 'Title — HTML tag', type: 'select', cms: true, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
      { key: 'description', label: 'Descripción', type: 'textarea' },
      { key: 'image', label: 'Imagen / Video (link)', type: 'image' },
      { key: 'link_text', label: 'Botón — texto', type: 'text' },
      { key: 'link_url', label: 'Botón — link', type: 'url' },
      // Avanzado (CMS, no van al Excel de mercados)
      { key: 'banner_align', label: 'Banner Align Content', type: 'select', cms: true, options: ['Por defecto', 'Banner Center Bottom', 'Banner Center Center', 'Banner Center Top', 'Banner Left Bottom', 'Banner Left Bottom (Mobile) Center (Desktop)', 'Banner Left Center', 'Banner Left Top', 'Banner Right Bottom', 'Banner Right Center', 'Banner Right Top'] },
      { key: 'background_color', label: 'Background Color', type: 'select', cms: true, options: ['Por defecto', 'Brand 01', 'Brand 02', 'Brand 03', 'Brand 04', 'Neutral 000', 'Neutral 100', 'Neutral 200', 'Neutral 300', 'Neutral 400', 'Neutral 500', 'Neutral 600', 'Neutral 700', 'Neutral 800', 'Primary Black', 'Primary Red', 'Primary White', 'Reds 000', 'Reds 100', 'Reds 200', 'Reds 300', 'Reds 400', 'Reds 500', 'Reds 600', 'Secondary Red'] },
      { key: 'visibility', label: 'Visibilidad (pet type)', type: 'select', cms: true, options: ['Genérica (todas)', 'Gato', 'Perro', 'Gato + Perro'] },
      { key: 'see_more_text', label: 'See more — texto', type: 'text', cms: true },
      { key: 'see_more_url', label: 'See more — link', type: 'url', cms: true },
      { key: 'section_id', label: 'Section ID', type: 'text', cms: true },
      { key: 'css_class', label: 'Custom CSS classes', type: 'text', cms: true },
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
    key: 'text',
    name: 'Texto',
    category: 'Contenido',
    help: 'Bloque de texto (una o dos columnas).',
    fields: [
      { key: 'style', label: 'Estilo', type: 'select', cms: true, options: ['Una columna', 'Dos columnas', 'Dos columnas expansivo'] },
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
      { key: 'cta_label', label: 'Botón — texto', type: 'text' },
      { key: 'cta_url', label: 'Botón — link', type: 'url' },
    ],
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
      { key: 'cards', label: 'Tarjetas', type: 'list', itemLabel: 'Tarjeta', item: [
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
      // En el CMS el articulo se SELECCIONA (no se cargan imagen/categoria/link):
      // por eso en el Excel de matriz solo va el titulo del articulo. El resto se
      // marca cms:true (sigue editable en el builder para el mockup, pero no exporta).
      { key: 'cards', label: 'Articulos', type: 'list', itemLabel: 'Articulo', item: [
        { key: 'image', label: 'Imagen', type: 'image', cms: true },
        { key: 'category', label: 'Categoria (chip)', type: 'text', cms: true },
        { key: 'category_color', label: 'Color del chip (hex)', type: 'text', placeholder: '#582d84', cms: true },
        { key: 'title', label: 'Titulo del articulo', type: 'text' },
        { key: 'url', label: 'Link', type: 'url', cms: true },
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
    reusable: true, // componente reutilizable: no se carga contenido por pagina en el Excel
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
      { key: 'items', label: 'Testimonios', type: 'list', itemLabel: 'Testimonio', item: [
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
      { key: 'cards', label: 'Marcas', type: 'list', itemLabel: 'Marca', item: [
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
    key: 'product_list',
    name: 'Carrusel de productos',
    category: 'Marcas',
    help: 'Sección "Más populares": tabs de filtro + carrusel de card-products. Card promo (ej. Pet ID) opcional y botón "Ver todos". Sin imagen usa placeholder. En el CMS los productos los popula la vista; acá cargás ejemplos.',
    fields: [
      { key: 'filters', label: 'Tabs de filtro (separados por coma)', type: 'text', placeholder: 'Más populares, Seco, Húmedo, Snacks' },
      { key: 'promo_title', label: 'Card promo — título (opcional)', type: 'text', placeholder: 'Pet ID' },
      { key: 'promo_text', label: 'Card promo — texto', type: 'textarea' },
      { key: 'promo_url', label: 'Card promo — link', type: 'url' },
      { key: 'products', label: 'Productos', type: 'list', itemLabel: 'Producto', item: [
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
    key: 'timeline',
    name: 'Línea de tiempo',
    category: 'Contenido',
    help: 'Sección "Historia": título + subtítulo centrados y una línea de tiempo horizontal (carrusel). Cada hito: año en pill roja sobre la línea, imagen, título y descripción; un punto rojo cierra el conector.',
    fields: [
      { key: 'title', label: 'Titulo', type: 'text', placeholder: 'Historia Purina®' },
      { key: 'subtitle', label: 'Subtitulo', type: 'text', placeholder: 'Ayudamos a los dueños de mascotas a asegurar que sus adorables perros y gatos disfruten de una vida más larga, saludable y feliz.' },
      { key: 'items', label: 'Hitos', type: 'list', itemLabel: 'Hito', item: [
        { key: 'year', label: 'Año', type: 'text' },
        { key: 'image', label: 'Imagen', type: 'image' },
        { key: 'title', label: 'Titulo', type: 'text' },
        { key: 'description', label: 'Descripcion', type: 'textarea' },
      ] },
    ],
    specs: [{ ratio: 'Desktop 274×190', desktop: '274×190px', mobile: '274×190px', max: '500kb', format: 'JPG' }],
  },
  {
    key: 'commitment_carousel',
    name: 'Carrusel de cards',
    category: 'Carruseles',
    help: 'Sección "Compromiso Purina®": header (título + subtítulo) con flechas y un carrusel de cards verticales con imagen de fondo a sangre, título arriba y descripción abajo (overlaid en blanco).',
    fields: [
      { key: 'title', label: 'Titulo', type: 'text', placeholder: 'Compromiso Purina®' },
      { key: 'subtitle', label: 'Subtitulo', type: 'text', placeholder: 'La nutrición de las mascotas es clave, pero hacemos más por ellas, sus dueños y el planeta. Este es nuestro Compromiso Purina®.' },
      { key: 'items', label: 'Cards', type: 'list', itemLabel: 'Card', item: [
        { key: 'image', label: 'Imagen', type: 'image' },
        { key: 'title', label: 'Titulo', type: 'text' },
        { key: 'description', label: 'Descripcion', type: 'textarea' },
        { key: 'url', label: 'Link', type: 'url' },
      ] },
    ],
    specs: [{ ratio: 'Desktop 411×520', desktop: '411×520px', mobile: '411×520px', max: '500kb', format: 'JPG' }],
  },
  {
    key: 'fifty_fifty',
    name: '50/50',
    category: 'Contenido',
    help: 'Bloque a dos columnas (50/50): título + texto a la izquierda; a la derecha, un texto o un desplegable (acordeón) de items (título + texto). El item abierto marca su título en rojo.',
    fields: [
      { key: 'title', label: 'Titulo (izquierda)', type: 'text', placeholder: 'Nutriendo mascotas. Enriqueciendo vidas.' },
      { key: 'text', label: 'Texto (izquierda)', type: 'textarea' },
      { key: 'right_type', label: 'Columna derecha', type: 'select', cms: true, options: ['Desplegable', 'Texto'] },
      { key: 'right_text', label: 'Texto (derecha)', type: 'textarea' },
      { key: 'items', label: 'Desplegables', type: 'list', itemLabel: 'Item', item: [
        { key: 'title', label: 'Titulo', type: 'text' },
        { key: 'text', label: 'Texto', type: 'textarea' },
      ] },
    ],
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
