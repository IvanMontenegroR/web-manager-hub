import { Fragment, useMemo, useRef, useState } from 'react'
import { ArrowLeft, FileSpreadsheet } from 'lucide-react'
import { COMPONENTS, getComponent, sampleContent } from '../../data/components'
import { exportPageMatrix } from '../../lib/exportPage'
import ComponentPreview from './preview/ComponentPreview.jsx'

// Tipos de banner (para el dropdown de la galeria). Main Hero primero.
const BANNER_TYPES = (getComponent('banner')?.fields.find((f) => f.key === 'type')?.options) || []

// "Todos los componentes": galeria que renderiza CADA componente del catalogo con
// CONTENIDO DE EJEMPLO (al menos 2 items en las listas). Se puede EXPORTAR a Excel
// para validar campos y referencias de tamaño/peso con la agencia. El Banner es 1 solo
// con un dropdown para elegir el tipo (Main Hero por defecto): asi no se muestran todos
// los tipos a la vez, y el mockup + los campos + el export se actualizan al tipo elegido.
export default function ComponentsGallery({ onBack }) {
  const nodes = useRef(new Map())
  const [exporting, setExporting] = useState(false)
  const [err, setErr] = useState(null)
  const [bannerType, setBannerType] = useState(BANNER_TYPES[0] || 'Main Hero')

  const items = useMemo(
    () => COMPONENTS.map((def) => ({
      id: def.key,
      def,
      content: def.key === 'banner' ? { ...sampleContent(def), type: bannerType } : sampleContent(def),
    })),
    [bannerType],
  )

  async function exportExcel() {
    setExporting(true); setErr(null)
    try {
      const comps = items.map((it) => ({ id: it.id, component_key: it.def.key, content: it.content }))
      await exportPageMatrix({ name: 'Todos los componentes', path: '' }, comps, (id) => {
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
                {def.key === 'banner' && (
                  <select className="cg-bannertype" value={bannerType} onChange={(e) => setBannerType(e.target.value)}>
                    {BANNER_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}
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
