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
    key: 'banner',
    name: 'Banner (hero)',
    category: 'Hero',
    help: 'Banner principal. Segun el tipo cambia que campos aplican.',
    fields: [
      { key: 'type', label: 'Tipo', type: 'select', options: ['Promotional (solo imagen)', 'Secondary Hero', 'Full image + box content'] },
      { key: 'title', label: 'Titulo', type: 'text' },
      { key: 'subtitle', label: 'Subtitulo', type: 'text' },
      { key: 'description', label: 'Descripcion', type: 'textarea' },
      { key: 'image', label: 'Imagen', type: 'image' },
      { key: 'cta_label', label: 'CTA — texto', type: 'text' },
      { key: 'cta_url', label: 'CTA — link', type: 'url' },
      { key: 'align', label: 'Alineacion del contenido', type: 'select', options: ['Izquierda', 'Centro', 'Derecha'] },
    ],
  },
  {
    key: 'brand_logos',
    name: 'Carrusel de logos de marca',
    category: 'Marcas',
    help: 'Lista de logos de marca como carrusel (home).',
    fields: [
      { key: 'title', label: 'Titulo', type: 'text' },
      { key: 'title_size', label: 'Tamano del titulo', type: 'select', options: ['Small', 'Medium', 'Large'] },
      { key: 'logos', label: 'Logos', type: 'list', item: [
        { key: 'name', label: 'Marca', type: 'text' },
        { key: 'image', label: 'Logo (imagen)', type: 'image' },
        { key: 'url', label: 'Link', type: 'url' },
      ] },
    ],
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
]

export const COMPONENT_BY_KEY = Object.fromEntries(COMPONENTS.map((c) => [c.key, c]))

export function getComponent(key) {
  return COMPONENT_BY_KEY[key] || null
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
