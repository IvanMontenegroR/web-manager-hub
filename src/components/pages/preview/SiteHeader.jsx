import { useState } from 'react'
import { ChevronDown, ChevronRight, Search, ArrowRight } from 'lucide-react'
import { SITE_MENU, MENU_PROMOS, MENU_ICONS } from '../../../data/siteMenu.js'

// Logo real de Purina (public/purina-logo.png). Su marco rojo se funde con la barra.
const LOGO = (import.meta.env.BASE_URL || '/') + 'purina-logo.png'
// Logo de Pet Club: si existe public/petclub-logo.png se muestra; si no, cae al texto.
const PETCLUB = (import.meta.env.BASE_URL || '/') + 'petclub-logo.png'

// Header global del sitio (purina:header-main). Barra roja fija, presente en TODAS
// las paginas. Es config global (no contenido por pagina), por eso se muestra como
// contexto arriba del builder y del export, no como componente editable.
// El menu y sus megamenus salen de `src/data/siteMenu.js`.

function Icon({ name, size = 17 }) {
  const C = MENU_ICONS[name]
  return C ? <C size={size} strokeWidth={2} /> : null
}

// Las dos tarjetas de la derecha, iguales en los cinco megamenus.
function Promos() {
  return (
    <div className="cp-mm-promos">
      {MENU_PROMOS.map((p, i) => (
        <div key={i} className="cp-mm-promo">
          {p.image
            ? <img className="cp-mm-promo-img" src={p.image} alt="" />
            : <div className="cp-mm-promo-img cp-mm-promo-ph" />}
          <div className="cp-mm-promo-body">
            <div className="cp-mm-promo-title">{p.title}</div>
            <div className="cp-mm-promo-text">{p.text}</div>
          </div>
          <ChevronRight size={16} className="cp-mm-promo-go" />
        </div>
      ))}
    </div>
  )
}

// El panel que se abre debajo de la barra. Dos layouts, segun como se ve en el sitio.
function MegaMenu({ item }) {
  return (
    <div className="cp-mm">
      <div className="cp-mm-inner">
        <div className="cp-mm-left">
          {item.search && (
            <div className="cp-mm-search">
              <div className="cp-mm-search-label">{item.search.label}</div>
              <div className="cp-mm-search-box">
                <span className="cp-mm-search-ph">{item.search.placeholder}</span>
                <Search size={16} />
              </div>
            </div>
          )}

          {item.layout === 'boxes' ? (
            <div className="cp-mm-boxes">
              {(item.groups || []).map((g, i) => (
                <div key={i} className="cp-mm-box">
                  <div className="cp-mm-box-head">
                    <span className="cp-mm-box-icon"><Icon name={g.icon} size={18} /></span>
                    <span className="cp-mm-box-title">{g.title}</span>
                  </div>
                  <ul className="cp-mm-box-links">
                    {(g.links || []).map((l, j) => <li key={j}>{l.label}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="cp-mm-links">
              {(item.links || []).map((l, i) => (
                <span key={i} className="cp-mm-link">
                  <span className="cp-mm-link-icon"><Icon name={l.icon} /></span>
                  {l.label}
                </span>
              ))}
            </div>
          )}

          {item.more && (
            <span className="cp-mm-more">{item.more.label} <ArrowRight size={15} /></span>
          )}
        </div>
        <Promos />
      </div>
    </div>
  )
}

export default function SiteHeader() {
  const [petErr, setPetErr] = useState(false)
  // Cual megamenu esta abierto. Como en el sitio: se abre al pasar el mouse y se
  // mantiene mientras el mouse siga adentro del panel (por eso el onMouseLeave vive
  // en el header entero y no en cada item).
  const [open, setOpen] = useState(null)

  return (
    <header className={`cp-header${open ? ' cp-header--open' : ''}`} onMouseLeave={() => setOpen(null)}>
      <div className="cp-header-inner">
        <img className="cp-header-logo-img" src={LOGO} alt="Purina" />
        <nav className="cp-header-nav">
          {SITE_MENU.map((n) => (
            <span
              key={n.key}
              className={`cp-header-navitem${open === n.key ? ' on' : ''}`}
              onMouseEnter={() => setOpen(n.key)}
            >
              {n.label}
              <ChevronDown size={14} strokeWidth={2.5} className="cp-header-chev" />
            </span>
          ))}
        </nav>
        <div className="cp-header-actions">
          <span className="cp-header-search"><Search size={18} strokeWidth={2.5} /></span>
          <span className="cp-header-petclub">
            Participa de{' '}
            {petErr
              ? <b>Pet&nbsp;Club</b>
              : <img className="cp-header-petclub-img" src={PETCLUB} alt="Pet Club" onError={() => setPetErr(true)} />}
          </span>
        </div>
      </div>
      {open && <MegaMenu item={SITE_MENU.find((n) => n.key === open)} />}
    </header>
  )
}
