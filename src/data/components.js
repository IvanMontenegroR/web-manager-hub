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
    category: 'Hero',
    help: 'Campos reales del paragraph Banner en el CMS. Segun el Banner Type cambia el layout.',
    fields: [
      { key: 'type', label: 'Banner Type', type: 'select', cms: true, options: ['Main Hero', 'Secondary Hero', 'Promotional banner (Only image)', 'Full Image + Box Content', 'Brand Hero'] },
      // Los campos aplican segun el Banner Type: el Promotional (Only image) NO tiene
      // titulo/descripcion/imagen/boton -> solo las imagenes del slider; el resto de los
      // tipos usan titulo/descripcion/imagen/boton y NO el slider. (hideTypes/onlyTypes)
      { key: 'title', label: 'Título', type: 'text', hideTypes: ['Promotional banner (Only image)'] },
      { key: 'title_tag', label: 'Título — HTML tag', type: 'select', cms: true, hideTypes: ['Promotional banner (Only image)'], options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
      { key: 'description', label: 'Descripción', type: 'textarea', hideTypes: ['Promotional banner (Only image)'] },
      { key: 'image', label: 'Imagen / Video (link)', type: 'image', hideTypes: ['Promotional banner (Only image)'] },
      { key: 'image_mobile', label: 'Imagen / Video mobile (link)', type: 'image', hideTypes: ['Promotional banner (Only image)'] },
      { key: 'link_text', label: 'Botón — texto', type: 'text', hideTypes: ['Promotional banner (Only image)'] },
      { key: 'link_url', label: 'Botón — link', type: 'url', hideTypes: ['Promotional banner (Only image)'] },
      // Solo Promotional: varias imagenes; con mas de 1 el banner se vuelve un slider.
      { key: 'slides', label: 'Imágenes del slider (2+ = carrusel)', type: 'list', itemLabel: 'Imagen', onlyTypes: ['Promotional banner (Only image)'], item: [
        { key: 'image', label: 'Imagen', type: 'image' },
        { key: 'image_mobile', label: 'Imagen mobile', type: 'image' },
        { key: 'link', label: 'Link', type: 'url' },
      ] },
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
      'Main Hero': [{ ratio: 'Desktop 2:1 · Mobile 9:16', desktop: '2100×1050px', mobile: '526×936px', max: '500kb / 2-4MB', format: 'JPG / PNG / MP4 / YouTube' }],
      'Secondary Hero': [{ ratio: 'Desktop 3:1 · Mobile 1:1', desktop: '2100×700px', mobile: '526×526px', max: '500kb / 2-4MB', format: 'JPG / PNG / MP4 / YouTube' }],
      'Brand Hero': [{ ratio: 'Desktop 2.5:1 · Mobile 2:3', desktop: '2088×835px', mobile: '526×789px', max: '500kb / 2-4MB', format: 'JPG / PNG / MP4 / YouTube' }],
      'Full Image + Box Content': [{ ratio: 'Desktop ~2:1 · Mobile ~2:3', desktop: '2088×1044px', mobile: '526×789px', max: '500kb / 2-4MB', format: 'JPG / PNG / MP4 / YouTube' }],
      'Promotional banner (Only image)': [{ ratio: 'Desktop 3:1 · Mobile 2:3', desktop: '2088×696px', mobile: '465×675px', max: '500kb / 2-4MB', format: 'JPG / PNG / MP4 / YouTube' }],
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
      { key: 'title_tag', label: 'Título — HTML tag', type: 'select', cms: true, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
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
      { key: 'title_tag', label: 'Título — HTML tag', type: 'select', cms: true, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
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
      { key: 'title_tag', label: 'Título — HTML tag', type: 'select', cms: true, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
      { key: 'subtitle', label: 'Subtitulo', type: 'text' },
      { key: 'background', label: 'Imagen de fondo', type: 'image' },
      { key: 'background_mobile', label: 'Imagen de fondo mobile', type: 'image' },
      { key: 'cards', label: 'Tarjetas', type: 'list', itemLabel: 'Tarjeta', item: [
        { key: 'icon', label: 'Icono', type: 'select', options: ['pata'] },
        { key: 'title', label: 'Titulo', type: 'text' },
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
      { key: 'title', label: 'Titulo', type: 'text', placeholder: 'Nuestro Blog' },
      { key: 'title_tag', label: 'Título — HTML tag', type: 'select', cms: true, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
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
  },
  {
    key: 'footer_banner',
    name: 'Banner CTA',
    category: 'Componentes reusables',
    help: 'Banner con forma de pastilla oscura (Pet Club): logo + título + texto + botón. Los cuadros decorativos de los lados son fijos (no editables).',
    reusable: true, // reutilizable: en el Excel de una pagina va con los campos deshabilitados
    fields: [
      { key: 'title', label: 'Titulo', type: 'text', placeholder: 'Lo mejor para tu mascota empieza aquí' },
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
      { key: 'title', label: 'Titulo', type: 'text', placeholder: 'Quién manda en tu casa' },
      { key: 'title_tag', label: 'Título — HTML tag', type: 'select', cms: true, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
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
      { key: 'title_tag', label: 'Título — HTML tag', type: 'select', cms: true, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
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
      { key: 'filters', label: 'Tabs de filtro (separados por coma)', type: 'text', placeholder: 'Más populares, Seco, Húmedo, Snacks', requires: 'show_filters' },
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
      { key: 'title', label: 'Titulo', type: 'text', placeholder: 'Historia Purina®' },
      { key: 'title_tag', label: 'Título — HTML tag', type: 'select', cms: true, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
      { key: 'subtitle', label: 'Subtitulo', type: 'text', placeholder: 'Ayudamos a los dueños de mascotas a asegurar que sus adorables perros y gatos disfruten de una vida más larga, saludable y feliz.' },
      { key: 'items', label: 'Hitos', type: 'list', itemLabel: 'Hito', item: [
        { key: 'year', label: 'Año', type: 'text' },
        { key: 'image', label: 'Imagen', type: 'image' },
        { key: 'title', label: 'Titulo', type: 'text' },
        { key: 'description', label: 'Descripcion', type: 'textarea' },
      ] },
    ],
    specs: [{ ratio: 'Desktop 4:3 · Mobile 4:3', desktop: '670×502px', mobile: '670×502px', max: '500kb', format: 'JPG / PNG' }],
  },
  {
    key: 'commitment_carousel',
    name: 'Carrusel de cards',
    category: 'Carruseles',
    help: 'Sección "Compromiso Purina®": header (título + subtítulo) con flechas y un carrusel de cards verticales con imagen de fondo a sangre, título arriba y descripción abajo (overlaid en blanco).',
    fields: [
      { key: 'title', label: 'Titulo', type: 'text', placeholder: 'Compromiso Purina®' },
      { key: 'title_tag', label: 'Título — HTML tag', type: 'select', cms: true, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
      { key: 'subtitle', label: 'Subtitulo', type: 'text', placeholder: 'La nutrición de las mascotas es clave, pero hacemos más por ellas, sus dueños y el planeta. Este es nuestro Compromiso Purina®.' },
      { key: 'items', label: 'Cards', type: 'list', itemLabel: 'Card', item: [
        { key: 'image', label: 'Imagen', type: 'image' },
        { key: 'image_mobile', label: 'Imagen mobile', type: 'image' },
        { key: 'title', label: 'Titulo', type: 'text' },
        { key: 'description', label: 'Descripcion', type: 'textarea' },
        { key: 'url', label: 'Link', type: 'url' },
      ] },
    ],
    specs: [{ ratio: 'Desktop 1:1.5 · Mobile 1:1.15', desktop: '822×1230px', mobile: '670×1004px', max: '500kb', format: 'JPG / PNG' }],
  },
  {
    key: 'fifty_fifty',
    name: '50/50',
    category: 'Contenido',
    help: 'Bloque a dos columnas (50/50): título + texto a la izquierda; a la derecha, un texto o un desplegable (acordeón) de items (título + texto). El item abierto marca su título en rojo.',
    exportWidth: 820, // se captura mas angosto para que la imagen del Excel no salga tan baja
    fields: [
      { key: 'title', label: 'Titulo (izquierda)', type: 'text', placeholder: 'Nutriendo mascotas. Enriqueciendo vidas.' },
      { key: 'title_tag', label: 'Título — HTML tag', type: 'select', cms: true, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'] },
      { key: 'text', label: 'Texto (izquierda)', type: 'textarea' },
      { key: 'right_type', label: 'Columna derecha', type: 'select', cms: true, options: ['Desplegable', 'Texto'] },
      { key: 'right_text', label: 'Texto (derecha)', type: 'textarea' },
      { key: 'items', label: 'Desplegables', type: 'list', itemLabel: 'Item', item: [
        { key: 'title', label: 'Titulo', type: 'text' },
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
    key: 'mosaic',
    name: 'Mosaico',
    category: 'Contenido',
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
  // Una spec puede ser condicional (ej. la imagen izquierda opcional del carrusel de
  // productos): solo aplica si su toggle esta activo.
  return (component.specs || []).filter((s) => !s.requiresTrue || content?.[s.requiresTrue] === true)
}

// Contenido de EJEMPLO para un componente (galeria "Todos los componentes" + su
// export). Objetivo: validar campos y referencias de tamaño/peso con la agencia, asi
// que todo campo de LISTA trae al menos 2 items (productos, marcas, slides...). Las
// imagenes van vacias a proposito -> el mockup muestra el placeholder CON el tamaño.
function sampleFieldValue(f, i = 0) {
  const n = i + 1
  switch (f.type) {
    case 'image': return '' // vacio: el placeholder muestra el tamaño recomendado
    case 'checkbox': return true
    case 'color': return f.default || '#ED1C24'
    case 'select': return (f.options && f.options[0]) || ''
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

// ¿El componente tiene algun campo de imagen (propio o dentro de una lista)? Se usa
// para poner el "Alt Text" en el Excel solo en los componentes que tienen imagenes.
export function componentHasImage(def) {
  return (def?.fields || []).some((f) => f.type === 'image' || (f.type === 'list' && (f.item || []).some((sf) => sf.type === 'image')))
}

// Campos VISIBLES de un componente segun su contenido: filtra por Banner Type
// (hideTypes/onlyTypes). Con { excel:true } ademas oculta los tecnicos (cms).
export function visibleFields(def, content = {}, opts = {}) {
  const type = content && content.type
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
