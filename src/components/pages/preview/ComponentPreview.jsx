import { ImageIcon, Dog, Cat, PawPrint } from 'lucide-react'

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

const T = (v, fallback) => (v && String(v).trim() ? v : fallback)
const list = (v) => (Array.isArray(v) ? v : [])
const PETCLUB_LOGO = (import.meta.env.BASE_URL || '/') + 'petclub-logo.png'

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
    const type = c.type || 'Main Hero'
    const promo = /only image|promotional/i.test(type)
    const secondary = /secondary hero|title-description/i.test(type)
    const fullbox = /full image|box content/i.test(type)
    // Main Hero, Brand Hero y Secondary Hero comparten el tratamiento "hero":
    // imagen a sangre + overlay rgba(0,0,0,.3) + texto blanco centrado + CTA.
    const heroLike = /main hero|brand hero/i.test(type) || secondary
    const cta = c.link_text
    const { h, v } = parseBannerAlign(c.banner_align, heroLike)
    // Dimension recomendada (desktop) segun el Banner Type, para el placeholder.
    const dim = /brand hero/i.test(type) ? '2088×835px'
      : secondary ? '2100×700px'
      : promo ? '2088×696px'
      : fullbox ? '1680×820px'
      : '2100×1050px'

    // Solo imagen.
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
            {c.description && <p className="cp-hero-desc">{c.description}</p>}
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
            <p className="cp-fib-desc">{T(c.description, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.')}</p>
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
          {c.description && <p className="cp-p">{c.description}</p>}
          {cta && <span className="cp-cta">{cta}</span>}
        </div>
      </div>
    )
  },

  card_grid: (c) => {
    const cards = list(c.cards)
    const icons = /icons?/i.test(c.type)
    return (
      <div className="cp-block">
        {c.title && <div className="cp-h2 cp-center">{c.title}</div>}
        {c.subtitle && <div className="cp-sub cp-center">{c.subtitle}</div>}
        <div className="cp-cards">
          {(cards.length ? cards : [{}, {}, {}]).map((card, i) => (
            <div key={i} className="cp-card">
              <Img src={card.image} h={icons ? 54 : 130} className={icons ? 'cp-icon' : ''} />
              <div className="cp-card-t">{T(card.title, 'Titulo')}</div>
              {card.subtitle && <div className="cp-card-s">{card.subtitle}</div>}
            </div>
          ))}
        </div>
      </div>
    )
  },

  text: (c) => {
    const two = /dos/i.test(c.style)
    return (
      <div className="cp-block">
        {c.title && <div className="cp-h2">{c.title}</div>}
        <div className={two ? 'cp-cols-2' : ''}>
          <p className="cp-p">{T(c.body, 'Texto del bloque...')}</p>
          {two && <p className="cp-p">&nbsp;</p>}
        </div>
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
          <p className="cp-p">{T(c.body, 'Texto...')}</p>
          {c.cta_label && <span className="cp-cta">{c.cta_label}</span>}
        </div>
      </div>
    )
  },

  big_number_grid: (c) => {
    const nums = list(c.numbers)
    return (
      <div className="cp-block cp-center">
        {c.title && <div className="cp-h2">{c.title}</div>}
        <div className="cp-nums">
          {(nums.length ? nums : [{ number: '100+' }, { number: '5M' }, { number: '12' }]).map((n, i) => (
            <div key={i} className="cp-num"><div className="cp-num-v">{T(n.number, '00')}</div><div className="cp-num-l">{n.label || ''}</div></div>
          ))}
        </div>
      </div>
    )
  },

  external_video: (c) => (
    <div className="cp-block cp-center">
      {c.title && <div className="cp-h2">{c.title}</div>}
      <div className="cp-video"><Img src={c.thumbnail} h={320} /><div className="cp-play">▶</div></div>
    </div>
  ),

  article_list: (c) => (
    <div className="cp-block">
      <div className="cp-h2">{T(c.title, 'Articulos')}</div>
      <div className="cp-badge">{c.block_type || 'Featured'}</div>
      <div className="cp-cards">
        {[{}, {}, {}].map((_, i) => (
          <div key={i} className="cp-card"><Img h={120} /><div className="cp-card-t">Articulo {i + 1}</div><div className="cp-card-s">El CMS popula los articulos</div></div>
        ))}
      </div>
    </div>
  ),

  // Featured article: imagen grande a la izquierda + tarjeta a la derecha con chip
  // de categoria (morado), titulo, bajada y autor con fecha.
  featured_articles: (c) => (
    <div className="cp-feat">
      <div className="cp-feat-img"><Img src={c.image} h={300} dim="1216×912px" /></div>
      <div className="cp-feat-card">
        {c.category && <span className="cp-feat-cat">{c.category}</span>}
        <div className="cp-feat-title">{T(c.title, 'Título del artículo destacado')}</div>
        <p className="cp-feat-desc">{T(c.description, 'Bajada del artículo con un resumen de dos o tres líneas para dar contexto al lector.')}</p>
        <div className="cp-feat-meta">
          <span className="cp-feat-avatar" />
          <span className="cp-feat-author">{T(c.author, 'Autor')}</span>
          {c.date && <><span className="cp-feat-bar">|</span><span className="cp-feat-date">{c.date}</span></>}
        </div>
      </div>
    </div>
  ),

  // Aliados y Servicios: imagen de fondo a sangre con titulo + subtitulo y flechas
  // arriba; fila de tarjetas abajo (Pet ID roja destacada; el resto frosted con
  // icono, titulo, texto y flecha).
  services_carousel: (c) => {
    const cards = list(c.cards)
    const arr = cards.length ? cards : [
      { title: 'Pet ID', text: 'Crea tu Pet ID y obtén una experiencia personalizada para ti y tu mascota.', highlighted: 'Si' },
      { title: 'Razas', text: 'Todo sobre las razas que mejor se adaptan a tu estilo de vida.' },
      { title: 'Adopción', text: 'El match ideal para compartir grandes momentos.' },
      { title: 'Tiendas', text: 'Encuentra productos Purina® cerca de ti.' },
      { title: 'Cuidadores', text: 'Una red completa de hoteles y cuidadores.' },
    ]
    return (
      <div className="cp-svc">
        {c.background ? <MediaEl className="cp-svc-bg" src={c.background} /> : <div className="cp-svc-bg cp-svc-bg-ph"><span className="cp-dim-badge">Fondo 2160×1212px</span></div>}
        <div className="cp-svc-scrim" />
        <div className="cp-svc-bottom">
          <div className="cp-svc-headrow">
            <div className="cp-svc-head">
              <div className="cp-svc-title">{T(c.title, 'Aliados y Servicios')}</div>
              <div className="cp-svc-sub">{T(c.subtitle, 'Información, consultas y herramientas para tu día a día con Purina®')}</div>
            </div>
            <div className="cp-svc-arrows">
              <span className="cp-svc-nav">‹</span><span className="cp-svc-nav">›</span>
            </div>
          </div>
          <div className="cp-svc-cards">
            {arr.map((card, i) => {
              const hl = /si|sí/i.test(card.highlighted)
              return (
                <div key={i} className={`cp-svc-card${hl ? ' hl' : ''}`}>
                  {!hl && (card.icon
                    ? <img className="cp-svc-ico-img" src={card.icon} alt="" />
                    : <span className="cp-svc-ico"><PawPrint size={22} /></span>)}
                  <div className="cp-svc-card-t">{T(card.title, 'Servicio')}</div>
                  {card.text && <div className="cp-svc-card-s">{card.text}</div>}
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
            <div className="cp-brands-sub">{T(c.subtitle, 'La variedad que buscas, con la confianza de Purina®')}</div>
          </div>
          <div className="cp-plist-arrows"><span className="cp-plist-arrow disabled">‹</span><span className="cp-plist-arrow">›</span></div>
        </div>
        <div className="cp-brands-row">
          {arr.map((card, i) => {
            const pets = card.pets || 'Perro + Gato'
            return (
              <div key={i} className="cp-brandc">
                <div className="cp-brandc-media">
                  <Img src={card.image} aspect="4/3" dim="822×616px" className="cp-brandc-img" />
                  <div className="cp-brandc-pets">
                    {/perro|perro \+ gato/i.test(pets) && <span className="cp-brandc-pet"><Dog size={15} /></span>}
                    {/gato/i.test(pets) && <span className="cp-brandc-pet"><Cat size={15} /></span>}
                  </div>
                </div>
                <div className="cp-brandc-body">
                  <div className="cp-brandc-name">{T(card.name, 'Marca Purina®')}</div>
                  {card.description && <div className="cp-brandc-desc">{card.description}</div>}
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
            <div className="cp-brands-sub">{T(c.subtitle, 'Artículos pensados para ti y tu mascota')}</div>
          </div>
          <div className="cp-plist-arrows"><span className="cp-plist-arrow disabled">‹</span><span className="cp-plist-arrow">›</span></div>
        </div>
        <div className="cp-artc-row">
          {arr.map((a, i) => (
            <div key={i} className={`cp-artc-card${i === 0 ? ' feat' : ''}`}>
              {a.image ? <MediaEl className="cp-artc-img" src={a.image} /> : <div className="cp-artc-img cp-artc-ph"><span className="cp-dim-badge">1216×912px</span></div>}
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
          <p className="cp-fb-desc">{T(c.subtitle, 'Forma parte de Purina® Pet Club y descubre beneficios, recomendaciones y contenido pensado especialmente para ustedes.')}</p>
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
          <div className="cp-testi-quote">“{T(it.quote, 'Testimonio de la persona sobre su experiencia con su mascota.')}”</div>
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

  // Cards de producto (A ingrediente / B producto / C marca). Grilla de tarjetas
  // blancas con imagen + titulo + texto; la variante C usa fondo oscuro.
  product_cards: (c) => {
    const cards = list(c.cards)
    const dark = /marca|^c/i.test(c.variant || '')
    const arr = cards.length ? cards : [{}, {}, {}]
    return (
      <div className="cp-block">
        {c.title && <div className="cp-h2">{c.title}</div>}
        <div className="cp-prodcards">
          {arr.map((card, i) => (
            <div key={i} className={`cp-prodcard${dark ? ' dark' : ''}`}>
              {card.tags && <div className="cp-prodcard-tags">{String(card.tags).split(',').map((t, j) => <span key={j}>{t.trim()}</span>)}</div>}
              <Img src={card.image} h={dark ? 130 : 150} className="cp-prodcard-img" />
              <div className="cp-prodcard-t">{T(card.title, 'Producto')}</div>
              {card.subtitle && <div className="cp-prodcard-s">{card.subtitle}</div>}
            </div>
          ))}
        </div>
      </div>
    )
  },

  // Banner IA: forma de pastilla (stadium) con imagen de fondo + titulo + buscador.
  banner_ia: (c) => (
    <div className="cp-banneria">
      {c.image ? <MediaEl className="cp-banneria-img" src={c.image} /> : <div className="cp-banneria-img cp-banneria-ph"><span className="cp-dim-badge">1552×1014px</span></div>}
      <div className="cp-banneria-scrim" />
      <div className="cp-banneria-inner">
        <div className="cp-banneria-title">{T(c.title, '¿Estás pensando en adoptar una mascota?')}</div>
        <div className="cp-banneria-search"><span className="cp-spark">✦</span>{T(c.placeholder, 'Escribe tus consultas aquí…')}</div>
      </div>
    </div>
  ),

  // Seccion con fondo: degradado/imagen a sangre + titulo/subtitulo + cards con icono.
  section: (c) => {
    const cards = list(c.cards)
    const arr = cards.length ? cards : [{ title: 'Dorem ipsum' }, { title: 'Adipiscing elit' }, { title: 'Forem ipsum' }]
    return (
      <div className="cp-section">
        {c.background
          ? <MediaEl className="cp-section-bg" src={c.background} />
          : <span className="cp-dim-badge">Fondo 2784×1994px</span>}
        <div className="cp-section-inner">
          <div className="cp-section-title">{T(c.title, 'Dorem ipsum dolor sit')}</div>
          {c.subtitle && <div className="cp-section-sub">{c.subtitle}</div>}
          <div className="cp-section-cards">
            {arr.map((card, i) => (
              <div key={i} className="cp-section-card">
                {card.icon ? <img className="cp-section-ico" src={card.icon} alt="" /> : <div className="cp-section-ico cp-section-ico-ph" />}
                <div className="cp-section-card-t">{T(card.title, 'Título')}</div>
                {card.text && <div className="cp-section-card-s">{card.text}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  },

  // Categorias populares: tarjetas horizontales con imagen de fondo + label + flecha.
  category_grid: (c) => {
    const items = list(c.items)
    const arr = items.length ? items : [{ label: 'Alimentación' }, { label: 'Comportamiento' }, { label: 'Adopción' }]
    return (
      <div className="cp-block">
        <div className="cp-h2">{T(c.title, 'Categorías populares')}</div>
        <div className="cp-cats">
          {arr.map((it, i) => (
            <div key={i} className="cp-cat">
              {it.image ? <img className="cp-cat-img" src={it.image} alt="" /> : <div className="cp-cat-img cp-cat-ph" />}
              <div className="cp-cat-scrim" />
              <span className="cp-cat-label">{T(it.label, 'Categoría')}</span>
              <span className="cp-cat-arrow">→</span>
            </div>
          ))}
        </div>
      </div>
    )
  },

  // Header menu: tarjetas del desplegable (imagen + titulo + bajada + chevron).
  header_menu: (c) => {
    const items = list(c.items)
    const arr = items.length ? items : [{ title: 'Título banner' }, { title: 'Newsletter Purina®' }]
    return (
      <div className="cp-hmenu">
        {arr.map((it, i) => (
          <div key={i} className="cp-hmenu-card">
            <Img src={it.image} aspect="4/3" dim="670×502px" className="cp-hmenu-img" />
            <div className="cp-hmenu-body">
              <div className="cp-hmenu-t">{T(it.title, 'Título')}</div>
              {it.description && <div className="cp-hmenu-s">{it.description}</div>}
            </div>
            <span className="cp-hmenu-arrow">›</span>
          </div>
        ))}
      </div>
    )
  },

  // Banner tutorial: fondo oscuro con titulo + asistente a la izquierda y un card
  // de paso (dia + imagen + texto) a la derecha.
  banner_tutorial: (c) => {
    const steps = list(c.steps)
    const step = steps[0] || { day: 'Día 1 - 3', description: 'Ofrece 1/4 de producto junto a su comida regular.' }
    return (
      <div className="cp-tut">
        {c.background ? <MediaEl className="cp-tut-bg" src={c.background} /> : <div className="cp-tut-bg cp-tut-ph"><span className="cp-dim-badge">Fondo 2784×1772px</span></div>}
        <div className="cp-tut-scrim" />
        <div className="cp-tut-inner">
          <div className="cp-tut-left">
            <div className="cp-tut-title">{T(c.title, 'Cómo introducir el producto en la dieta de tu mascota')}</div>
            <div className="cp-tut-assist"><span className="cp-spark">✦</span> El asistente de nutrición de {T(c.assistant_name, 'tu mascota')}</div>
            <div className="cp-tut-search">Escribe tu consulta…</div>
          </div>
          <div className="cp-tut-step">
            <div className="cp-tut-day">{T(step.day, 'Día 1 - 3')}</div>
            <div className="cp-tut-stepimg"><Img src={step.image} h={120} dim="624×624px" /></div>
            <div className="cp-tut-stepd">{T(step.description, 'Descripción del paso.')}</div>
          </div>
        </div>
      </div>
    )
  },

  post_image: (c) => (
    <div className="cp-block">
      <Img src={c.image} aspect="4/3" dim="1570×1177px" />
      {c.alt && <div className="cp-sub cp-center">{c.alt}</div>}
    </div>
  ),

  // Listado de productos "Más populares": tabs de filtro (activo en rojo) + flechas,
  // carrusel de card-products (fondo gris, imagen contenida, titulo debajo). Card promo
  // (Pet ID) opcional en rojo + boton "Ver todos". Sin imagen usa placeholder.
  product_list: (c) => {
    const filters = String(c.filters && c.filters.trim() ? c.filters : 'Más populares, Seco, Húmedo, Snacks')
      .split(',').map((s) => s.trim()).filter(Boolean)
    const products = list(c.products)
    const hasPromo = c.promo_title && c.promo_title.trim()
    const arr = products.length ? products : [{}, {}, {}, {}, {}]
    const moreText = c.see_more_text == null ? 'Ver todos' : c.see_more_text
    return (
      <div className="cp-plist">
        <div className="cp-plist-head">
          <div className="cp-plist-tabs">
            {filters.map((f, i) => <span key={i} className={`cp-plist-tab${i === 0 ? ' active' : ''}`}>{f}</span>)}
          </div>
          <div className="cp-plist-arrows">
            <span className="cp-plist-arrow disabled">‹</span>
            <span className="cp-plist-arrow">›</span>
          </div>
        </div>
        <div className="cp-plist-row">
          {hasPromo && (
            <div className="cp-plist-promo">
              <div className="cp-plist-promo-t">{c.promo_title}</div>
              <p className="cp-plist-promo-d">{T(c.promo_text, 'Crea tu Pet ID y obtén sugerencias de alimentos y cuidados personalizados para tu mascota.')}</p>
              <span className="cp-plist-promo-arrow">→</span>
            </div>
          )}
          {arr.map((p, i) => (
            <div key={i} className="cp-plist-card">
              {p.tag && <span className="cp-plist-tag" style={{ '--tag-bg': p.tag_color || '#895731' }}>{p.tag}</span>}
              <div className="cp-plist-imgwrap"><Img src={p.image} aspect="1/1" dim="600×600px" className="cp-plist-img" /></div>
              <div className="cp-plist-title">{T(p.title, 'Nombre del producto')}</div>
            </div>
          ))}
        </div>
        {moreText && <div className="cp-plist-more"><span className="cp-plist-more-btn">{moreText}</span></div>}
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
          <div className="cp-tl-h1">{T(c.title, 'Historia Purina®')}</div>
          <div className="cp-tl-sub">{T(c.subtitle, 'Ayudamos a los dueños de mascotas a asegurar que sus adorables perros y gatos disfruten de una vida más larga, saludable y feliz.')}</div>
        </div>
        <div className="cp-tl-track">
          {arr.map((it, i) => (
            <div key={i} className="cp-tl-item">
              <span className="cp-tl-year">{T(it.year, '—')}</span>
              {it.image
                ? <MediaEl className="cp-tl-img" src={it.image} />
                : <div className="cp-tl-img cp-tl-ph"><ImageIcon size={20} /><span className="cp-ph-dim">274×190px</span></div>}
              <div className="cp-tl-name">{T(it.title, 'Título del hito')}</div>
              <p className="cp-tl-desc">{T(it.description, 'Descripción del hito.')}</p>
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
  commitment_carousel: (c) => {
    const items = list(c.items)
    const arr = items.length ? items : [
      { title: 'Para mascotas y personas', description: 'Enriquecer la vida de las mascotas y de las personas que las aman.' },
      { title: 'Nutrición y calidad', description: 'Defender la seguridad y la nutrición de alta calidad.' },
      { title: 'Innovación', description: 'Impulsar innovaciones que ayuden a las mascotas a prosperar.' },
      { title: 'Sostenibilidad', description: 'Contribuir al cuidado del planeta.' },
    ]
    return (
      <div className="cp-brands cp-cmt">
        <div className="cp-brands-head">
          <div>
            <div className="cp-brands-title">{T(c.title, 'Compromiso Purina®')}</div>
            <div className="cp-brands-sub">{T(c.subtitle, 'La nutrición de las mascotas es clave, pero hacemos más por ellas, sus dueños y el planeta. Este es nuestro Compromiso Purina®.')}</div>
          </div>
          <div className="cp-plist-arrows">
            <span className="cp-plist-arrow" onClick={scrollCmt(-1)}>‹</span>
            <span className="cp-plist-arrow" onClick={scrollCmt(1)}>›</span>
          </div>
        </div>
        <div className="cp-cmt-row">
          {arr.map((it, i) => (
            <div key={i} className="cp-cmt-card">
              {it.image
                ? <MediaEl className="cp-cmt-img" src={it.image} />
                : <div className="cp-cmt-img cp-cmt-ph"><ImageIcon size={24} /><span className="cp-ph-dim">411×520px</span></div>}
              <div className="cp-cmt-scrim" />
              <div className="cp-cmt-ttl">{T(it.title, 'Título')}</div>
              <div className="cp-cmt-desc">{T(it.description, 'Descripción del compromiso.')}</div>
            </div>
          ))}
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

export default function ComponentPreview({ componentKey, content }) {
  const render = RENDERERS[componentKey]
  if (!render) return <div className="cp-unknown">Componente “{componentKey}” sin preview.</div>
  return <div className="cp-render">{render(content || {})}</div>
}
