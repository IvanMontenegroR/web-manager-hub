import { ImageIcon, Dog, Cat, PawPrint, ChevronDown } from 'lucide-react'

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

// Icono decorativo elegido de una lista (pata / gato / perro).
function FeatureIcon({ name, size = 26 }) {
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
            : <div className="cp-bmenu-logo-ph"><ImageIcon size={16} /><span>670×502px</span></div>}
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
      : fullbox ? '2088×1044px'
      : '2100×1050px'

    // Promotional (solo imagen). Con mas de 1 slide se vuelve un slider.
    if (promo) {
      const slides = list(c.slides)
      const imgs = slides.length ? slides : (c.image ? [{ image: c.image }] : [{}])
      if (imgs.length > 1) {
        return (
          <div className="cp-promoslider">
            <div className="cp-promo-track" onScroll={syncDots}>
              {imgs.map((s, i) => (
                <div key={i} className="cp-promo-slide">
                  {s.image
                    ? <MediaEl className="cp-promo-img" src={s.image} />
                    : <div className="cp-promo-img cp-promo-ph"><span className="cp-dim-badge">{dim}</span></div>}
                </div>
              ))}
            </div>
            <span className="cp-promo-arrow cp-promo-prev" onClick={scrollSnap(-1)}>‹</span>
            <span className="cp-promo-arrow cp-promo-next" onClick={scrollSnap(1)}>›</span>
            <div className="cp-promo-dots">
              {imgs.map((_, i) => <span key={i} className={`cp-promo-dot${i === 0 ? ' on' : ''}`} onClick={goToSlide(i)} />)}
            </div>
          </div>
        )
      }
      return <div className="cp-banner"><Img src={imgs[0]?.image} aspect="3/1" dim={dim} /></div>
    }

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
              <div className="cp-svc-sub">{T(c.subtitle, 'Información, consultas y herramientas para tu día a día con Purina®')}</div>
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
          <div className="cp-plist-arrows"><span className="cp-plist-arrow" onClick={scrollCarousel(-1)}>‹</span><span className="cp-plist-arrow" onClick={scrollCarousel(1)}>›</span></div>
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
          <div className="cp-tl-h1">{T(c.title, 'Historia Purina®')}</div>
          <div className="cp-tl-sub">{T(c.subtitle, 'Ayudamos a los dueños de mascotas a asegurar que sus adorables perros y gatos disfruten de una vida más larga, saludable y feliz.')}</div>
        </div>
        <div className="cp-tl-track">
          {arr.map((it, i) => (
            <div key={i} className="cp-tl-item">
              <span className="cp-tl-year">{T(it.year, '—')}</span>
              {it.image
                ? <MediaEl className="cp-tl-img" src={it.image} />
                : <div className="cp-tl-img cp-tl-ph"><ImageIcon size={20} /><span className="cp-ph-dim">670×502px</span></div>}
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
  commitment_carousel: (c, ctx) => {
    // Si hay marca seleccionada, los titulos de las cards toman su acento (detalle).
    const titleStyle = ctx?.brandAccent ? { color: ctx.brandAccent } : undefined
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
                : <div className="cp-cmt-img cp-cmt-ph"><ImageIcon size={24} /><span className="cp-ph-dim">822×1230px</span></div>}
              <div className="cp-cmt-scrim" />
              <div className="cp-cmt-ttl" style={titleStyle}>{T(it.title, 'Título')}</div>
              <div className="cp-cmt-desc">{T(it.description, 'Descripción del compromiso.')}</div>
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
          <p className="cp-half-text">{T(c.text, 'Desde hace más de 130 años creemos que las mascotas y las personas están mejor juntas. Por eso ponemos tanto cuidado en la calidad de nuestros alimentos: porque también amamos a las mascotas.')}</p>
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
                  {it.text && <div className="cp-acc-body">{it.text}</div>}
                </details>
              ))}
            </div>
          ) : (
            <p className="cp-half-rtext">{T(c.right_text, 'Texto de la columna derecha, con el contenido que acompaña al título de la izquierda.')}</p>
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
          <div className="cp-gcards-sub">{T(c.subtitle, 'Corem ipsum dolor sit amet, consectetur adipiscing elit.')}</div>
        </div>
        <div className="cp-gcards-row">
          {arr.map((card, i) => (
            <div key={i} className="cp-gcard">
              <span className="cp-gcard-ico"><FeatureIcon name={card.icon} /></span>
              <div className="cp-gcard-t">{T(card.title, 'Título')}</div>
              <p className="cp-gcard-d">{T(card.text, 'Texto de la tarjeta.')}</p>
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
      <p className="cp-twi-body">{T(c.body, 'Borem ipsum dolor sit amet, consectetur adipiscing elit. Etiam eu turpis molestie, dictum est a, mattis tellus. Sed dignissim, metus nec fringilla accumsan, risus sem sollicitudin lacus, ut interdum tellus elit sed risus.')}</p>
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
          <div className="cp-imgfeat-sub">{T(c.subtitle, 'Vorem ipsum dolor sit amet, consectetur adipiscing elit.')}</div>
        </div>
        <Img src={c.image} aspect="16/9" dim="2160×1080px" className="cp-imgfeat-img" />
        <div className="cp-imgfeat-row">
          {arr.map((f, i) => (
            <div key={i} className="cp-imgfeat-item">
              <span className="cp-imgfeat-ico"><FeatureIcon name={f.icon} /></span>
              <div className="cp-imgfeat-t">{T(f.title, 'Título del destacado')}</div>
              <p className="cp-imgfeat-d">{T(f.text, 'Texto del destacado.')}</p>
            </div>
          ))}
        </div>
      </div>
    )
  },

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
          <div className="cp-mosaic-sub">{T(c.subtitle, 'Vorem ipsum dolor sit amet, consectetur adipiscing elit.')}</div>
        </div>
        <div className="cp-mosaic-grid">
          {arr.map((b, i) => (i % 2 === 1) ? (
            <div key={i} className="cp-mosaic-box" style={{ background: acc }}>
              <div className="cp-mosaic-box-t" style={boxTextStyle}>{T(b.title, 'Título del bloque')}</div>
              <p className="cp-mosaic-box-d" style={boxTextStyle}>{T(b.text, 'Texto del bloque de contenido.')}</p>
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
        <div className="cp-stats-title">{T(c.title, 'Forem ipsum dolor sit amet.')}</div>
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
          <p className="cp-lcards-sub">{T(c.subtitle, 'Purina® Pro Plan® acompaña a médicos veterinarios con herramientas, conocimiento y servicios diseñados para apoyar su práctica clínica y fortalecer cada decisión nutricional.')}</p>
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

// Slider del Promotional banner: desplaza el track una "pantalla" (100% del ancho).
function scrollSnap(dir) {
  return (e) => {
    const t = e.currentTarget.closest('.cp-promoslider')?.querySelector('.cp-promo-track')
    if (t) t.scrollBy({ left: dir * t.clientWidth, behavior: 'smooth' })
  }
}
// Dot: salta al slide i.
function goToSlide(i) {
  return (e) => {
    const t = e.currentTarget.closest('.cp-promoslider')?.querySelector('.cp-promo-track')
    if (t) t.scrollTo({ left: i * t.clientWidth, behavior: 'smooth' })
  }
}
// Marca el dot activo segun la posicion del scroll (sin estado de React).
function syncDots(e) {
  const t = e.currentTarget
  const i = Math.round(t.scrollLeft / t.clientWidth)
  const dots = t.parentElement?.querySelectorAll('.cp-promo-dot')
  if (dots) dots.forEach((d, j) => d.classList.toggle('on', j === i))
}

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

export default function ComponentPreview({ componentKey, content, theme }) {
  const render = RENDERERS[componentKey]
  if (!render) return <div className="cp-unknown">Componente “{componentKey}” sin preview.</div>
  // ctx: tokens de color de la marca de la pagina (ver BRAND_THEMES en pagesDb) +
  // tema oscuro. Con `dark` (ej. Pro Plan) el componente se pinta en oscuro.
  const ctx = {
    brandName: theme?.name || null,
    brandPrimary: theme?.primary || null,
    brandSecondary: theme?.secondary || null,
    brandAccent: theme?.accent || null,
    dark: !!theme?.dark,
  }
  return <div className={`cp-render${ctx.dark ? ' cp-dark' : ''}`}>{render(content || {}, ctx)}</div>
}
