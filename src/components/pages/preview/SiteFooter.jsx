// Footer global del sitio (purina:footer-main). Barra oscura (#2b2b2b) presente en
// TODAS las paginas: logo + columnas de menu + copyright (Nestlé + legales).
// Config global (no contenido por pagina). Datos del markup real.
const LOGO = (import.meta.env.BASE_URL || '/') + 'purina-logo.png'

const COLS = [
  { title: 'Comida', links: ['Húmedos', 'Secos', 'Snacks'] },
  { title: 'Etapa de Vida', links: ['Cachorros', 'Gatitos', 'Adultos', 'Senior'] },
  { title: 'Marcas', links: ['Gatos', 'Perros'] },
  { title: 'Red Purina®', links: ['Artículos destacados', 'Asistente de IA y búsqueda'] },
  { title: 'Servicios', links: ['Razas', 'Vetline', 'WhatsApp'] },
  { title: 'Sobre Purina®', links: ['Nosotros', 'Aliados', 'Profesionales', 'Prensa', 'Preguntas frecuentes', 'Contacto'] },
]
const LEGAL = ['Política de privacidad', 'Accesibilidad', 'Condiciones de venta', 'Política de vinculación', 'Política de cookies']

export default function SiteFooter() {
  return (
    <footer className="cp-footer">
      <div className="cp-footer-inner">
        <div className="cp-footer-main">
          <div className="cp-footer-logo"><img src={LOGO} alt="Purina" /></div>
          <nav className="cp-footer-menu">
            {COLS.map((col) => (
              <div key={col.title} className="cp-footer-col">
                <div className="cp-footer-col-title">{col.title}</div>
                <ul>{col.links.map((l) => <li key={l}>{l}</li>)}</ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="cp-footer-copy">
          <span className="cp-footer-nestle">Nestlé</span>
          <ul className="cp-footer-legal">{LEGAL.map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
      </div>
    </footer>
  )
}
