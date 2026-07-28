import { ChevronDown, Search } from 'lucide-react'

// Header global del sitio (purina:header-main). Barra roja fija, presente en TODAS
// las paginas. Es config global (no contenido por pagina), por eso se muestra como
// contexto arriba del builder y del export, no como componente editable.
// Menu de nivel 0 tomado del markup real.
const NAV = [
  { label: 'Alimento', children: true },
  { label: 'Marcas', children: true },
  { label: 'Productos', children: false },
  { label: 'Blog', children: true },
  { label: 'Servicios', children: true },
  { label: 'Conoce Purina®', children: true },
]

export default function SiteHeader() {
  return (
    <header className="cp-header">
      <div className="cp-header-inner">
        <div className="cp-header-logo">PURINA<sup>®</sup></div>
        <nav className="cp-header-nav">
          {NAV.map((n) => (
            <span key={n.label} className="cp-header-navitem">
              {n.label}{n.children && <ChevronDown size={14} strokeWidth={2.5} />}
            </span>
          ))}
        </nav>
        <div className="cp-header-actions">
          <span className="cp-header-search"><Search size={18} strokeWidth={2.5} /></span>
          <span className="cp-header-petclub">Participa de <b>Pet&nbsp;Club</b></span>
        </div>
      </div>
    </header>
  )
}
