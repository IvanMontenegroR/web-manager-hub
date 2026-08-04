import { Fragment, useMemo, useRef, useState } from 'react'
import { ArrowLeft, FileSpreadsheet } from 'lucide-react'
import { COMPONENTS, sampleContent } from '../../data/components'
import { exportPageMatrix } from '../../lib/exportPage'
import ComponentPreview from './preview/ComponentPreview.jsx'

// "Todos los componentes": galeria que renderiza CADA componente del catalogo
// (src/data/components.js) con CONTENIDO DE EJEMPLO (al menos 2 items en las listas:
// productos, marcas, slides...). Sirve de referencia y se puede EXPORTAR a Excel para
// validar con la agencia si los campos y las referencias de tamaño/peso estan bien.
// Se arma sola a partir de COMPONENTS, asi que un componente nuevo aparece solo.
export default function ComponentsGallery({ onBack }) {
  const nodes = useRef(new Map())
  const [exporting, setExporting] = useState(false)
  const [err, setErr] = useState(null)
  // Contenido de ejemplo memoizado (mismo para el mockup y para el export).
  const items = useMemo(
    () => COMPONENTS.map((def) => ({ id: def.key, def, content: sampleContent(def) })),
    [],
  )

  async function exportExcel() {
    setExporting(true); setErr(null)
    try {
      const comps = items.map((it) => ({ id: it.id, component_key: it.def.key, content: it.content }))
      await exportPageMatrix({ name: 'Todos los componentes', path: '' }, comps, (id) => {
        const wrap = nodes.current.get(id)
        return wrap ? wrap.querySelector('.cp-render') : null
      })
    } catch (e) { setErr(e.message) } finally { setExporting(false) }
  }

  return (
    <div className="content pb-content">
      <div className="pb-bar">
        <button className="btn btn-sm" onClick={onBack}><ArrowLeft size={14} /> Ecosystem 2.0</button>
        <div className="pb-title">Todos los componentes</div>
        <div className="cg-count">{COMPONENTS.length} componentes</div>
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={exportExcel} disabled={exporting}>
          <FileSpreadsheet size={15} /> {exporting ? 'Generando...' : 'Exportar a Excel'}
        </button>
      </div>

      {err && <div className="form-error" style={{ margin: '0 0 10px' }}>{err}</div>}

      <div className="pb-canvas preview cg-canvas">
        <div className="pb-page">
          {items.map(({ id, def, content }) => (
            <Fragment key={id}>
              <div className="cg-head">
                <span className="cg-name">{def.name}</span>
                <span className="cg-cat">{def.category}</span>
                <code className="cg-key">{def.key}</code>
              </div>
              <div
                className={`pb-block pb-block--${def.key}`}
                ref={(el) => { if (el) nodes.current.set(id, el); else nodes.current.delete(id) }}
              >
                <ComponentPreview componentKey={def.key} content={content} />
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
