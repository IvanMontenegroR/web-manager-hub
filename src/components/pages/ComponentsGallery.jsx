import { Fragment, useRef, useState } from 'react'
import { ArrowLeft, FileSpreadsheet } from 'lucide-react'
import { COMPONENTS, getComponent, sampleContent, optValue, optLabel, getSpecs } from '../../data/components'
import { exportPageMatrix } from '../../lib/exportPage'
import ComponentPreview from './preview/ComponentPreview.jsx'

const BANNER_DEF = getComponent('banner')
const BANNER_TYPES = (BANNER_DEF?.fields.find((f) => f.key === 'type')?.options) || []

// Componentes de la galeria. La galeria existe para validar CAMPOS y medidas con la
// agencia, asi que se quedan afuera los que no tienen nada que validar:
//   - el breadcrumb (se arma solo, sin contenido)
//   - los CONTENEDORES (pestañas, columnas): su contenido son otros componentes, sin
//     hijos se dibujan vacios y serian 13 cajas iguales sin informacion
//   - los `deprecated`: ya no se pueden agregar, mostrarlos confundiria
const GALLERY_COMPONENTS = COMPONENTS.filter(
  (def) => def.key !== 'breadcrumb' && !def.container && !def.deprecated,
)

// Solo la seccion "Componentes reusables" lleva encabezado visible. Los demas se
// agrupan por tipo (banners, carruseles...) para que queden ordenados, pero SIN titulo.
const LABELED_CATEGORY = 'Componentes reusables'

// Componentes agrupados por categoria (en el orden de aparicion del catalogo), para
// que queden juntos por tipo.
const CATEGORIES = (() => {
  const order = []
  const map = new Map()
  for (const def of GALLERY_COMPONENTS) {
    if (!map.has(def.category)) { map.set(def.category, []); order.push(def.category) }
    map.get(def.category).push(def)
  }
  return order.map((category) => ({ category, defs: map.get(category) }))
})()

// Medidas de imagen del componente, las MISMAS que bajan al Excel (`getSpecs`): ratio,
// desktop, mobile, peso maximo y formato. Se muestran en pantalla porque la galeria es
// justamente lo que se valida con la agencia y con el mercado, y hasta ahora habia que
// exportar el Excel para verlas.
//
// Salen del CONTENIDO de ejemplo, igual que en el export: un componente que resuelve su
// medida por variante (el Card Grid por modo de vista, la Imagen por Image position)
// muestra la de la variante que se esta dibujando. Sin medida declarada no se dibuja
// nada: hay componentes sin imagen y otros cuya medida todavia no conocemos.
function Specs({ def, content }) {
  const specs = getSpecs(def, content)
  if (!specs.length) return null
  return (
    <div className="cg-specs">
      {specs.map((s, i) => (
        <div key={i} className="cg-spec">
          {s.label && <span className="cg-spec-label">{s.label}</span>}
          {s.ratio && <span className="cg-spec-ratio">{s.ratio}</span>}
          {s.desktop && <span className="cg-chip"><b>Desktop</b> {s.desktop}</span>}
          {s.mobile && <span className="cg-chip"><b>Mobile</b> {s.mobile}</span>}
          {s.max && <span className="cg-chip"><b>Max</b> {s.max}</span>}
          {s.format && <span className="cg-chip"><b>Formato</b> {s.format}</span>}
        </div>
      ))}
    </div>
  )
}

// "Todos los componentes": galeria que renderiza CADA componente del catalogo con
// CONTENIDO DE EJEMPLO (al menos 2 items en las listas). Se puede EXPORTAR a Excel
// para validar campos y referencias de tamaño/peso con la agencia. El Banner se muestra
// con TODOS sus tipos en una fila (Main Hero primero y los demas a la derecha); cada
// tipo entra al export como su propia seccion (con sus campos y tamaños).
export default function ComponentsGallery({ onBack }) {
  const nodes = useRef(new Map())
  const [exporting, setExporting] = useState(false)
  const [err, setErr] = useState(null)
  const setNode = (id) => (el) => { if (el) nodes.current.set(id, el); else nodes.current.delete(id) }

  // Un banner por Banner Type. La opcion es `{ value, label }`: se GUARDA el valor de
  // maquina del CMS y se MUESTRA la etiqueta del desplegable de Drupal.
  const bannerVariants = BANNER_TYPES.map((o) => ({
    id: `banner__${optValue(o)}`, label: optLabel(o),
    content: { ...sampleContent(BANNER_DEF), type: optValue(o) },
  }))

  // Lista de componentes para el export (orden del catalogo; el banner se expande a
  // un item por tipo).
  function exportComps() {
    const out = []
    for (const def of GALLERY_COMPONENTS) {
      if (def.key === 'banner') bannerVariants.forEach((v) => out.push({ id: v.id, component_key: 'banner', content: v.content }))
      else out.push({ id: def.key, component_key: def.key, content: sampleContent(def) })
    }
    return out
  }

  async function exportExcel() {
    setExporting(true); setErr(null)
    try {
      await exportPageMatrix({ name: 'Todos los componentes', path: '' }, exportComps(), (id) => {
        const wrap = nodes.current.get(id)
        return wrap ? wrap.querySelector('.cp-render') : null
        // La galeria es un catalogo, no una pagina: no lleva metas (SEO) ni la imagen
        // de "la pagina completa" (apilar los 21 componentes no representa nada). En
        // cambio SI lleva la tira de banners: aca los banners son las VARIANTES del
        // Banner Type, y se leen mejor una al lado de la otra.
      }, { metas: false, fullPage: false, bannerStrip: true })
    } catch (e) { setErr(e.message) } finally { setExporting(false) }
  }

  return (
    <div className="content pb-content">
      <div className="pb-bar">
        <button className="btn btn-sm" onClick={onBack}><ArrowLeft size={14} /> Ecosystem 2.0</button>
        <div className="pb-title">Todos los componentes</div>
        <div className="cg-count">{GALLERY_COMPONENTS.length} componentes</div>
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={exportExcel} disabled={exporting}>
          <FileSpreadsheet size={15} /> {exporting ? 'Generando...' : 'Exportar a Excel'}
        </button>
      </div>

      {err && <div className="form-error" style={{ margin: '0 0 10px' }}>{err}</div>}

      <div className="pb-canvas preview cg-canvas">
        <div className="pb-page">
          {CATEGORIES.map(({ category, defs }) => (
            <Fragment key={category}>
              {category === LABELED_CATEGORY && <div className="cg-section">{category}</div>}
              {defs.map((def) => { const content = def.key === 'banner' ? null : sampleContent(def); return def.key === 'banner' ? (
                <Fragment key="banner">
                  <div className="cg-head">
                    <span className="cg-name">{def.name}</span>
                    <span className="cg-cat">{def.category}</span>
                    <code className="cg-key">{def.key}</code>
                  </div>
                  {/* Todos los tipos de banner en fila: Main Hero primero y el resto a la derecha. */}
                  <div className="cg-bannerrow">
                    {bannerVariants.map((v) => (
                      <div key={v.id} className="cg-banneritem">
                        <div className="cg-banner-type">{v.label}</div>
                        {/* Cada Banner Type tiene su propia medida. */}
                        <Specs def={def} content={v.content} />
                        <div className="pb-block pb-block--banner" ref={setNode(v.id)}>
                          <ComponentPreview componentKey="banner" content={v.content} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Fragment>
              ) : (
                <Fragment key={def.key}>
                  <div className="cg-head">
                    <span className="cg-name">{def.name}</span>
                    <span className="cg-cat">{def.category}</span>
                    <code className="cg-key">{def.key}</code>
                  </div>
                  <Specs def={def} content={content} />
                  <div className={`pb-block pb-block--${def.key}`} ref={setNode(def.key)}>
                    <ComponentPreview componentKey={def.key} content={content} />
                  </div>
                </Fragment>
              ) })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
