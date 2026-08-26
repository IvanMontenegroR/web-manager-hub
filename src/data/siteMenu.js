// Menu principal del sitio (purina:header-main) con sus megamenus.
//
// Es config GLOBAL, no contenido por pagina: el mismo menu esta en todas. Por eso vive
// aca y no en `page_components`. Esta escrito como DATO (no como JSX) para que sea lo
// que despues guarde la tabla `site_menu` sin cambiar de forma.
//
// Los megamenus tienen DOS layouts, que salen de como se ven en el sitio:
//   - `boxes` : cajas con borde, cada una con titulo + icono y su lista de links
//               (Alimento, Marcas). Alimento ademas lleva el buscador arriba.
//   - `links` : lista plana de links con icono, en dos columnas
//               (Red Purina, Servicios, Conoce Purina).
// A la derecha, los dos PROMOS son los mismos en los cinco menus: se declaran una vez.

import {
  PawPrint, Bone, Cat, Dog, BookOpen, MessagesSquare, MessageCircle,
  Store, Stethoscope, House, Users, Newspaper, CircleHelp, Mail, Handshake, BadgeCheck,
} from 'lucide-react'

// Los iconos del sitio son del set de Purina; aca se aproximan con lucide para el
// mockup. La clave es la que se guarda, el componente es como se dibuja.
export const MENU_ICONS = {
  life: PawPrint, food: Bone, cat: Cat, dog: Dog, read: BookOpen,
  community: MessagesSquare, adopt: Handshake, breeders: House, stores: Store,
  vet: Stethoscope, lodging: House, whatsapp: MessageCircle, history: Users,
  allies: Handshake, pros: Stethoscope, club: BadgeCheck, press: Newspaper,
  faq: CircleHelp, contact: Mail,
}

const L = (label, url = '') => ({ label, url })

// Las dos tarjetas de la derecha, iguales en los cinco megamenus.
// OJO: en el sitio real la primera dice "Tittle banner" con doble T y su bajada es
// texto de relleno ("Elementum lectus purus..."). Se deja tal cual: el mockup muestra
// lo que hay, no lo que deberia decir.
export const MENU_PROMOS = [
  { title: 'Tittle banner', text: 'Elementum lectus purus at suspendisse habitasse adouoa kolaq.', image: '' },
  { title: 'Newsletter Purina®', text: 'Suscríbete para recibir el mejor contenido para ti y para tu mascota.', image: '' },
]

export const SITE_MENU = [
  {
    key: 'alimento',
    label: 'Alimento',
    layout: 'boxes',
    search: { label: 'Buscar alimento', placeholder: 'Escribe tus dudas aquí...' },
    groups: [
      { title: 'Etapa de vida', icon: 'life', links: [L('Cachorros'), L('Gatitos'), L('Adultos'), L('Senior')] },
      { title: 'Tipo de alimento', icon: 'food', links: [L('Seco'), L('Húmedo'), L('Snacks'), L('Suplementos')] },
    ],
    more: L('Conocer productos'),
  },
  {
    key: 'marcas',
    label: 'Marcas',
    layout: 'boxes',
    groups: [
      { title: 'Gatos', icon: 'cat', links: [L('Pro Plan®'), L('Felix®'), L('Cat Chow®'), L('Fancy Feast®')] },
      { title: 'Perros', icon: 'dog', links: [L('Pro Plan®'), L('Dog Chow®'), L('Beneful®'), L('Purina One®')] },
    ],
    more: L('Ver todas'),
  },
  {
    key: 'red-purina',
    label: 'Red Purina®',
    layout: 'links',
    links: [
      { ...L('Lo más leído'), icon: 'read' },
      { ...L('Comunidad Purina®'), icon: 'community' },
    ],
  },
  {
    key: 'servicios',
    label: 'Servicios',
    layout: 'links',
    links: [
      { ...L('Yo adopto'), icon: 'adopt' },
      { ...L('Vetline'), icon: 'vet' },
      { ...L('Breeders'), icon: 'breeders' },
      { ...L('Hospedaje'), icon: 'lodging' },
      { ...L('Tiendas'), icon: 'stores' },
      { ...L('WhatsApp'), icon: 'whatsapp' },
    ],
  },
  {
    key: 'conoce-purina',
    label: 'Conoce Purina®',
    layout: 'links',
    links: [
      { ...L('Nuestra historia'), icon: 'history' },
      { ...L('Prensa'), icon: 'press' },
      { ...L('Aliados'), icon: 'allies' },
      { ...L('Preguntas frecuentes'), icon: 'faq' },
      { ...L('Profesionales'), icon: 'pros' },
      { ...L('Contacto'), icon: 'contact' },
      { ...L('Club Purina®'), icon: 'club' },
    ],
  },
]
