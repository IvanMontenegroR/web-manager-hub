import { Fragment } from 'react'
import { ArrowLeft } from 'lucide-react'
import { COMPONENTS } from '../../data/components'
import ComponentPreview from './preview/ComponentPreview.jsx'

// "Todos los componentes": galeria que renderiza CADA componente del catalogo
// (src/data/components.js) con su contenido por defecto. Se arma sola a partir de
// COMPONENTS, asi que al crear un componente nuevo aparece aca automaticamente.
// Reusa el canvas del builder en modo preview (.pb-canvas.preview + .pb-page) para
// que el full-bleed y el gutter se vean igual que en la pagina real.
export default function ComponentsGallery({ onBack }) {
  return (
    <div className="content pb-content">
      <div className="pb-bar">
        <button className="btn btn-sm" onClick={onBack}><ArrowLeft size={14} /> Ecosystem 2.0</button>
        <div className="pb-title">Todos los componentes</div>
        <div className="cg-count">{COMPONENTS.length} componentes</div>
      </div>

      <div className="pb-canvas preview cg-canvas">
        <div className="pb-page">
          {COMPONENTS.map((def) => (
            <Fragment key={def.key}>
              <div className="cg-head">
                <span className="cg-name">{def.name}</span>
                <span className="cg-cat">{def.category}</span>
                <code className="cg-key">{def.key}</code>
              </div>
              <div className={`pb-block pb-block--${def.key}`}>
                <ComponentPreview componentKey={def.key} content={{}} />
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
