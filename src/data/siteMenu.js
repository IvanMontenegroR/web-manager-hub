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
//               (Red Purina, Servicios, Conoce Purina).
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

const L = (label, icon) => (icon ? { label, url: '', icon } : { label, url: '' })

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

// EL MENU REAL DE MEXICO, tal cual la matriz que completo el mercado. Es ademas con lo
// que se siembra un mercado nuevo: se copia y se edita, que es mas rapido que empezar de
// cero — los cinco menus principales son los mismos en todos los mercados.
//
// Las URLs van VACIAS a proposito: la matriz vino sin ellas. El menu no funciona hasta
// que se carguen, y un destino inventado es peor que uno vacio.
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
      { title: 'Perros', icon: 'dog', links: [L('Cachorro'), L('Adulto'), L('Senior')] },
      { title: 'Gatos', icon: 'cat', links: [L('Gatito'), L('Adulto'), L('Senior')] },
      { title: 'Tipo de alimento', icon: 'pet_supplies', links: [
        L('Alimento Seco'), L('Alimento Húmedo'), L('Premios y Snacks'), L('Suplementos'),
      ] },
    ],
    more: { label: 'Ver productos', url: '' },
    promos: [],
  },
  {
    label: 'Marcas',
    layout: 'boxes',
    groups: [
      { title: 'Para Gatos', icon: 'cat', links: [
        L('Pro Plan®'), L('Felix®'), L('Cat Chow®'), L('Fancy Feast®'),
      ] },
      { title: 'Para Perros', icon: 'dog', links: [
        L('Pro Plan®'), L('Dog Chow®'), L('Beneful®'), L('Purina One®'),
      ] },
    ],
    more: { label: 'Ver todas', url: '' },
    promos: P(EXPERTO('Recibe asesoría personalizada y encuentra el alimento adecuado para tu mascota.'), CLUB()),
  },
  {
    label: 'Red Purina®',
    layout: 'links',
    links: [L('Lo más leído', 'newsmode'), L('Comunidad Purina®', 'forum')],
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
      L('Adopta una mascota', 'adocao'), L('Contacta a un experto', 'chat'),
      L('Conoce nuestro programa de Breeders', 'genetics'),
      L('Encuentra dónde dejar a tu mascota', 'hotel'),
      L('Tiendas', 'storefront'), L('Yo Reciclo'),
    ],
    promos: P(EXPERTO('Recibe asesoría personalizada y aprende más de tu mascota.'), CLUB()),
  },
  {
    label: 'Conoce Purina®',
    layout: 'links',
    links: [
      L('Nuestra historia', 'history'), L('Prensa', 'newsmode'),
      L('Aliados', 'handshake'), L('Preguntas frecuentes', 'help'),
      L('Profesionales', 'stethoscope'), L('Contacto', 'mail'),
      L('Club Purina®', 'workspace_premium'),
    ],
    // Sin tarjetas: la matriz dice "Sin tarjeta" en las dos.
    promos: [],
  },
]
