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

import {
  PawPrint, Bone, Cat, Dog, Newspaper, MessagesSquare, MessageCircle,
  Store, Stethoscope, House, Users, CircleHelp, Mail, Handshake, BadgeCheck,
  HeartHandshake, Dna, Search, Star, Heart, Phone, MapPin, ShoppingCart, Circle,
} from 'lucide-react'

export const MENU_LAYOUTS = [
  { value: 'boxes', label: 'Cajas con título (Alimento, Marcas)' },
  { value: 'links', label: 'Lista de links con icono (Servicios, Conoce Purina)' },
]

// Los iconos del sitio son el set del CMS (`CMS_ICONS`): lo que se GUARDA es esa clave.
// Aca se dibujan aproximados con lucide, y solo los que sabemos a que corresponden —
// mismo criterio que `BG_TOKENS` con los colores: los que no estan mapeados caen a un
// generico en vez de mostrar un icono inventado.
const ICON_BY_CMS_KEY = {
  paw: PawPrint, 'paw-solid': PawPrint, pet_supplies: Bone, beef: Bone,
  cat: Cat, 'cat-ai': Cat, dog: Dog, 'dog-ai': Dog,
  newsmode: Newspaper, article: Newspaper, forum: MessagesSquare, chat: MessagesSquare,
  groups: Users, adocao: HeartHandshake, handshake: Handshake, genetics: Dna,
  storefront: Store, health_cross: Stethoscope, stethoscope: Stethoscope,
  hotel: House, family_home: House, whatsapp: MessageCircle, call: Phone,
  history: Users, help: CircleHelp, mail: Mail, verified: BadgeCheck,
  workspace_premium: BadgeCheck, search: Search, star: Star, heart: Heart,
  pin_drop: MapPin, my_location: MapPin, add_shopping_cart: ShoppingCart,
}

// Componente del icono para una clave del CMS. Sin mapeo, un punto neutro: se ve que
// hay un icono ahi sin afirmar cual.
export function menuIconFor(key) {
  return ICON_BY_CMS_KEY[key] || Circle
}

const L = (label, icon) => (icon ? { label, url: '', icon } : { label, url: '' })

// Tarjetas con las que arranca un menu nuevo. Hoy los cinco de Mexico muestran las
// mismas dos, pero cada uno tiene las suyas: cambiarlas en Alimento no toca Marcas.
// OJO: en el sitio real la primera dice "Tittle banner" con doble T y su bajada es
// texto de relleno ("Elementum lectus purus..."). Se siembra tal cual: el mockup muestra
// lo que hay, no lo que deberia decir.
export const DEFAULT_PROMOS = [
  { title: 'Tittle banner', text: 'Elementum lectus purus at suspendisse habitasse adouoa kolaq.', image: '', url: '' },
  { title: 'Newsletter Purina®', text: 'Suscríbete para recibir el mejor contenido para ti y para tu mascota.', image: '', url: '' },
]

// `promos` va DENTRO de cada menu. Se clona con `map` y no se comparte la referencia:
// si los cinco apuntaran al mismo array, editar las tarjetas de Alimento cambiaria las
// de Marcas, que es justo lo que este modelo evita.
const P = () => DEFAULT_PROMOS.map((x) => ({ ...x }))

export const DEFAULT_MENU = [
  {
    label: 'Alimento',
    layout: 'boxes',
    search: { label: 'Buscar alimento', placeholder: 'Escribe tus dudas aquí...' },
    groups: [
      { title: 'Etapa de vida', icon: 'paw', links: [L('Cachorros'), L('Gatitos'), L('Adultos'), L('Senior')] },
      { title: 'Tipo de alimento', icon: 'pet_supplies', links: [L('Seco'), L('Húmedo'), L('Snacks'), L('Suplementos')] },
    ],
    more: { label: 'Conocer productos', url: '' },
    promos: P(),
  },
  {
    label: 'Marcas',
    layout: 'boxes',
    groups: [
      { title: 'Gatos', icon: 'cat', links: [L('Pro Plan®'), L('Felix®'), L('Cat Chow®'), L('Fancy Feast®')] },
      { title: 'Perros', icon: 'dog', links: [L('Pro Plan®'), L('Dog Chow®'), L('Beneful®'), L('Purina One®')] },
    ],
    more: { label: 'Ver todas', url: '' },
    promos: P(),
  },
  {
    label: 'Red Purina®',
    layout: 'links',
    links: [L('Lo más leído', 'newsmode'), L('Comunidad Purina®', 'forum')],
    promos: P(),
  },
  {
    label: 'Servicios',
    layout: 'links',
    // El orden es el de LECTURA (por filas): el sitio los pone en dos columnas, asi que
    // 1 y 2 son la primera fila, 3 y 4 la segunda, etc.
    links: [
      L('Yo adopto', 'adocao'), L('Vetline', 'health_cross'),
      L('Breeders', 'genetics'), L('Hospedaje', 'hotel'),
      L('Tiendas', 'storefront'), L('WhatsApp', 'whatsapp'),
    ],
    promos: P(),
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
    promos: P(),
  },
]
