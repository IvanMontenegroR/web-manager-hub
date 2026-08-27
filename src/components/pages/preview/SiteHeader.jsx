import { useState } from 'react'
import { ChevronDown, ChevronRight, Search, ArrowRight } from 'lucide-react'
import { DEFAULT_MENU, menuIconFor } from '../../../data/siteMenu.js'

// Logo real de Purina (public/purina-logo.png). Su marco rojo se funde con la barra.
const LOGO = (import.meta.env.BASE_URL || '/') + 'purina-logo.png'
// Logo de Pet Club: si existe public/petclub-logo.png se muestra; si no, cae al texto.
const PETCLUB = (import.meta.env.BASE_URL || '/') + 'petclub-logo.png'

// Header global del sitio (purina:header-main). Barra roja fija, presente en TODAS las
// paginas del mercado. Es config global por mercado, no contenido por pagina: se edita
// en su propia pantalla (MenuEditor) y aca solo se dibuja.
//
// `items` viene de `site_menu`, y cada menu trae adentro sus submenus y sus tarjetas.
// Sin nada cargado cae al menu de referencia, asi el builder nunca se queda sin header.

function Icon({ name, size = 17 }) {
  const C = menuIconFor(name)
  return <C size={size} strokeWidth={2} />
}

// Las tarjetas son de CADA menu: se dibujan las del menu abierto, no unas del header.
function Promos({ promos }) {
  if (!promos.length) return null
  return (
    <div className="cp-mm-promos">
      {promos.map((p, i) => (
        <div key={i} className="cp-mm-promo">
          {p.image
            ? <img className="cp-mm-promo-img" src={p.image} alt="" />
            : <div className="cp-mm-promo-img cp-mm-promo-ph" />}
          <div className="cp-mm-promo-body">
            <div className="cp-mm-promo-title">{p.title || 'Título'}</div>
            {p.text && <div className="cp-mm-promo-text">{p.text}</div>}
          </div>
          <ChevronRight size={16} className="cp-mm-promo-go" />
        </div>
      ))}
    </div>
  )
}

// El panel que se abre debajo de la barra. Dos layouts, segun como se ve en el sitio.
function MegaMenu({ item }) {
  const groups = item.groups || []
  const links = item.links || []
  return (
    <div className="cp-mm">
      <div className="cp-mm-inner">
        <div className="cp-mm-left">
          {item.search && (item.search.label || item.search.placeholder) && (
            <div className="cp-mm-search">
              {item.search.label && <div className="cp-mm-search-label">{item.search.label}</div>}
              <div className="cp-mm-search-box">
                <span className="cp-mm-search-ph">{item.search.placeholder}</span>
                <Search size={16} />
              </div>
            </div>
          )}

          {item.layout === 'boxes' ? (
            <div className="cp-mm-boxes">
              {groups.map((g, i) => (
                <div key={i} className="cp-mm-box">
                  <div className="cp-mm-box-head">
                    <span className="cp-mm-box-icon"><Icon name={g.icon} size={18} /></span>
                    <span className="cp-mm-box-title">{g.title || 'Grupo'}</span>
                  </div>
                  <ul className="cp-mm-box-links">
                    {(g.links || []).map((l, j) => <li key={j}>{l.label}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="cp-mm-links">
              {links.map((l, i) => (
                <span key={i} className="cp-mm-link">
                  <span className="cp-mm-link-icon"><Icon name={l.icon} /></span>
                  {l.label}
                </span>
              ))}
            </div>
          )}

          {item.more?.label && (
            <span className="cp-mm-more">{item.more.label} <ArrowRight size={15} /></span>
          )}
        </div>
        <Promos promos={item.promos || []} />
      </div>
    </div>
  )
}

// `forceOpen` = indice del megamenu que se dibuja ABIERTO sin hover. Lo usa el rig de
// captura del export: html2canvas no puede pasar el mouse por arriba.
export default function SiteHeader({ items, forceOpen = null }) {
  const nav = items && items.length ? items : DEFAULT_MENU
  const [petErr, setPetErr] = useState(false)
  // Cual megamenu esta abierto. Como en el sitio: se abre al pasar el mouse y se
  // mantiene mientras el mouse siga adentro del panel (por eso el onMouseLeave vive
  // en el header entero y no en cada item).
  const [hover, setHover] = useState(null)
  const open = forceOpen != null ? forceOpen : hover
  const openItem = open == null ? null : nav[open]

  return (
    <header className={`cp-header${openItem ? ' cp-header--open' : ''}`} onMouseLeave={() => setHover(null)}>
      <div className="cp-header-inner">
        <img className="cp-header-logo-img" src={LOGO} alt="Purina" />
        <nav className="cp-header-nav">
          {nav.map((n, i) => (
            <span
              key={i}
              className={`cp-header-navitem${open === i ? ' on' : ''}`}
              onMouseEnter={() => setHover(i)}
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
      {openItem && <MegaMenu item={openItem} />}
    </header>
  )
}
