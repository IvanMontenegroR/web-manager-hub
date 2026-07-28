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
}

export default function ComponentPreview({ componentKey, content }) {
  const render = RENDERERS[componentKey]
  if (!render) return <div className="cp-unknown">Componente “{componentKey}” sin preview.</div>
  return <div className="cp-render">{render(content || {})}</div>
}
