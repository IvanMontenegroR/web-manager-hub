import { ImageIcon } from 'lucide-react'

// Mockups aproximados de cada componente. Se llenan con el contenido cargado, asi
// se ve la pagina armandose. La MISMA imagen renderizada se captura para el export.
// Agregar un componente = un case nuevo aca + su entrada en src/data/components.js.

// Alto FIJO (no aspect-ratio): html2canvas rasteriza aspect-ratio de forma poco
// confiable, y con alto fijo el preview y el export coinciden.
function Img({ src, h = 160, className = '' }) {
  if (src) return <img className={`cp-img ${className}`} src={src} alt="" crossOrigin="anonymous" style={{ height: h }} />
  return (
    <div className={`cp-img cp-img-ph ${className}`} style={{ height: h }}>
      <ImageIcon size={22} />
    </div>
  )
}

const T = (v, fallback) => (v && String(v).trim() ? v : fallback)
const list = (v) => (Array.isArray(v) ? v : [])

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
    // Main Hero, Brand Hero y Secondary Hero comparten el tratamiento "hero":
    // imagen a sangre + overlay rgba(0,0,0,.3) + texto blanco centrado + CTA.
    const heroLike = /main hero|brand hero/i.test(type) || secondary
    const cta = c.link_text
    const { h, v } = parseBannerAlign(c.banner_align, heroLike)

    // Solo imagen.
    if (promo) return <div className="cp-banner"><Img src={c.image} h={300} /></div>

    // Hero (Main / Brand / Secondary). Modela el markup real (.main-hero / .banner,
    // --banner-bg, .btn-primary; CTA mt-6). Secondary = ratio mas ancho/bajo (3:1) y
    // sin bordes redondeados; Main = 2:1 con esquinas redondeadas.
    if (heroLike) {
      return (
        <div className={`cp-hero${secondary ? ' cp-hero--wide' : ''}`}>
          {c.image ? <img className="cp-hero-img" src={c.image} alt="" crossOrigin="anonymous" /> : <div className="cp-hero-img cp-hero-ph" />}
          <div className="cp-hero-scrim" />
          <div className={`cp-hero-content h-${h} v-${v}`}>
            <div className="cp-hero-title">{T(c.title, secondary ? 'Secondary Hero' : 'Main Hero')}</div>
            {c.description && <p className="cp-hero-desc">{c.description}</p>}
            {cta && <span className="cp-hero-cta">{cta}</span>}
          </div>
        </div>
      )
    }

    // Banner Card / Full Image + Box Content: caja blanca sobre la imagen.
    return (
      <div className="cp-banner" style={{ textAlign: h }}>
        <Img src={c.image} h={300} />
        <div className={`cp-banner-box ${h}`}>
          <div className="cp-h1">{T(c.title, 'Titulo del banner')}</div>
          {c.description && <p className="cp-p">{c.description}</p>}
          {cta && <span className="cp-cta">{cta}</span>}
        </div>
      </div>
    )
  },

  brand_logos: (c) => {
    const size = /large/i.test(c.title_size) ? 26 : /small/i.test(c.title_size) ? 15 : 20
    const logos = list(c.logos)
    return (
      <div className="cp-block cp-center">
        <div className="cp-h2" style={{ fontSize: size }}>{T(c.title, 'Nuestras marcas')}</div>
        <div className="cp-logos">
          {(logos.length ? logos : [{}, {}, {}, {}, {}]).map((l, i) => (
            <div key={i} className="cp-logo"><Img src={l.image} h={64} /><div className="cp-logo-name">{l.name || ''}</div></div>
          ))}
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
      <div className="cp-feat-img"><Img src={c.image} h={300} /></div>
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

  // Carrusel de servicios: titulo/subtitulo sobre una imagen de fondo + tarjetas
  // (la marcada como destacada va en rojo Purina). Aliados y Servicios.
  services_carousel: (c) => {
    const cards = list(c.cards)
    const arr = cards.length ? cards : [{ title: 'Pet ID', text: 'Crea tu Pet ID y obtén una experiencia personalizada.', highlighted: 'Si' }, { title: 'Razas', text: 'Todo sobre las razas.' }, { title: 'Adopción', text: 'El match ideal.' }, { title: 'Tiendas', text: 'Encuentra productos cerca.' }]
    return (
      <div className="cp-svc">
        {c.background ? <img className="cp-svc-bg" src={c.background} alt="" crossOrigin="anonymous" /> : <div className="cp-svc-bg cp-svc-bg-ph" />}
        <div className="cp-svc-scrim" />
        <div className="cp-svc-inner">
          <div className="cp-svc-title">{T(c.title, 'Aliados y Servicios')}</div>
          {c.subtitle && <div className="cp-svc-sub">{c.subtitle}</div>}
          <div className="cp-svc-cards">
            {arr.map((card, i) => (
              <div key={i} className={`cp-svc-card${/si|sí/i.test(card.highlighted) ? ' hl' : ''}`}>
                <div className="cp-svc-ico" />
                <div className="cp-svc-card-t">{T(card.title, 'Servicio')}</div>
                {card.text && <div className="cp-svc-card-s">{card.text}</div>}
                <span className="cp-svc-arrow">→</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  },

  // Brand cards: tarjetas verticales oscuras (imagen a sangre) con titulo dorado.
  brand_cards: (c) => {
    const cards = list(c.cards)
    const arr = cards.length ? cards : [{ title: 'Perros' }, { title: 'Gatos' }, { title: 'Dietas veterinarias' }]
    return (
      <div className="cp-brandcards">
        {arr.map((card, i) => (
          <div key={i} className="cp-brandcard">
            {card.image ? <img className="cp-brandcard-img" src={card.image} alt="" crossOrigin="anonymous" /> : <div className="cp-brandcard-img cp-brandcard-ph" />}
            <div className="cp-brandcard-scrim" />
            <div className="cp-brandcard-body">
              <div className="cp-brandcard-t">{T(card.title, 'Marca')}</div>
              {card.description && <p className="cp-brandcard-d">{card.description}</p>}
              <span className="cp-brandcard-arrow">→</span>
            </div>
          </div>
        ))}
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
      {c.image ? <img className="cp-banneria-img" src={c.image} alt="" crossOrigin="anonymous" /> : <div className="cp-banneria-img cp-banneria-ph" />}
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
        {c.background && <img className="cp-section-bg" src={c.background} alt="" crossOrigin="anonymous" />}
        <div className="cp-section-inner">
          <div className="cp-section-title">{T(c.title, 'Dorem ipsum dolor sit')}</div>
          {c.subtitle && <div className="cp-section-sub">{c.subtitle}</div>}
          <div className="cp-section-cards">
            {arr.map((card, i) => (
              <div key={i} className="cp-section-card">
                {card.icon ? <img className="cp-section-ico" src={card.icon} alt="" crossOrigin="anonymous" /> : <div className="cp-section-ico cp-section-ico-ph" />}
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
              {it.image ? <img className="cp-cat-img" src={it.image} alt="" crossOrigin="anonymous" /> : <div className="cp-cat-img cp-cat-ph" />}
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
            <Img src={it.image} h={140} className="cp-hmenu-img" />
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
        {c.background ? <img className="cp-tut-bg" src={c.background} alt="" crossOrigin="anonymous" /> : <div className="cp-tut-bg cp-tut-ph" />}
        <div className="cp-tut-scrim" />
        <div className="cp-tut-inner">
          <div className="cp-tut-left">
            <div className="cp-tut-title">{T(c.title, 'Cómo introducir el producto en la dieta de tu mascota')}</div>
            <div className="cp-tut-assist"><span className="cp-spark">✦</span> El asistente de nutrición de {T(c.assistant_name, 'tu mascota')}</div>
            <div className="cp-tut-search">Escribe tu consulta…</div>
          </div>
          <div className="cp-tut-step">
            <div className="cp-tut-day">{T(step.day, 'Día 1 - 3')}</div>
            <div className="cp-tut-stepimg"><Img src={step.image} h={120} /></div>
            <div className="cp-tut-stepd">{T(step.description, 'Descripción del paso.')}</div>
          </div>
        </div>
      </div>
    )
  },

  post_image: (c) => (
    <div className="cp-block">
      <Img src={c.image} h={300} />
      {c.alt && <div className="cp-sub cp-center">{c.alt}</div>}
    </div>
  ),
}

export default function ComponentPreview({ componentKey, content }) {
  const render = RENDERERS[componentKey]
  if (!render) return <div className="cp-unknown">Componente “{componentKey}” sin preview.</div>
  return <div className="cp-render">{render(content || {})}</div>
}
