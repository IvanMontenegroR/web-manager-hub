import {
  ImageIcon, Dog, Cat, PawPrint, ChevronDown, Play, ArrowRight,
  Heart, Handshake, Stethoscope, HeartPulse, ShoppingCart, Store, Users, User, UserPlus,
  Home, Mail, Phone, MessageCircle, Search, Settings, Share2, Download, Star, BadgeCheck,
  Check, Calendar, Clock, MapPin, Globe, HelpCircle, FileText, Percent, Beef, Apple,
  Cookie, Zap, Dna, Facebook, Instagram, Linkedin, Youtube,
} from 'lucide-react'
import { Fragment } from 'react'
import { parseInline, parseRich } from '../../../lib/richText'
import {
  CMT_VERTICAL, CMT_ICON, CMT_WIDE_BOTTOM, CMT_WIDE_TOP, CMT_NUMBERS,
  BG_TOKENS, CARD_GRID_DEFAULT_MODE, tabList, LAYOUT_COLUMNS, getComponent, getSpecs,
  BT_MAIN_HERO, BT_SECONDARY_HERO, BT_ONLY_IMAGE, BT_FULL_BOX, BT_BRAND_HERO,
} from '../../../data/components'

// Modo de vista del Card Grid -> variante del carrusel de cards que ya sabemos dibujar.
// Los que faltan estan pendientes de mapear con el CMS.
const CG_TO_CMT = {
  'slider-default-card': CMT_VERTICAL,
  'slider-card-icons-square': CMT_ICON,
  // Titulo ARRIBA y descripcion ABAJO, sobre la imagen de fondo de la card. La otra
  // apaisada (CMT_WIDE_BOTTOM) apila las dos abajo y no la usa ningun modo del CMS.
  'slider-background-default-card': CMT_WIDE_TOP,
  'cards-numbers': CMT_NUMBERS,
}

// Cuerpo de texto: los enlaces marcados como [texto](url) se pintan como links.
// Formato INLINE: enlaces, negritas y cursivas. Sirve para los textos de una linea
// (subtitulos, citas, descripciones de una pestaña).
function RT({ children }) {
  const segs = parseInline(children)
  if (segs.length === 1 && !segs[0].link && !segs[0].bold && !segs[0].italic) return segs[0].text
  return segs.map((s, i) => {
    if (s.link) return <a key={i} className="cp-link" href={s.url || undefined}>{s.text}</a>
    if (s.bold) return <strong key={i}>{s.text}</strong>
    if (s.italic) return <em key={i}>{s.text}</em>
    return <span key={i}>{s.text}</span>
  })
}

// "Background Position" del CMS: `Boxed` deja el fondo dentro del container (ancho de
// contenido, con las esquinas redondeadas como cualquier otro bloque) y `Full Width` lo
// lleva a sangre. Vacio = full width, que es el default del CMS.
const BOXED = 'bg_position_boxed'
const isBoxed = (c) => c?.background_position === BOXED

// Formato de BLOQUE, para los campos de CUERPO: ademas de lo inline, respeta los
// saltos de linea y arma listas. Devuelve un <div> propio, asi que va donde antes
// habia un <p> — un <ul> adentro de un <p> es HTML invalido y el browser lo parte.
function Rich({ children, className = '', style }) {
  const blocks = parseRich(children)
  if (!blocks.length) return null
  return (
    <div className={`cp-rich${className ? ` ${className}` : ''}`} style={style}>
      {blocks.map((b, i) => {
        if (b.type === 'p') {
          return (
            <p key={i}>
              {b.lines.map((ln, j) => (
                <Fragment key={j}>{j > 0 && <br />}<RT>{ln}</RT></Fragment>
              ))}
            </p>
          )
        }
        const List = b.type === 'ol' ? 'ol' : 'ul'
        return (
          <List key={i}>
            {b.items.map((it, j) => <li key={j}><RT>{it}</RT></li>)}
          </List>
        )
      })}
    </div>
  )
}

// Mockups aproximados de cada componente. Se llenan con el contenido cargado, asi
// se ve la pagina armandose. La MISMA imagen renderizada se captura para el export.
// Agregar un componente = un case nuevo aca + su entrada en src/data/components.js.

// Por defecto alto FIJO (h). Si se pasa `aspect` (ej. '1/1', '4/3'), el placeholder y
// la imagen respetan esa relacion de aspecto (el placeholder "tiene el tamaño" real
// del componente) usando aspect-ratio con ancho 100%.
// ¿La URL es un video? Los banners aceptan MP4/webm, se renderizan con <video>.
const isVideo = (u) => /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(String(u || ''))

// Imagen o video segun la URL (mismo className/estilo). Video en loop mudo.
function MediaEl({ src, className = '', style }) {
  if (isVideo(src)) {
    return <video className={className} src={src} style={style} muted autoPlay loop playsInline />
  }
  return <img className={className} src={src} alt="" style={style} />
}

function Img({ src, h = 160, aspect, dim, className = '' }) {
  const style = aspect ? { aspectRatio: aspect, width: '100%', height: 'auto' } : { height: h }
  if (src) return <MediaEl className={`cp-img ${className}`} src={src} style={style} />
  return (
    <div className={`cp-img cp-img-ph ${className}`} style={style}>
      <ImageIcon size={22} />
      {dim && <span className="cp-ph-dim">{dim}</span>}
    </div>
  )
}

// ID de un video de YouTube a partir de cualquiera de sus formas de link
// (watch?v=, youtu.be/, /embed/, /shorts/). null si no es de YouTube.
const YT_ID = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/
export function youtubeThumb(url) {
  const m = YT_ID.exec(String(url || ''))
  // hqdefault existe SIEMPRE; maxresdefault falta en videos viejos o de baja calidad.
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null
}

// Que mostrar en el cuadro del video: el thumbnail de YouTube, o el propio MP4 (su
// primer frame). Con un link que no es ninguna de las dos cosas devuelve null, para
// que se vea el placeholder en vez de una imagen rota.
function videoPreview(url) {
  return youtubeThumb(url) || (isVideo(url) ? url : null)
}

const T = (v, fallback) => (v && String(v).trim() ? v : fallback)
// Texto OPCIONAL de una seccion (titulo/subtitulo que la pagina real puede no tener).
// Sin cargar NO se renderiza — nunca se inventa una frase de ejemplo.
//
// Antes caia a un texto de muestra para que un componente recien agregado no quedara
// vacio, y era un error: esas frases estaban escritas como copy de Purina de verdad
// ("La nutrición de las mascotas es clave...") y se colaban en la imagen del Excel. El
// mercado no tiene como saber que ese texto no es parte de la pagina. Un campo que
// nadie cargo tiene que VERSE vacio.
const OPT = (v) => (v && String(v).trim() ? v : null)
const list = (v) => (Array.isArray(v) ? v : [])

// CTAs de un bloque de texto. En el CMS el link es multivaluado (`ctas`); las paginas
// armadas antes del cambio tienen un solo boton en cta_label/cta_url, asi que se
// siguen leyendo para que no se les caiga el boton.
const ctaList = (c) => {
  const arr = list(c.ctas).filter((b) => b && (b.label || b.url))
  if (arr.length) return arr
  // Compatibilidad: el boton unico de antes (el banner lo llamaba link_text/link_url).
  if (c.cta_label || c.cta_url) return [{ label: c.cta_label, url: c.cta_url }]
  return c.link_text || c.link_url ? [{ label: c.link_text, url: c.link_url }] : []
}

// Estilo del boton (`style_button` de Classy). Vacio = Default, el rojo.
const btnClass = (v) => (/secondary/.test(v || '') ? ' cp-cta--sec'
  : /outline/.test(v || '') ? ' cp-cta--out'
    : /text/.test(v || '') ? ' cp-cta--txt' : '')
const PETCLUB_LOGO = (import.meta.env.BASE_URL || '/') + 'petclub-logo.png'
const ACCENT = '#ED1C24' // rojo Purina por defecto (componentes con color configurable)

// ---- Contraste de color -------------------------------------------------
// Los tokens de marca se aplican sobre fondos variables (ej. el texto de las cajas
// del mosaico va sobre el color secundario). Si el color elegido no contrasta con
// su fondo (ej. el primario BLANCO de Fancy Feast sobre su secundario CREMA), el
// texto seria ilegible: en ese caso se cae a negro/blanco segun el fondo.
function hexToRgb(hex) {
  const s = String(hex || '').replace('#', '').trim()
  const full = s.length === 3 ? s.split('').map((ch) => ch + ch).join('') : s
  if (!/^[0-9a-f]{6}$/i.test(full)) return null
  return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) }
}
function relLuminance(rgb) {
  const ch = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4) }
  return 0.2126 * ch(rgb.r) + 0.7152 * ch(rgb.g) + 0.0722 * ch(rgb.b)
}
function contrastRatio(a, b) {
  const ra = hexToRgb(a), rb = hexToRgb(b)
  if (!ra || !rb) return 21
  const la = relLuminance(ra), lb = relLuminance(rb)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
// Color de texto legible sobre `bg`: usa `preferred` si contrasta; si no, negro/blanco.
function readableOn(bg, preferred) {
  if (preferred && contrastRatio(bg, preferred) >= 4.5) return preferred
  const rgb = hexToRgb(bg)
  if (!rgb) return preferred || '#fff'
  return relLuminance(rgb) > 0.45 ? '#111114' : '#ffffff'
}

// Equivalencias entre el set de iconos del CMS (CMS_ICONS) y los de lucide que tenemos.
// Lo que no esta mapeado cae a la patita: el nombre exacto igual viaja al Excel, que es
// lo que el editor necesita para elegirlo en Drupal.
const ICON_MAP = {
  cat: Cat, 'cat-ai': Cat, dog: Dog, 'dog-ai': Dog, paw: PawPrint, 'paw-solid': PawPrint,
  heart: Heart, handshake: Handshake, stethoscope: Stethoscope, health_cross: HeartPulse,
  pet_supplies: ShoppingCart, add_shopping_cart: ShoppingCart, storefront: Store,
  groups: Users, person: User, person_add: UserPlus, family_home: Home,
  mail: Mail, call: Phone, chat: MessageCircle, chat_bubble: MessageCircle, forum: MessageCircle,
  search: Search, 'search-ai': Search, settings: Settings, share: Share2, download: Download,
  star: Star, 'star-1': Star, 'star-void': Star, verified: BadgeCheck, check: Check, done_all: Check,
  calendar_month: Calendar, calendar_add_on: Calendar, history: Clock,
  pin_drop: MapPin, my_location: MapPin, language: Globe, help: HelpCircle,
  play_circle: Play, article: FileText, download_2: Download, percent_discount: Percent,
  beef: Beef, apple: Apple, cookie: Cookie, bolt: Zap, genetics: Dna,
  facebook: Facebook, instagram: Instagram, linkedin: Linkedin, youtube: Youtube,
}
// Icono decorativo. Acepta tanto el nombre del CMS (cat, dog, paw...) como los viejos
// en español (pata / gato / perro), que siguen guardados en las paginas ya armadas.
function FeatureIcon({ name, size = 26 }) {
  const Ico = ICON_MAP[String(name || '').toLowerCase()]
  if (Ico) return <Ico size={size} />
  if (/gato|cat/i.test(name)) return <Cat size={size} />
  if (/perro|dog/i.test(name)) return <Dog size={size} />
  return <PawPrint size={size} />
}

// "Banner Align Content" (opcion del CMS) -> posicion horizontal + vertical.
// Por defecto = centro/centro (asi se ve el Main Hero real). Ej: "Banner Left Bottom".
function parseBannerAlign(value, isHero) {
  const s = String(value || '').toLowerCase()
  if (!s || /por defecto/.test(s)) return { h: 'center', v: isHero ? 'center' : 'center' }
  const h = s.includes('left') ? 'left' : s.includes('right') ? 'right' : 'center'
  const v = s.includes('top') ? 'top' : s.includes('bottom') ? 'bottom' : 'center'
  return { h, v }
}

const RENDERERS = {
  // Menu de marca: barra de navegacion con el logo a la izquierda y los items. El PRIMER
  // item es SIEMPRE el nombre de la marca de la pagina (activo, subrayado); despues van
  // los items cargados. El fondo sale del color PRIMARIO de la marca, y el color del
  // texto se elige para que contraste con ese fondo (blanco en marcas oscuras).
  // Los subitems (uno por linea) se despliegan al pasar el mouse.
  brand_menu: (c, ctx) => {
    const bg = ctx?.brandPrimary || '#ffffff'
    const fg = readableOn(bg, null)
    const items = list(c.items)
    const arr = items.length ? items : [
      { label: 'Productos', subitems: 'Alimento seco\nAlimento húmedo\nSnacks' },
      { label: 'Momento especial' },
      { label: 'Calidad en tus manos' },
    ]
    return (
      <nav className="cp-bmenu" style={{ background: bg, color: fg, '--fg': fg }}>
        <div className="cp-bmenu-logo">
          {c.logo
            ? <img className="cp-bmenu-logo-img" src={c.logo} alt="" />
            : <div className="cp-bmenu-logo-ph"><ImageIcon size={16} /><span>100×100px</span></div>}
        </div>
        <ul className="cp-bmenu-items">
          {/* Primer item: siempre el nombre de la marca (no editable). */}
          <li className="cp-bmenu-item is-brand">{T(ctx?.brandName, 'Marca')}</li>
          {arr.map((it, i) => {
            const subs = String(it.subitems || '').split('\n').map((s) => s.trim()).filter(Boolean)
            return (
              <li key={i} className={`cp-bmenu-item${subs.length ? ' has-sub' : ''}`}>
                <span className="cp-bmenu-label">
                  {T(it.label, `Ítem ${i + 1}`)}
                  {!!subs.length && <ChevronDown size={13} className="cp-bmenu-chev" />}
                </span>
                {!!subs.length && (
                  <ul className="cp-bmenu-sub" style={{ background: bg, color: fg }}>
                    {subs.map((s, j) => <li key={j}>{s}</li>)}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>
    )
  },

  // Breadcrumb real (.breadcrumb): fs-caption, links #454545 (hover rojo), actual negro,
  // separador #797777. El ultimo item es la pagina actual (sin link).
  breadcrumb: (c) => {
    const items = list(c.items)
    const arr = items.length ? items : [{ label: 'Inicio' }]
    return (
      <nav className="cp-breadcrumb">
        <ol>
          {arr.map((it, i) => {
            const isLast = i === arr.length - 1
            return (
              <li key={i}>
                {i > 0 && <span className="cp-bc-sep">/</span>}
                {it.url && !isLast
                  ? <a className="cp-bc-link">{T(it.label, '—')}</a>
                  : <span className={isLast ? 'cp-bc-current' : 'cp-bc-link'}>{T(it.label, '—')}</span>}
              </li>
            )
          })}
        </ol>
      </nav>
    )
  },

  banner: (c) => {
    // Valores de MAQUINA del CMS (ver BANNER_TYPES). Las paginas viejas guardaban la
    // etiqueta, pero se migraron; igual se acepta la etiqueta por las dudas.
    const type = c.type || BT_MAIN_HERO
    const is = (machine, rx) => type === machine || rx.test(type)
    const promo = is(BT_ONLY_IMAGE, /only image|promotional/i)
    const secondary = is(BT_SECONDARY_HERO, /secondary hero/i)
    const fullbox = is(BT_FULL_BOX, /full image|box content/i)
    const brand = is(BT_BRAND_HERO, /brand hero/i)
    // Main Hero, Brand Hero y Secondary Hero comparten el tratamiento "hero":
    // imagen a sangre + overlay rgba(0,0,0,.3) + texto blanco centrado + CTA.
    const heroLike = is(BT_MAIN_HERO, /main hero/i) || brand || secondary
    const cta = ctaList(c)[0]?.label
    const { h, v } = parseBannerAlign(c.banner_align, heroLike)
    // Dimension recomendada (desktop) segun el Banner Type, para el placeholder.
    const dim = brand ? '2088×835px'
      : secondary ? '2100×700px'
      : promo ? '2088×696px'
      : fullbox ? '2088×1044px'
      : '2100×1050px'

    // Promotional (solo imagen). Un banner es UNO solo: para varios rotando esta el
    // "Carrusel de banners" (`Banner Wrapper`), que agrupa banners hijos.
    if (promo) return <div className="cp-banner"><Img src={c.image} aspect="3/1" dim={dim} /></div>

    // Hero (Main / Brand / Secondary). Modela el markup real (.main-hero / .banner,
    // --banner-bg, .btn-primary; CTA mt-6). Secondary = ratio mas ancho/bajo (3:1) y
    // sin bordes redondeados; Main = 2:1 con esquinas redondeadas.
    if (heroLike) {
      return (
        <div className={`cp-hero${secondary ? ' cp-hero--wide' : ''}`}>
          {c.image
            ? <MediaEl className="cp-hero-img" src={c.image} />
            : <div className="cp-hero-img cp-hero-ph"><span className="cp-dim-badge">{dim}</span></div>}
          <div className="cp-hero-scrim" />
          <div className={`cp-hero-content h-${h} v-${v}`}>
            <div className="cp-hero-title">{T(c.title, secondary ? 'Secondary Hero' : 'Main Hero')}</div>
            {c.description && <Rich className="cp-hero-desc">{c.description}</Rich>}
            {cta && <span className="cp-hero-cta">{cta}</span>}
          </div>
        </div>
      )
    }

    // Full Image + Box Content: imagen a sangre (radius 1rem) con una card frosted
    // (rgba blanco .25 + blur) abajo a la izquierda: h2 blanco + texto + CTA pill claro.
    if (fullbox) {
      return (
        <div className="cp-fib">
          {c.image
            ? <MediaEl className="cp-fib-img cp-img" src={c.image} />
            : <div className="cp-fib-img cp-img cp-img-ph"><ImageIcon size={22} /><span className="cp-ph-dim">{dim}</span></div>}
          <div className="cp-fib-card">
            <div className="cp-fib-title">{T(c.title, 'Full Image + Box Content')}</div>
            <Rich className="cp-fib-desc">{T(c.description, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.')}</Rich>
            <span className="cp-fib-cta">{T(cta, 'CTA')}</span>
          </div>
        </div>
      )
    }

    // Banner Card: caja blanca sobre la imagen.
    return (
      <div className="cp-banner" style={{ textAlign: h }}>
        <Img src={c.image} h={300} dim={dim} />
        <div className={`cp-banner-box ${h}`}>
          <div className="cp-h1">{T(c.title, 'Titulo del banner')}</div>
          {c.description && <Rich className="cp-p">{c.description}</Rich>}
          {cta && <span className="cp-cta">{cta}</span>}
        </div>
      </div>
    )
  },

  text: (c) => {
    // Todo lo visual sale del panel Classy, igual que en el CMS.
    const two = /two_columns/.test(c.content_text_styles || '')
    // La alineacion arrastra al CTA (en el CMS hoy no lo hace: es un bug reportado).
    const al = /center/.test(c.text_align || '') ? 'center'
      : /right/.test(c.text_align || '') ? 'right' : 'left'
    // Fondo por TOKEN del CMS. Los que no tenemos mapeados quedan sin pintar.
    const bg = BG_TOKENS[c.background_color] || null
    // Color del texto: el token elegido; si no hay, el que contraste con el fondo.
    const ink = BG_TOKENS[c.text_color] || (bg ? readableOn(bg) : null)
    // Sobre fondo oscuro el boton rojo no se ve: se invierte a blanco con el texto del
    // color del fondo. Se mira el FONDO, no el color del texto elegido.
    const onDark = bg ? readableOn(bg) === '#ffffff' : false
    const style = {}
    if (bg) { style.background = bg; style['--bg'] = bg }
    if (ink) style.color = ink
    return (
      <div
        className={`cp-block cp-text cp-al-${al}${bg ? ' cp-text--bg' : ''}${bg && !isBoxed(c) ? ' cp-bleed' : ''}${ink ? ' cp-text--ink' : ''}${onDark ? ' cp-text--ondark' : ''}`}
        style={Object.keys(style).length ? style : undefined}
      >
        {c.title && <div className="cp-h2">{c.title}</div>}
        {c.subtitle && <div className="cp-h3">{c.subtitle}</div>}
        <div className={two ? 'cp-cols-2' : ''}>
          <Rich className="cp-p">{T(c.body, 'Texto del bloque...')}</Rich>
          {two && <p className="cp-p">&nbsp;</p>}
        </div>
        {/* El CTA es repetible: se dibujan todos los cargados. */}
        {ctaList(c).map((b, i) => (
          <span key={i} className={`cp-cta${btnClass(c.style_button)}`}>{b.label}</span>
        ))}
      </div>
    )
  },

  // `accordion_grid`: la lista de desplegables sola (en el CMS suele ir dentro de una
  // columna de un layout). El primer item con texto arranca abierto.
  accordion_grid: (c) => {
    const items = list(c.items)
    const arr = items.length ? items : [
      { title: 'Primera pregunta', text: 'Dorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam eu turpis molestie, dictum est a, mattis tellus.' },
      { title: 'Segunda pregunta' },
      { title: 'Tercera pregunta' },
    ]
    const openIdx = arr.findIndex((it) => it.text)
    return (
      <div className="cp-block cp-half-acc">
        {arr.map((it, i) => (
          <details key={i} className="cp-acc-item" open={i === (openIdx < 0 ? 0 : openIdx)}>
            <summary className="cp-acc-sum">
              <span className="cp-acc-label">{T(it.title, 'Título')}</span>
              <ChevronDown size={18} className="cp-acc-chev" />
            </summary>
            {it.text && <Rich className="cp-acc-body">{it.text}</Rich>}
          </details>
        ))}
      </div>
    )
  },

  // `c_image`: imagen con texto. El LAYOUT sale del Classy `image_position`:
  //   - `image_bottom` -> el texto va ARRIBA, suelto sobre la pagina, y la imagen
  //     debajo (asi se ve en el sitio; es el unico valor que tenemos confirmado).
  //   - el resto (vacio incluido) -> la caja de texto va ENCIMA de la imagen, que es
  //     como venia. Los otros cuatro valores (`image_center`, `image_fixed_background`,
  //     `image_background_box`, `image_background_full`) todavia no estan dibujados:
  //     sin saber como se ven, mentir el mockup seria peor que dejar el generico.
  // `text_align` alinea el texto, igual que en el bloque de Texto.
  content_image: (c) => {
    const ctas = ctaList(c)
    const bottom = c.image_position === 'image_bottom'
    const al = /center/.test(c.text_align || '') ? 'center'
      : /right/.test(c.text_align || '') ? 'right' : 'left'
    /* `> 0` y no `ctas.length` a secas: sin CTAs la cadena vale 0 y React dibuja
       el cero como texto debajo de la imagen. */
    const hasText = c.title || c.subtitle || c.body || ctas.length > 0
    const txt = hasText && (
      <div className={bottom ? 'cp-cimg-txt' : 'cp-cimg-box'}>
        {c.title && <div className="cp-h2">{c.title}</div>}
        {c.subtitle && <div className="cp-h3">{c.subtitle}</div>}
        {c.body && <Rich className="cp-p">{c.body}</Rich>}
        {ctas.map((b, i) => (
          <span key={i} className={`cp-cta${btnClass(c.style_button)}`}>{b.label}</span>
        ))}
      </div>
    )
    return (
      <div className={`cp-block cp-cimg cp-al-${al}${bottom ? ' cp-cimg--bottom' : ''}`}>
        {bottom && txt}
        <Img src={c.image} h={340} />
        {!bottom && txt}
      </div>
    )
  },

  text_image: (c) => {
    const right = /derecha/i.test(c.image_position)
    return (
      <div className={`cp-block cp-ti ${right ? 'rev' : ''}`}>
        <div className="cp-ti-img"><Img src={c.image} h={220} /></div>
        <div className="cp-ti-txt">
          <div className="cp-h2">{T(c.title, 'Titulo')}</div>
          <Rich className="cp-p">{T(c.body, 'Texto...')}</Rich>
          {c.cta_label && <span className="cp-cta">{c.cta_label}</span>}
        </div>
      </div>
    )
  },

  // Aliados y Servicios: imagen de fondo a sangre con titulo + subtitulo y flechas
  // arriba; fila de tarjetas abajo (Pet ID roja destacada; el resto frosted con
  // icono, titulo, texto y flecha).
  services_carousel: (c, ctx) => {
    const cards = list(c.cards)
    const arr = cards.length ? cards : [
      { title: 'Pet ID', text: 'Crea tu Pet ID y obtén una experiencia personalizada para ti y tu mascota.', highlighted: 'Si' },
      { title: 'Razas', text: 'Todo sobre las razas que mejor se adaptan a tu estilo de vida.' },
      { title: 'Adopción', text: 'El match ideal para compartir grandes momentos.' },
      { title: 'Tiendas', text: 'Encuentra productos Purina® cerca de ti.' },
      { title: 'Cuidadores', text: 'Una red completa de hoteles y cuidadores.' },
    ]
    // Los iconos de las tarjetas toman el acento de la marca (si hay).
    return (
      <div className="cp-svc" style={ctx?.brandAccent ? { '--detail': ctx.brandAccent } : undefined}>
        {c.background ? <MediaEl className="cp-svc-bg" src={c.background} /> : <div className="cp-svc-bg cp-svc-bg-ph"><span className="cp-dim-badge">Fondo 2160×1212px</span></div>}
        <div className="cp-svc-scrim" />
        <div className="cp-svc-bottom">
          <div className="cp-svc-headrow">
            <div className="cp-svc-head">
              <div className="cp-svc-title">{T(c.title, 'Aliados y Servicios')}</div>
              <div className="cp-svc-sub"><RT>{T(c.subtitle, 'Información, consultas y herramientas para tu día a día con Purina®')}</RT></div>
            </div>
            <div className="cp-svc-arrows">
              <span className="cp-svc-nav" onClick={scrollCarousel(-1)}>‹</span><span className="cp-svc-nav" onClick={scrollCarousel(1)}>›</span>
            </div>
          </div>
          <div className="cp-svc-cards">
            {arr.map((card, i) => {
              const hl = /si|sí/i.test(card.highlighted)
              return (
                <div key={i} className={`cp-svc-card${hl ? ' hl' : ''}`}>
                  {/* Icono elegido de una lista (por ahora solo "pata" -> huella). */}
                  {!hl && <span className="cp-svc-ico"><PawPrint size={22} /></span>}
                  <div className="cp-svc-card-t">{T(card.title, 'Servicio')}</div>
                  {card.text && <Rich className="cp-svc-card-s">{card.text}</Rich>}
                  <span className="cp-svc-arrow">→</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  },

  // Marcas Purina®: cabecera (titulo + subtitulo + flechas) y carrusel de marcas.
  // Cada card: imagen de marca (con toggles perro/gato) + pie gris (nombre + bajada).
  brand_cards: (c) => {
    const cards = list(c.cards)
    const arr = cards.length ? cards : [
      { name: 'Purina® Pro Plan®', description: 'Dale una nutrición avanzada para cuidar y satisfacer cada una de sus necesidades.', pets: 'Perro + Gato' },
      { name: 'Purina® Dog Chow®', description: 'Conoce nuestra línea de alimentos que ayudan a maximizar la vida de tu perro.', pets: 'Perro' },
      { name: 'Purina® Felix®', description: 'Sorpréndelo todos los días con nuestra variedad de alimento húmedo.', pets: 'Gato' },
      { name: 'Purina® Cat Chow®', description: 'Nutrición completa y balanceada para acompañar cada etapa de tu gato.', pets: 'Gato' },
    ]
    const moreText = c.see_more_text == null ? 'Ver todas' : c.see_more_text
    return (
      <div className="cp-brands">
        <div className="cp-brands-head">
          <div>
            <div className="cp-brands-title">{T(c.title, 'Marcas Purina®')}</div>
            {OPT(c.subtitle) && <div className="cp-brands-sub">{OPT(c.subtitle)}</div>}
          </div>
          <div className="cp-plist-arrows"><span className="cp-plist-arrow" onClick={scrollCarousel(-1)}>‹</span><span className="cp-plist-arrow" onClick={scrollCarousel(1)}>›</span></div>
        </div>
        <div className="cp-brands-row">
          {arr.map((card, i) => {
            const pets = card.pets || 'Perro + Gato'
            // "Sin iconos": el carrusel se usa para algo que no es una marca (pasos de
            // un proceso, refugios aliados...), asi que no van los iconos perro/gato.
            const noIcons = pets === 'Sin iconos'
            return (
              <div key={i} className="cp-brandc">
                <div className="cp-brandc-media">
                  <Img src={card.image} aspect="4/3" dim="822×616px" className="cp-brandc-img" />
                  {!noIcons && (
                    <div className="cp-brandc-pets">
                      {/perro|perro \+ gato/i.test(pets) && <span className="cp-brandc-pet"><Dog size={15} /></span>}
                      {/gato/i.test(pets) && <span className="cp-brandc-pet"><Cat size={15} /></span>}
                    </div>
                  )}
                </div>
                <div className="cp-brandc-body">
                  <div className="cp-brandc-name">{T(card.name, 'Marca Purina®')}</div>
                  {card.description && <Rich className="cp-brandc-desc">{card.description}</Rich>}
                </div>
              </div>
            )
          })}
        </div>
        {moreText && <div className="cp-plist-more"><span className="cp-plist-more-btn">{moreText}</span></div>}
      </div>
    )
  },

  // Nuestro Blog: cabecera + carrusel de articulos. Cada card = imagen con chip de
  // categoria y titulo superpuestos + boton +. La primera card es la destacada (grande).
  articles_carousel: (c) => {
    const cards = list(c.cards)
    const arr = cards.length ? cards : [
      { category: 'Nutrición y cuidados', category_color: '#582d84', title: 'Rutina diaria para mascotas saludables' },
      { category: 'Mascota activa', category_color: '#dd440a', title: 'Actividades ideales para mascotas activas y felices' },
      { category: 'Mascota activa', category_color: '#dd440a', title: 'Tips para disfrutar al aire libre con tu mascota' },
    ]
    const moreText = c.see_more_text == null ? 'Explora más artículos' : c.see_more_text
    return (
      <div className="cp-brands">
        <div className="cp-brands-head">
          <div>
            <div className="cp-brands-title"><span className="cp-spark">✦</span> {T(c.title, 'Nuestro Blog')}</div>
            {OPT(c.subtitle) && <div className="cp-brands-sub">{OPT(c.subtitle)}</div>}
          </div>
          <div className="cp-plist-arrows"><span className="cp-plist-arrow" onClick={scrollCarousel(-1)}>‹</span><span className="cp-plist-arrow" onClick={scrollCarousel(1)}>›</span></div>
        </div>
        <div className="cp-artc-row">
          {arr.map((a, i) => (
            <div key={i} className={`cp-artc-card${i === 0 ? ' feat' : ''}`}>
              {a.image ? <MediaEl className="cp-artc-img" src={a.image} /> : <div className="cp-artc-img cp-artc-ph"><ImageIcon size={20} /></div>}
              <div className="cp-artc-scrim" />
              {a.category && <span className="cp-artc-cat" style={{ background: a.category_color || '#582d84' }}>{a.category}</span>}
              <div className="cp-artc-ttl">{T(a.title, 'Título del artículo')}</div>
              <span className="cp-artc-plus">+</span>
            </div>
          ))}
        </div>
        {moreText && <div className="cp-plist-more"><span className="cp-plist-more-btn">{moreText}</span></div>}
      </div>
    )
  },

  // Footer banner Pet Club: pastilla oscura con logo + titulo + texto + boton, y
  // fotos de mascotas decorativas (con acento rojo) a los lados.
  footer_banner: (c) => {
    // Cuadros decorativos fijos (blancos con acento rojo), no editables.
    const squares = ['l0', 'l1', 'l2', 'r0', 'r1', 'r2']
    return (
      <div className="cp-fb">
        {squares.map((s) => <div key={s} className={`cp-fb-sq cp-fb-sq--${s}`} />)}
        <div className="cp-fb-inner">
          <div className="cp-fb-logo">
            <img className="cp-fb-logo-img" src={PETCLUB_LOGO} alt="Purina" />
            <span className="cp-fb-logo-club">Pet club</span>
          </div>
          <div className="cp-fb-title">{T(c.title, 'Lo mejor para tu mascota empieza aquí')}</div>
          <Rich className="cp-fb-desc">{T(c.subtitle, 'Forma parte de Purina® Pet Club y descubre beneficios, recomendaciones y contenido pensado especialmente para ustedes.')}</Rich>
          <span className="cp-fb-btn">{T(c.button_text, 'Unirme al club')}</span>
        </div>
      </div>
    )
  },

  // Carrusel de testimonios "Historias que inspiran": imagen ovalada a la izquierda +
  // eyebrow con flechas, cita, autor y boton "Compartir mi historia" a la derecha.
  testimonials: (c) => {
    const items = list(c.items)
    const it = items[0] || { quote: 'Romeo fue rescatado a los 2 años y hoy es el compañero más feliz que podría desear.', author: 'Enzina Musk, mamá orgullosa de Romeo' }
    return (
      <div className="cp-testi">
        <div className="cp-testi-media">
          {it.image
            ? <MediaEl className="cp-testi-img" src={it.image} />
            : <div className="cp-testi-img cp-testi-ph"><ImageIcon size={22} /><span className="cp-ph-dim">900×840px</span></div>}
          {it.image_title && <div className="cp-testi-overlay">{it.image_title}</div>}
          <span className="cp-testi-dot" />
        </div>
        <div className="cp-testi-body">
          <div className="cp-testi-head">
            <div className="cp-testi-eyebrow">{T(c.eyebrow, 'Historias que inspiran')}</div>
            <div className="cp-plist-arrows"><span className="cp-plist-arrow disabled">‹</span><span className="cp-plist-arrow">›</span></div>
          </div>
          <div className="cp-testi-quote">“<RT>{T(it.quote, 'Testimonio de la persona sobre su experiencia con su mascota.')}</RT>”</div>
          {it.author && <div className="cp-testi-author">{it.author}</div>}
          <span className="cp-testi-btn">{T(c.button_text, 'Compartir mi historia')}</span>
        </div>
      </div>
    )
  },

  // Selector de especie "Quién manda en tu casa": titulo + subtitulo y pastillas
  // (avatar circular + label) para elegir Gato / Perro.
  species_selector: (c) => {
    // Estatico: Gato / Perro con los iconos de gato y perro (reusa Cat / Dog).
    const opts = [{ label: 'Gato', Icon: Cat }, { label: 'Perro', Icon: Dog }]
    return (
      <div className="cp-species">
        <div className="cp-species-title">{T(c.title, 'Quién manda en tu casa')}</div>
        <div className="cp-species-sub">{T(c.subtitle, 'Elige tu mascota para personalizar tu experiencia:')}</div>
        <div className="cp-species-opts">
          {opts.map((o) => (
            <div key={o.label} className="cp-species-opt">
              <span className="cp-species-av"><o.Icon size={26} /></span>
              <span className="cp-species-label">{o.label}</span>
            </div>
          ))}
        </div>
      </div>
    )
  },

  // Listado de productos "Más populares": tabs de filtro (activo en rojo) + flechas,
  // carrusel de card-products (fondo gris, imagen contenida, titulo debajo). Card promo
  // (Pet ID) opcional en rojo + boton "Ver todos". Sin imagen usa placeholder.
  product_list: (c) => {
    const filters = String(c.filters && c.filters.trim() ? c.filters : 'Más populares, Seco, Húmedo, Snacks')
      .split(',').map((s) => s.trim()).filter(Boolean)
    const products = list(c.products)
    // Los productos los pullea el CMS: cada uno es solo un placeholder con el nombre.
    const arr = products.length ? products : [{}, {}, {}, {}, {}]
    // Pet ID: card fija (no editable), se muestra/oculta con el checkbox del builder.
    const showPetId = c.show_petid !== false
    // Tabs de filtro por categoria: solo si el toggle esta activo (default: mostrar).
    const showFilters = c.show_filters !== false
    // Imagen izquierda OPCIONAL (650×692): solo si el toggle esta activo.
    const showLeft = c.show_left_image === true
    const moreText = c.see_more_text == null ? 'Ver todos' : c.see_more_text
    return (
      <div className={`cp-plist${showLeft ? ' has-left' : ''}`}>
        {c.title && <div className="cp-plist-h2">{c.title}</div>}
        {/* La cabecera (tabs + flechas) va arriba, a lo ancho: asi la imagen izquierda
            y las cards de producto arrancan a la misma altura (quedan alineadas). */}
        <div className="cp-plist-head">
          <div className="cp-plist-tabs">
            {showFilters && filters.map((f, i) => <span key={i} className={`cp-plist-tab${i === 0 ? ' active' : ''}`}>{f}</span>)}
          </div>
          <div className="cp-plist-arrows">
            <span className="cp-plist-arrow" onClick={scrollCarousel(-1)}>‹</span>
            <span className="cp-plist-arrow" onClick={scrollCarousel(1)}>›</span>
          </div>
        </div>
        <div className="cp-plist-main">
          {showLeft && (
            <div className="cp-plist-left">
              <Img src={c.left_image} aspect="650/692" dim="650×692px" className="cp-plist-leftimg" />
            </div>
          )}
          <div className="cp-plist-content">
            <div className="cp-plist-row">
              {showPetId && (
                <div className="cp-plist-promo">
                  <div className="cp-plist-promo-t">Pet ID</div>
                  <p className="cp-plist-promo-d">Crea tu Pet ID y obtén sugerencias de alimentos y cuidados personalizados para tu mascota.</p>
                  <span className="cp-plist-promo-arrow">→</span>
                </div>
              )}
              {arr.map((p, i) => (
                <div key={i} className="cp-plist-card">
                  <div className="cp-plist-ph"><span>{T(p.title, `Producto ${i + 1}`)}</span></div>
                </div>
              ))}
            </div>
            {moreText && <div className="cp-plist-more"><span className="cp-plist-more-btn">{moreText}</span></div>}
          </div>
        </div>
      </div>
    )
  },

  // Linea de tiempo "Historia": header centrado + carrusel de hitos. Cada hito lleva
  // una pill de anho (roja) sobre una linea horizontal punteada, un conector vertical
  // punteado que baja hasta un punto rojo, y la imagen 274x190 + titulo + descripcion.
  timeline: (c) => {
    const items = list(c.items)
    const arr = items.length ? items : [
      { year: '1894', title: 'Purina is founded in St. Louis, Missouri, USA.', description: 'Purina was founded by William H. Danforth, who began with farm animal feed but had a greater ambition — to create high-quality, convenient nutrition for companion animals.' },
      { year: '1926', title: 'First centre dedicated to dog nutrition', description: 'Purina opens the industry\'s first dedicated pet nutrition centre in Gray Summit, Missouri. Backed by feeding studies and data-driven testing, this sets a new standard in understanding the nutritional needs of dogs.' },
      { year: '1957', title: 'First kibble biscuit produced', description: 'Purina pioneers the use of extrusion technology in pet food and produces the first kibble biscuit. This innovation improves cooking, boosts digestibility, and enhances taste in a convenient, ready-to-serve format.' },
      { year: '1961', title: 'First complete cat nutrition', description: 'Purina develops one of the first complete and balanced diets formulated specifically for cats.' },
    ]
    return (
      <div className="cp-tl">
        <div className="cp-tl-head">
          {OPT(c.title) && <div className="cp-tl-h1">{OPT(c.title)}</div>}
          {OPT(c.subtitle) && <div className="cp-tl-sub">{OPT(c.subtitle)}</div>}
        </div>
        <div className="cp-tl-track">
          {arr.map((it, i) => (
            <div key={i} className="cp-tl-item">
              <span className="cp-tl-year">{T(it.year, '—')}</span>
              {it.image
                ? <MediaEl className="cp-tl-img" src={it.image} />
                : <div className="cp-tl-img cp-tl-ph"><ImageIcon size={20} /><span className="cp-ph-dim">670×502px</span></div>}
              <div className="cp-tl-name">{T(it.title, 'Título del hito')}</div>
              <Rich className="cp-tl-desc">{T(it.description, 'Descripción del hito.')}</Rich>
              <span className="cp-tl-dot" />
            </div>
          ))}
        </div>
        <div className="cp-plist-arrows cp-tl-arrows">
          <span className="cp-plist-arrow" onClick={scrollTL(-1)}>‹</span>
          <span className="cp-plist-arrow" onClick={scrollTL(1)}>›</span>
        </div>
      </div>
    )
  },

  // Carrusel "Compromiso Purina": header (titulo + subtitulo) con flechas + cards
  // verticales con imagen de fondo a sangre, titulo arriba y descripcion abajo.
  commitment_carousel: (c, ctx) => {
    // Cinco variantes del mismo carrusel. Por defecto la vertical (la que ya existia,
    // "Compromiso Purina®"), asi las paginas ya armadas no cambian.
    const v = c.type || CMT_VERTICAL
    const icon = v === CMT_ICON
    const nums = v === CMT_NUMBERS
    const wide = v === CMT_WIDE_BOTTOM || v === CMT_WIDE_TOP
    // Si hay marca seleccionada, los titulos de las cards toman su acento (detalle).
    const titleStyle = ctx?.brandAccent ? { color: ctx.brandAccent } : undefined
    // Banda de color (solo la variante con iconos). Es OPCIONAL, igual que el fondo de
    // las demas variantes: sin color cargado NO hay banda. El relleno de las cards se
    // aclara a partir de ella cuando la hay.
    const band = T(c.color, null)
    // Numeradas: el chip y el titulo van con el acento (color propio > marca > rojo).
    const acc = T(c.accent, ctx?.brandAccent || ACCENT)
    // Fondo del bloque (fuera de la variante con iconos, que usa su banda) y color del
    // HEADER (titulo, subtitulo, flechas). Sin cargar = como estaba: sin fondo y con los
    // colores por defecto. El color del texto NO baja a las cards.
    const bg = T(c.background_color, null)
    const txt = T(c.text_color, null)
    const items = list(c.items)
    const arr = items.length ? items : (nums
      ? [
        { title: 'Card grid item title number 1', description: 'Card grid item description number 1' },
        { title: 'Card grid item title number 2', description: 'Card grid item description number 2' },
        { title: 'Card grid item title number 3', description: 'Card grid item description number 3' },
        { title: 'Card item 4 title', description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus id fermentum massa.' },
      ]
      : icon
      ? [
        { icon: 'perro', title: 'Card 1 - title', description: 'Lorem ipsum dolor sit amet. Praesent tincidunt sem sit amet tellus sagittis congue.', url: 'https://ejemplo.com' },
        { icon: 'perro', title: 'Card item 2 - grid - title', description: 'Praesent tincidunt sem sit amet tellus sagittis congue. Proin aliquet.' },
        { icon: 'gato', title: 'Title - Praesent tincidunt sem sit amet tellus', description: 'Praesent tincidunt sem sit amet tellus sagittis congue. Proin aliquet.' },
        { icon: 'pata', title: 'Card grid item 4', description: 'Sed a ex gravida, ornare urna vitae, faucibus justo.' },
      ]
      : [
        { title: 'Para mascotas y personas', description: 'Enriquecer la vida de las mascotas y de las personas que las aman.' },
        { title: 'Nutrición y calidad', description: 'Defender la seguridad y la nutrición de alta calidad.' },
        { title: 'Innovación', description: 'Impulsar innovaciones que ayuden a las mascotas a prosperar.' },
        { title: 'Sostenibilidad', description: 'Contribuir al cuidado del planeta.' },
      ])
    // Medida del placeholder. Viene de arriba cuando la sabe quien llama (el Card Grid
    // la resuelve con `getSpecs`, que mira el modo de vista Y el estilo de card); si no,
    // la de las verticales, que es el unico caso que este render conoce por si solo.
    const dim = c.dim || '822×1230px'
    const style = {}
    if (icon) {
      // El relleno de la card sale del "Card - Background Color" del CMS, cuyo default
      // es BLANCO. No se deduce de la banda: son dos campos distintos.
      style['--card'] = T(c.card_color, '#FFFFFF')
      if (band) style['--band'] = band
    } else if (bg) style.background = bg
    // Lo que el bloque pinta de verdad: la banda en la variante con iconos, el fondo en
    // las demas. Es lo que decide si es una seccion (a sangre) o no.
    const painted = icon ? band : bg
    // Boxed = el fondo se queda dentro del container; sin eso (o en Full Width) va a
    // sangre. La key viaja desde el Card Grid en `background_position`.
    const bleed = painted && !isBoxed(c)
    if (nums) style['--acc'] = acc
    if (txt) style['--txt'] = txt
    return (
      <div
        // `cp-bleed` = el bloque tiene fondo pintado, o sea que es una SECCION: va a
        // sangre (ver la regla generica en el CSS). Sin fondo no se toca.
        className={`cp-brands cp-cmt cp-cmt--${icon ? 'icon' : nums ? 'nums' : v === CMT_WIDE_BOTTOM ? 'wideb' : v === CMT_WIDE_TOP ? 'widet' : 'vert'}${bg && !icon ? ' cp-cmt--hasbg' : ''}${icon && band ? ' cp-cmt--band' : ''}${bleed ? ' cp-bleed' : ''}${txt ? ' cp-cmt--hastxt' : ''}`}
        style={Object.keys(style).length ? style : undefined}
      >
        <div className="cp-brands-head">
          <div>
            {OPT(c.title) && <div className="cp-brands-title">{c.title}</div>}
            {OPT(c.subtitle) && <div className="cp-brands-sub">{OPT(c.subtitle)}</div>}
          </div>
          <div className="cp-plist-arrows">
            <span className="cp-plist-arrow" onClick={scrollCmt(-1)}>‹</span>
            <span className="cp-plist-arrow" onClick={scrollCmt(1)}>›</span>
          </div>
        </div>
        <div className="cp-cmt-row">
          {arr.map((it, i) => (
            <div key={i} className="cp-cmt-card">
              {icon ? (
                <span className="cp-cmt-icon"><FeatureIcon name={it.icon} size={34} /></span>
              ) : nums ? (
                // El numero NO es un campo: sale de la posicion de la card.
                <span className="cp-cmt-num">{i + 1}</span>
              ) : (
                <>
                  {it.image
                    ? <MediaEl className="cp-cmt-img" src={it.image} />
                    : <div className="cp-cmt-img cp-cmt-ph"><ImageIcon size={24} /><span className="cp-ph-dim">{dim}</span></div>}
                  <div className="cp-cmt-scrim" />
                </>
              )}
              <div className="cp-cmt-body">
                <div className="cp-cmt-ttl" style={icon || wide || nums ? undefined : titleStyle}>{T(it.title, 'Título')}</div>
                <Rich className="cp-cmt-desc">{T(it.description, 'Descripción del compromiso.')}</Rich>
              </div>
              {/* La flecha aparece cuando la card tiene link cargado. */}
              {it.url && <span className="cp-cmt-go" aria-hidden="true"><ArrowRight size={18} /></span>}
            </div>
          ))}
        </div>
      </div>
    )
  },

  // Bloque 50/50: titulo + texto a la izquierda; a la derecha texto o un desplegable
  // (acordeon) de items. Usa <details>/<summary> nativos (click para abrir/cerrar);
  // el item abierto marca su titulo en rojo.
  fifty_fifty: (c) => {
    const drop = !/texto/i.test(c.right_type || '') // por defecto: desplegable
    const items = list(c.items)
    const arr = items.length ? items : [
      { title: 'Misión' },
      { title: 'Visión', text: 'Dorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam eu turpis molestie, dictum est a, mattis tellus. Sed dignissim, metus nec fringilla accumsan, risus sem sollicitudin lacus.' },
      { title: 'Valores' },
    ]
    const openIdx = arr.findIndex((it) => it.text)
    return (
      <div className="cp-half">
        <div className="cp-half-left">
          <div className="cp-half-title">{T(c.title, 'Nutriendo mascotas. Enriqueciendo vidas.')}</div>
          <Rich className="cp-half-text">{T(c.text, 'Desde hace más de 130 años creemos que las mascotas y las personas están mejor juntas. Por eso ponemos tanto cuidado en la calidad de nuestros alimentos: porque también amamos a las mascotas.')}</Rich>
        </div>
        <div className="cp-half-right">
          {drop ? (
            <div className="cp-half-acc">
              {arr.map((it, i) => (
                <details key={i} className="cp-acc-item" open={i === (openIdx < 0 ? 0 : openIdx)}>
                  <summary className="cp-acc-sum">
                    <span className="cp-acc-label">{T(it.title, 'Título')}</span>
                    <ChevronDown size={18} className="cp-acc-chev" />
                  </summary>
                  {it.text && <Rich className="cp-acc-body">{it.text}</Rich>}
                </details>
              ))}
            </div>
          ) : (
            <Rich className="cp-half-rtext">{T(c.right_text, 'Texto de la columna derecha, con el contenido que acompaña al título de la izquierda.')}</Rich>
          )}
        </div>
      </div>
    )
  },

  // Hero con tarjetas: fondo en gradiente (color configurable, --acc) con una imagen
  // de fondo opcional; titulo + subtitulo centrados arriba y una fila de tarjetas
  // blancas (icono + titulo de color + texto) apoyadas sobre el gradiente.
  gradient_cards: (c, ctx) => {
    // El GRADIENTE usa el color de relleno: el cargado a mano, si no el secundario de
    // la marca (ej. Fancy Feast crema), si no el rojo Purina.
    const acc = c.color ? c.color : (ctx?.brandSecondary || ACCENT)
    // Los ICONOS y TITULOS de las tarjetas usan el acento de la marca (detalle), que
    // puede diferir del secundario (en Fancy Feast el secundario es casi blanco).
    const detail = ctx?.brandAccent || (c.color ? c.color : ACCENT)
    const cards = list(c.cards)
    const arr = cards.length ? cards : [
      { title: 'Dorem ipsum', text: 'Yorem ipsum dolor sit amet, consectetur adipiscing elit', icon: 'gato' },
      { title: 'Adipiscing elit', text: 'Morem ipsum dolor sit amet, consectetur adipiscing elit.', icon: 'gato' },
      { title: 'Forem ipsum dolor', text: 'Corem ipsum dolor sit amet, consectetur adipiscing elit.', icon: 'gato' },
    ]
    return (
      <div className="cp-gcards" style={{ '--acc': acc, '--detail': detail }}>
        <div className="cp-gcards-bg">
          {c.background ? <MediaEl className="cp-gcards-bgimg" src={c.background} /> : <div className="cp-gcards-bgph" />}
          <div className="cp-gcards-grad" />
        </div>
        <div className="cp-gcards-head">
          <div className="cp-gcards-title">{T(c.title, 'Dorem ipsum dolor sit')}</div>
          {OPT(c.subtitle) && <div className="cp-gcards-sub">{OPT(c.subtitle)}</div>}
        </div>
        <div className="cp-gcards-row">
          {arr.map((card, i) => (
            <div key={i} className="cp-gcard">
              <span className="cp-gcard-ico"><FeatureIcon name={card.icon} /></span>
              <div className="cp-gcard-t">{T(card.title, 'Título')}</div>
              <Rich className="cp-gcard-d">{T(card.text, 'Texto de la tarjeta.')}</Rich>
            </div>
          ))}
        </div>
      </div>
    )
  },

  // Texto con imagen ancha: titulo a la izquierda, imagen ancha (16:6) y un parrafo al pie.
  text_wide_image: (c) => (
    <div className="cp-twi">
      <div className="cp-twi-title">{T(c.title, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.')}</div>
      <Img src={c.image} aspect="21/8" dim="2100×760px" className="cp-twi-img" />
      <Rich className="cp-twi-body">{T(c.body, 'Borem ipsum dolor sit amet, consectetur adipiscing elit. Etiam eu turpis molestie, dictum est a, mattis tellus. Sed dignissim, metus nec fringilla accumsan, risus sem sollicitudin lacus, ut interdum tellus elit sed risus.')}</Rich>
    </div>
  ),

  // Imagen + destacados: titulo + subtitulo centrados, imagen ancha (16:9) y una fila
  // de destacados (icono + titulo de color configurable + texto).
  image_features: (c) => {
    const acc = T(c.color, ACCENT)
    const feats = list(c.features)
    const arr = feats.length ? feats : [
      { title: 'Rorem ipsum dolor sit amet, consectetur', text: 'Worem ipsum dolor sit amet, consectetur adipiscing elit.', icon: 'gato' },
      { title: 'Jorem ipsum dolor sit amet, consectetur adipiscing elit', text: 'Yorem ipsum dolor sit amet, consectetur adipiscing elit.', icon: 'gato' },
      { title: 'Lorem ipsum dolor sit amet, consectetur', text: 'Porem ipsum dolor sit amet, consectetur adipiscing elit.', icon: 'gato' },
    ]
    return (
      <div className="cp-imgfeat" style={{ '--acc': acc }}>
        <div className="cp-imgfeat-head">
          <div className="cp-imgfeat-title">{T(c.title, 'Worem ipsum dolor sit amet, consectetur adipiscing elit')}</div>
          {OPT(c.subtitle) && <div className="cp-imgfeat-sub">{OPT(c.subtitle)}</div>}
        </div>
        <Img src={c.image} aspect="16/9" dim="2160×1080px" className="cp-imgfeat-img" />
        <div className="cp-imgfeat-row">
          {arr.map((f, i) => (
            <div key={i} className="cp-imgfeat-item">
              <span className="cp-imgfeat-ico"><FeatureIcon name={f.icon} /></span>
              <div className="cp-imgfeat-t">{T(f.title, 'Título del destacado')}</div>
              <Rich className="cp-imgfeat-d">{T(f.text, 'Texto del destacado.')}</Rich>
            </div>
          ))}
        </div>
      </div>
    )
  },

  // Carrusel de banners: CONTENEDOR (`Banner Wrapper`). No dibuja nada propio — sus
  // slides son OTROS componentes (los banners hijos), que llegan renderizados en
  // `ctx.slots[0]`. En el sitio rotan de a uno; aca van apilados a proposito, para poder
  // verlos y editarlos todos (y para que la captura del Excel los muestre a los dos).
  banner_wrapper: (c, ctx) => (
    <div className="cp-bwrap">
      <div className="cp-bwrap-head">
        <span className="cp-bwrap-arrow">‹</span>
        <span>Carrusel de banners — en el sitio rotan de a uno</span>
        <span className="cp-bwrap-arrow">›</span>
      </div>
      <div className="cp-bwrap-slot">{ctx?.slots?.[0]}</div>
    </div>
  ),

  // Pestañas: CONTENEDOR. Titulo/subtitulo opcionales, la barra de pestañas y, debajo,
  // la descripcion de la pestaña activa + el contenido, que NO es de este componente:
  // son OTROS componentes (los hijos), que llegan renderizados en `ctx.slot`.
  tabs: (c, ctx) => {
    const items = tabList(c)
    const active = Math.min(Math.max(0, ctx?.activeTab || 0), items.length - 1)
    const cur = items[active] || {}
    const acc = ctx?.brandAccent || ACCENT
    const title = OPT(c.title)
    const subtitle = OPT(c.subtitle)
    return (
      <div className="cp-tabs" style={{ '--tab-acc': acc }}>
        {(title || subtitle) && (
          <div className="cp-tabs-head">
            {title && <div className="cp-tabs-title">{title}</div>}
            {subtitle && <p className="cp-tabs-sub"><RT>{subtitle}</RT></p>}
          </div>
        )}
        <div className="cp-tabs-bar" role="tablist">
          {items.map((t, i) => (
            <button
              key={i}
              type="button"
              className={`cp-tab${i === active ? ' on' : ''}`}
              onClick={ctx?.onTab ? (e) => { e.stopPropagation(); ctx.onTab(i) } : undefined}
            >
              {T(t.label, `Pestaña ${i + 1}`)}
            </button>
          ))}
        </div>
        {cur.description && <p className="cp-tabs-desc"><RT>{cur.description}</RT></p>}
        <div className="cp-tabs-slot">{ctx?.slots}</div>
      </div>
    )
  },

  // Video externo: titulo opcional arriba y el video a lo ancho (16:9) con su imagen
  // de portada y el boton de play encima. Sin portada cargada queda el placeholder con
  // la medida, igual que cualquier imagen.
  external_video: (c) => (
    <div className="cp-vid">
      {/* Cabecera opcional: si no hay ni titulo ni subtitulo no ocupa lugar. */}
      {(OPT(c.title) || OPT(c.subtitle)) && (
        <div className="cp-vid-head">
          {OPT(c.title) && (
            <div className="cp-vid-title">{OPT(c.title)}</div>
          )}
          {OPT(c.subtitle) && (
            <p className="cp-vid-sub"><RT>{OPT(c.subtitle)}</RT></p>
          )}
        </div>
      )}
      <div className="cp-vid-frame">
        {/* La portada NO se carga a mano: si el link es de YouTube se usa su propio
            thumbnail, igual que en el sitio. Un MP4 muestra su primer frame. */}
        <Img src={videoPreview(c.video_url)} aspect="16/9" dim="Preview del video" className="cp-vid-img" />
        <span className="cp-vid-play" aria-hidden="true">
          <Play size={26} />
        </span>
      </div>
    </div>
  ),

  // Mosaico: titulo + subtitulo centrados y una grilla que alterna imagenes con cajas
  // de contenido (color configurable). Los bloques se alternan por posicion: par =
  // imagen, impar = caja de contenido (titulo + texto).
  mosaic: (c, ctx) => {
    // TODAS las cajas de contenido usan el mismo color: el cargado, o el secundario de
    // la marca de la pagina (ej. Pro Plan #d7bb77), o el rojo por defecto. Las celdas de
    // imagen no llevan color.
    const acc = c.color ? c.color : (ctx?.brandSecondary || ACCENT)
    const blocks = list(c.blocks)
    const defaults = [
      {}, { title: 'Sorem ipsum dolor sit amet, consectetur.', text: 'Worem ipsum dolor sit amet, consectetur adipiscing elit.' },
      {}, { title: 'Borem ipsum dolor sit amet, consectetur.', text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
      {}, { title: 'Porem ipsum dolor sit amet, consectetur.', text: 'Torem ipsum dolor sit amet, consectetur adipiscing elit.' },
    ]
    // El mosaico SIEMPRE tiene 6 bloques (ni mas, ni menos): se rellena/recorta a 6.
    const src = blocks.length ? blocks : defaults
    const arr = Array.from({ length: 6 }, (_, i) => src[i] || {})
    // Texto de las cajas: por defecto blanco; si la marca define un color primario
    // (ej. Pro Plan = negro), se usa ese color SIEMPRE QUE contraste con la caja. Si no
    // (Fancy Feast: primario blanco sobre secundario crema), cae a negro/blanco legible.
    const boxTextStyle = ctx?.brandPrimary ? { color: readableOn(acc, ctx.brandPrimary) } : undefined
    return (
      <div className="cp-mosaic" style={{ '--acc': acc }}>
        <div className="cp-mosaic-head">
          <div className="cp-mosaic-title">{T(c.title, 'Worem ipsum dolor sit amet, consectetur adipiscing elit')}</div>
          {OPT(c.subtitle) && <div className="cp-mosaic-sub"><RT>{OPT(c.subtitle)}</RT></div>}
        </div>
        <div className="cp-mosaic-grid">
          {arr.map((b, i) => (i % 2 === 1) ? (
            <div key={i} className="cp-mosaic-box" style={{ background: acc }}>
              <div className="cp-mosaic-box-t" style={boxTextStyle}>{T(b.title, 'Título del bloque')}</div>
              <Rich className="cp-mosaic-box-d" style={boxTextStyle}>{T(b.text, 'Texto del bloque de contenido.')}</Rich>
            </div>
          ) : (
            <div key={i} className="cp-mosaic-cell">
              <Img src={b.image} aspect="1/1" dim="760×760px" className="cp-mosaic-img" />
            </div>
          ))}
        </div>
      </div>
    )
  },

  // CARD GRID: el componente del CMS. El layout lo decide el "Modo de vista", asi que
  // el render despacha al mockup que corresponda reusando los que ya teniamos. Los
  // colores llegan como TOKENS: se pintan los que estan en BG_TOKENS y el resto no.
  card_grid: (c, ctx) => {
    const mode = c.view_mode || CARD_GRID_DEFAULT_MODE
    const tok = (v) => BG_TOKENS[v] || null
    const items = list(c.items)
    if (mode === 'grid-cards') {
      // Cada card del CMS son DOS celdas del mosaico: su imagen y su caja de texto.
      const acc = tok(c.background_card_color) || ctx?.brandSecondary || ACCENT
      const arr = items.length ? items : [
        { title: 'Título de la card', description: 'Texto de la card.' },
        { title: 'Segunda card', description: 'Texto de la segunda card.' },
        { title: 'Tercera card', description: 'Texto de la tercera card.' },
      ]
      const boxTextStyle = ctx?.brandPrimary ? { color: readableOn(acc, ctx.brandPrimary) } : undefined
      return (
        <div className="cp-mosaic" style={{ '--acc': acc }}>
          {(OPT(c.title) || OPT(c.subtitle)) && (
            <div className="cp-mosaic-head">
              {OPT(c.title) && <div className="cp-mosaic-title">{c.title}</div>}
              {OPT(c.subtitle) && <div className="cp-mosaic-sub"><RT>{c.subtitle}</RT></div>}
            </div>
          )}
          <div className="cp-mosaic-grid">
            {arr.flatMap((it, i) => [
              <div key={`i${i}`} className="cp-mosaic-cell">
                <Img src={it.image} aspect="1/1" dim="760×760px" className="cp-mosaic-img" />
              </div>,
              <div key={`b${i}`} className="cp-mosaic-box" style={{ background: acc }}>
                <div className="cp-mosaic-box-t" style={boxTextStyle}>{T(it.title, 'Título de la card')}</div>
                <Rich className="cp-mosaic-box-d" style={boxTextStyle}>{T(it.description, 'Texto de la card.')}</Rich>
              </div>,
            ])}
          </div>
        </div>
      )
    }
    // El resto de los modos son variantes del carrusel de cards: se adapta el contenido
    // a la forma que ese render ya sabe dibujar. Los modos que todavia no tienen mockup
    // propio caen a las cards verticales, que es el layout mas neutro.
    //
    // OJO: `slider-default-card` NO define la forma por si solo. Con el Card - Style
    // Card en Square las cards son APAISADAS: misma estructura (imagen arriba, titulo y
    // texto abajo) pero con otra proporcion y otra medida de imagen.
    // PENDIENTE: la square y la vertical se dibujan igual (imagen arriba, titulo y
    // texto abajo). Lo que cambia es la PROPORCION de la card, que el mockup todavia no
    // distingue; la medida de la imagen si sale bien, por `getSpecs`.
    return RENDERERS.commitment_carousel({
      type: CG_TO_CMT[mode] || CMT_VERTICAL,
      dim: getSpecs(getComponent('card_grid'), c)[0]?.desktop,
      title: c.title,
      subtitle: c.subtitle,
      color: tok(c.background_color),
      background_color: tok(c.background_color),
      text_color: tok(c.text_color),
      background_position: c.background_position,
      card_color: tok(c.background_card_color),
      accent: tok(c.title_card_color),
      items: items.map((it) => ({
        icon: it.icon, image: it.image, image_mobile: it.image_mobile,
        title: it.title, description: it.description, url: it.cta_url,
      })),
    }, ctx)
  },

  // Grilla de numeros: titulo centrado y una fila de estadisticas (numero grande de
  // color configurable + etiqueta + linea inferior).
  stats_grid: (c) => {
    const acc = T(c.color, ACCENT)
    const stats = list(c.stats)
    const arr = stats.length ? stats : [
      { value: '40+', label: 'Torem ipsum dolor sit amet' },
      { value: '540+', label: 'Porem ipsum dolor sit amet' },
      { value: '300+', label: 'Korem ipsum dolor sit amet' },
      { value: '25+', label: 'Jorem ipsum dolor sit amet' },
    ]
    return (
      <div className="cp-stats" style={{ '--acc': acc }}>
        {OPT(c.title) && <div className="cp-stats-title">{OPT(c.title)}</div>}
        <div className="cp-stats-row">
          {arr.map((s, i) => (
            <div key={i} className="cp-stat">
              <div className="cp-stat-v">{T(s.value, '00+')}</div>
              <div className="cp-stat-l">{T(s.label, 'Etiqueta del número')}</div>
              <div className="cp-stat-line" />
            </div>
          ))}
        </div>
      </div>
    )
  },

  // Cards con logo (sección oscura): título + subtítulo centrados y cards grandes con
  // imagen de fondo + scrim, título, lista de bullets y botón (el "logo" es parte de la
  // imagen, no un campo aparte). Fondo negro propio (páginas de marca como Pro Plan).
  logo_cards: (c) => {
    const cards = list(c.cards)
    const arr = cards.length ? cards : [
      { title: 'Ciencia aplicada a la nutrición', bullets: 'Investigación actualizada en nutrición de perros y gatos\nContenidos educativos y formación continua\nHerramientas para la toma de decisiones nutricionales', cta_label: 'Explorar recursos' },
      { title: 'Soluciones para la práctica diaria', bullets: 'Plataforma exclusiva para médicos veterinarios\nAcceso a materiales técnicos y guías clínicas\nContenidos profesionales y especializados', cta_label: 'Acceder a la plataforma' },
    ]
    return (
      <div className="cp-lcards">
        <div className="cp-lcards-head">
          <div className="cp-lcards-title">{T(c.title, 'Respaldo experto para quienes cuidan su salud')}</div>
          <Rich className="cp-lcards-sub">{T(c.subtitle, 'Purina® Pro Plan® acompaña a médicos veterinarios con herramientas, conocimiento y servicios diseñados para apoyar su práctica clínica y fortalecer cada decisión nutricional.')}</Rich>
        </div>
        <div className="cp-lcards-row">
          {arr.map((card, i) => {
            const bullets = String(card.bullets || '').split('\n').map((s) => s.trim()).filter(Boolean)
            return (
              <div key={i} className="cp-lcard">
                {card.image ? <MediaEl className="cp-lcard-img" src={card.image} /> : <div className="cp-lcard-img cp-lcard-ph"><ImageIcon size={22} /></div>}
                <div className="cp-lcard-scrim" />
                <div className="cp-lcard-body">
                  <div className="cp-lcard-bottom">
                    <div className="cp-lcard-t">{T(card.title, 'Título de la card')}</div>
                    <ul className="cp-lcard-list">
                      {(bullets.length ? bullets : ['Primer beneficio', 'Segundo beneficio', 'Tercer beneficio']).map((b, j) => <li key={j}>{b}</li>)}
                    </ul>
                    {card.cta_label && <span className="cp-lcard-cta">{card.cta_label}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  },
}

// Scroll del carrusel de la timeline: desde la flecha, encuentra el track hermano
// y lo desplaza horizontalmente (una card + gap por click).
function scrollTL(dir) {
  return (e) => {
    const root = e.currentTarget.closest('.cp-tl')
    const track = root && root.querySelector('.cp-tl-track')
    if (track) track.scrollBy({ left: dir * 342, behavior: 'smooth' })
  }
}

// Scroll generico de un carrusel: sube desde la flecha hasta `rootSel`, busca la
// fila `rowSel` adentro y la desplaza `step` px (una card + gap).
function scrollRow(rootSel, rowSel, step) {
  return (dir) => (e) => {
    const root = e.currentTarget.closest(rootSel)
    const row = root && root.querySelector(rowSel)
    if (row) row.scrollBy({ left: dir * step, behavior: 'smooth' })
  }
}
const scrollCmt = scrollRow('.cp-cmt', '.cp-cmt-row', 431)

// Scroll generico de los carruseles clasicos (marcas, blog, servicios, productos):
// desde la flecha sube al contenedor del carrusel, encuentra su fila scrolleable y
// la desplaza ~85% del ancho visible (sirve para cualquier tamano de card).
const CAROUSEL_ROOT = '.cp-brands, .cp-svc, .cp-plist'
const CAROUSEL_ROW = '.cp-brands-row, .cp-artc-row, .cp-svc-cards, .cp-plist-row'
function scrollCarousel(dir) {
  return (e) => {
    const root = e.currentTarget.closest(CAROUSEL_ROOT)
    const row = root && root.querySelector(CAROUSEL_ROW)
    if (row) row.scrollBy({ left: dir * Math.max(240, row.clientWidth * 0.85), behavior: 'smooth' })
  }
}

// Los 12 layouts de columnas comparten un solo render: cambia cuantas columnas hay y
// que ancho tiene cada una. El contenido de cada columna llega ya renderizado en
// `ctx.slots[i]`. Los anchos van en `fr` proporcionales para que el gap no desborde.
for (const def of LAYOUT_COLUMNS) {
  RENDERERS[def.key] = (c, ctx) => (
    <div
      className="cp-block cp-cols"
      style={{ gridTemplateColumns: def.slots.map((s) => `${s.width}fr`).join(' ') }}
    >
      {def.slots.map((s, i) => (
        <div key={i} className="cp-col">{ctx?.slots?.[i]}</div>
      ))}
    </div>
  )
}

export default function ComponentPreview({ componentKey, content, theme, slots, activeTab, onTab }) {
  const render = RENDERERS[componentKey]
  if (!render) return <div className="cp-unknown">Componente “{componentKey}” sin preview.</div>
  // ctx: tokens de color de la marca de la pagina (ver BRAND_THEMES en pagesDb) +
  // tema oscuro. Con `dark` (ej. Pro Plan) el componente se pinta en oscuro.
  // `slots` / `activeTab` / `onTab` solo los usan los CONTENEDORES (pestañas, columnas):
  // su contenido son otros componentes, ya renderizados por quien llama (el builder).
  // `slots` es un nodo por slot, en orden.
  const ctx = {
    brandName: theme?.name || null,
    brandPrimary: theme?.primary || null,
    brandSecondary: theme?.secondary || null,
    brandAccent: theme?.accent || null,
    dark: !!theme?.dark,
    slots: slots || null,
    activeTab: activeTab || 0,
    onTab: onTab || null,
  }
  return <div className={`cp-render${ctx.dark ? ' cp-dark' : ''}`}>{render(content || {}, ctx)}</div>
}
