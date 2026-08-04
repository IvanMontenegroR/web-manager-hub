import { Fragment, useRef, useState } from 'react'
import { ArrowLeft, FileSpreadsheet } from 'lucide-react'
import { COMPONENTS, getComponent, sampleContent } from '../../data/components'
import { exportPageMatrix } from '../../lib/exportPage'
import ComponentPreview from './preview/ComponentPreview.jsx'

const BANNER_DEF = getComponent('banner')
const BANNER_TYPES = (BANNER_DEF?.fields.find((f) => f.key === 'type')?.options) || []

// Componentes de la galeria: el breadcrumb no se muestra (se arma solo, sin contenido).
const GALLERY_COMPONENTS = COMPONENTS.filter((def) => def.key !== 'breadcrumb')

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

  const bannerVariants = BANNER_TYPES.map((type) => ({
    id: `banner__${type}`, type, content: { ...sampleContent(BANNER_DEF), type },
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
      }, { metas: false }) // la galeria no lleva metas (SEO)
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
              {defs.map((def) => def.key === 'banner' ? (
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
                        <div className="cg-banner-type">{v.type}</div>
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
                  <div className={`pb-block pb-block--${def.key}`} ref={setNode(def.key)}>
                    <ComponentPreview componentKey={def.key} content={sampleContent(def)} />
                  </div>
                </Fragment>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
