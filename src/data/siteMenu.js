// Menu principal del sitio (purina:header-main) con sus megamenus.
//
// Es config GLOBAL por MERCADO, no contenido por pagina: el mismo menu esta en todas
// las paginas de ese mercado. Por eso no vive en `page_components` sino en su propia
// tabla (`site_menu`, ver src/lib/menuDb.js) y se edita en su propia pantalla.
//
// Lo de aca es la FORMA (que campos tiene) y el contenido con el que se siembra un
// mercado nuevo. Lo que se guarda es exactamente esta estructura.
//
// Los megamenus tienen DOS layouts, que salen de como se ven en el sitio:
//   - `boxes` : cajas con borde, cada una con titulo + icono y su lista de links
//               (Alimento, Marcas). Alimento ademas lleva el buscador arriba.
//   - `links` : lista plana de links con icono, en dos columnas
//               (Servicios, Conoce Purina). Consejos y cuidados usa `boxes`.
// A la derecha de CADA menu van sus PROMOS (las tarjetas). Son de cada menu, no del
// header: dos menus pueden mostrar tarjetas distintas. Son 0, 1 o 2 — si un menu no
// tiene ninguna, ese menu ocupa todo el ancho.

import { CMS_ICON_SVG } from './cmsIcons'

export const MENU_LAYOUTS = [
  { value: 'boxes', label: 'Cajas con título (Alimento, Marcas)' },
  { value: 'links', label: 'Lista de links con icono (Servicios, Conoce Purina)' },
]

// Los iconos del sitio son el set del CMS (`CMS_ICONS`) y lo que se GUARDA es esa clave.
// El DIBUJO sale del sprite real del sitio (`cmsIcons.js`), asi que el mockup del header
// muestra el icono de verdad. Antes se aproximaban con lucide y solo los que sabiamos:
// el resto caia a un punto neutro, y en un megamenu de doce links eso era casi todo.
//
// Devuelve el simbolo o null; lo dibuja `SiteHeader`, que es quien sabe de que tamaño.
export function menuIconFor(key) {
  return CMS_ICON_SVG[key] || null
}

const L = (label, icon, url = '') => (icon ? { label, url, icon } : { label, url })

// Tarjetas con las que arranca un menu nuevo. Hoy los cinco de Mexico muestran las
// mismas dos, pero cada uno tiene las suyas: cambiarlas en Alimento no toca Marcas.
// OJO: en el sitio real la primera dice "Tittle banner" con doble T y su bajada es
// texto de relleno ("Elementum lectus purus..."). Se siembra tal cual: el mockup muestra
// lo que hay, no lo que deberia decir.
// Las tarjetas de la derecha. NO son del header: son de CADA menu, y hay menus que no
// llevan ninguna. Cuando un menu no tiene, ocupa todo el ancho.
//
// Dos se repiten en varios menus con la MISMA bajada, asi que se declaran una vez. Se
// clonan al usarlas (`P`): si los menus compartieran la referencia, editar las de Marcas
// cambiaria las de Servicios, que es justo lo que este modelo evita.
const EXPERTO = (bajada) => ({
  title: 'Pregunta a un experto', text: bajada, image: '', url: '',
})
const CLUB = () => ({
  title: 'Consejos para cuidar a tu mascota',
  text: 'Únete a Club Purina® y recibe recomendaciones, novedades y contenido personalizado.',
  image: '', url: '',
})
const P = (...tarjetas) => tarjetas.map((x) => ({ ...x }))

// EL MENU DE MEXICO. Nacio de la matriz que completo el mercado y despues se ajusto con la
// revision del sitio viejo (2026-10): "Red Purina" paso a "Consejos y cuidados" con cajas
// por especie, como Alimento y Marcas (un nombre de programa no dice que hay adentro, y los
// sitios de Purina de otros paises nombran la seccion por su contenido); Marcas suma las
// marcas que ya tienen pagina; Servicios lleva Donde comprar. Es ademas con lo que se
// siembra un mercado nuevo: se copia y se edita.
//
// Las URLs son las de preprod. Las que van VACIAS no tienen pagina todavia: un destino
// inventado es peor que uno vacio.
export const DEFAULT_MENU = [
  {
    label: 'Alimento',
    layout: 'boxes',
    search: {
      label: 'Encuentra su alimento ideal',
      placeholder: 'Cuéntanos qué necesita tu mascota…',
    },
    // TRES cajas: la etapa de vida va partida POR ESPECIE (perros y gatos tienen etapas
    // distintas — cachorro/gatito). Por eso este menu NO lleva tarjetas: con tres cajas
    // mas las dos tarjetas, el megamenu queda apretado.
    groups: [
      { title: 'Perros', icon: 'dog', links: [
        L('Cachorro', null, '/productos?field_product_life_stage%5B6%5D=6'),
        L('Adulto', null, '/productos?field_product_life_stage%5B22%5D=22&pettype=30'),
        L('Senior', null, '/productos?field_product_life_stage%5B1%5D=1&pettype=30'),
      ] },
      { title: 'Gatos', icon: 'cat', links: [
        L('Gatito', null, '/productos?field_product_life_stage%5B54%5D=54'),
        L('Adulto', null, '/productos?field_product_life_stage%5B22%5D=22&pettype=18'),
        L('Senior', null, '/productos?field_product_life_stage%5B1%5D=1&pettype=18'),
      ] },
      { title: 'Tipo de alimento', icon: 'pet_supplies', links: [
        L('Alimento Seco', null, '/productos?field_product_food_type%5B8%5D=8'),
        L('Alimento Húmedo', null, '/productos?field_product_food_type%5B4%5D=4'),
        L('Premios y Snacks', null, '/productos?field_product_food_type%5B26%5D=26'),
        L('Suplementos'),
      ] },
    ],
    more: { label: 'Ver productos', url: '/productos' },
    promos: [],
  },
  {
    label: 'Marcas',
    layout: 'boxes',
    // Las marcas que eligio el Websites Expert (Gatos hasta Felix, Perros hasta Beneful, en
    // el orden de content); el resto se encuentra en "Ver todas".
    groups: [
      { title: 'Para Gatos', icon: 'cat', links: [
        L('Pro Plan®', null, '/proplan'), L('Cat Chow®', null, '/catchow'), L('Fancy Feast®', null, '/fancy-feast'),
        L('Purina® One®', null, '/purina-one'), L('Felix®', null, '/felix'),
      ] },
      { title: 'Para Perros', icon: 'dog', links: [
        L('Pro Plan®', null, '/proplan'), L('Dog Chow®', null, '/dogchow'), L('Purina® One®', null, '/purina-one'),
        L('Excellent®', null, '/excellent'), L('Beneful®', null, '/beneful'),
      ] },
    ],
    // El link final NO es opcional en un menu de cajas: el sitio arma las cajas en una
    // grilla de 2 filas que se llena por COLUMNA, y la fila de abajo la ocupa este link.
    // Sin el, las dos cajas caen una debajo de la otra.
    more: { label: 'Ver todas', url: '/nuestras-marcas' },
    promos: P(EXPERTO('Recibe asesoría personalizada y encuentra el alimento adecuado para tu mascota.'), CLUB()),
  },
  {
    // Antes "Red Purina®". Cajas por especie con las categorias de articulos del sitio
    // (las mismas del sitio viejo, para no perder URLs); cada una filtra por especie.
    label: 'Consejos y cuidados',
    layout: 'boxes',
    groups: [
      { title: 'Perros', icon: 'dog', links: [
        L('Nutrición', null, '/articulos/nutricion?pettype=30'),
        L('Cuidado y bienestar', null, '/articulos/cuidado-y-bienestar?pettype=30'),
        L('Cambios en mi mascota', null, '/articulos/cambios-em-mi-mascota?pettype=30'),
        L('Entrenamiento', null, '/articulos/entrenamiento?pettype=30'),
      ] },
      { title: 'Gatos', icon: 'cat', links: [
        L('Nutrición', null, '/articulos/nutricion?pettype=18'),
        L('Cuidado y bienestar', null, '/articulos/cuidado-y-bienestar?pettype=18'),
        L('Cambios en mi mascota', null, '/articulos/cambios-em-mi-mascota?pettype=18'),
        L('Entrenamiento', null, '/articulos/entrenamiento?pettype=18'),
      ] },
    ],
    more: { label: 'Ver todos los artículos', url: '/articulos' },
    promos: P(EXPERTO('Recibe asesoría personalizada y aprende más de tu mascota.'), CLUB()),
  },
  {
    label: 'Servicios',
    layout: 'links',
    // El orden es el de LECTURA (por filas): el sitio los pone en dos columnas, asi que
    // 1 y 2 son la primera fila, 3 y 4 la segunda, etc.
    //
    // "Yo Reciclo" va SIN icono: en el set del CMS no hay ninguno de reciclaje, y poner
    // uno parecido seria elegir mal por el mercado. Cuando exista, se carga.
    links: [
      L('Adopta una mascota', 'adocao', '/adopta'), L('Contacta a un experto', 'chat', 'https://wa.me/+525549637160'),
      L('Conoce nuestro programa de Breeders', 'genetics'),
      L('Encuentra dónde dejar a tu mascota', 'hotel'),
      L('Dónde comprar', 'storefront', '/donde-comprar'), L('Yo Reciclo', null, '/purina-cuida/por-el-planeta/reciclando-con-purina'),
    ],
    promos: P(EXPERTO('Recibe asesoría personalizada y aprende más de tu mascota.'), CLUB()),
  },
  {
    // Sin Aliados ni Profesionales: no existen en el sitio viejo (en preprod son paginas de
    // muestra de F5, con socios de EE.UU. en ingles).
    label: 'Conoce Purina®',
    layout: 'links',
    links: [
      L('Nuestra historia', 'history', '/conoce-purina/historia'), L('Prensa', 'newsmode'),
      L('Preguntas frecuentes', 'help'), L('Contacto', 'mail', '/contacto'),
      L('Club Purina®', 'workspace_premium'),
    ],
    // Sin tarjetas: la matriz dice "Sin tarjeta" en las dos.
    promos: [],
  },
]
