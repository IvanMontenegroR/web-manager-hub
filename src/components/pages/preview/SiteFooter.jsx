// Footer global del sitio (purina:footer-main). Barra oscura (#2b2b2b) presente en
// TODAS las paginas: logo + columnas de menu + copyright (Nestlé + legales).
// Config global (no contenido por pagina). Datos del markup real.
const LOGO = (import.meta.env.BASE_URL || '/') + 'purina-logo.png'

// Columnas = el menu del header en un solo nivel (con la seccion de articulos como "Consejos y
// cuidados"). Abajo, la fila legal como la del sitio viejo: Terminos y Aviso de privacidad,
// mas la Politica de cookies, que tambien se migro. Lo que no tiene pagina (Accesibilidad,
// Condiciones de venta, Politica de vinculacion, Razas, Asistente de IA) no va: un link a
// ninguna parte es peor que no tenerlo. Es lo mismo que quedo cargado en preprod.
const COLS = [
  { title: 'Alimento', links: ['Húmedos', 'Secos', 'Snacks'] },
  { title: 'Etapa de Vida', links: ['Cachorros', 'Gatitos', 'Adultos', 'Senior'] },
  { title: 'Marcas', links: ['Gatos', 'Perros'] },
  { title: 'Consejos y cuidados', links: ['Nutrición', 'Cuidado y bienestar', 'Cambios en mi mascota', 'Entrenamiento', 'Todos los artículos'] },
  { title: 'Servicios', links: ['Adopción', 'Vetline'] },
  { title: 'Sobre Purina®', links: ['Nosotros', 'Aliados', 'Profesionales', 'Contacto', 'Nuestra historia', 'Innovación', 'Purina® Cares'] },
]
const LEGAL = ['Términos y condiciones', 'Aviso de privacidad', 'Política de cookies']

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
