import { useState } from 'react'
import { Boxes, BookOpen, FileText, ChevronRight, LayoutTemplate, Sparkles } from 'lucide-react'
import { PLAYBOOKS } from '../data/playbooks'
import DocViewer from '../components/docs/DocViewer.jsx'

// Ecosystem 2.0 = hub de la migracion. Hoy: documentacion (playbooks del backend
// v2.0). A futuro: modulos mas especificos (creacion de paginas, componentes, etc.).
// El Kanban de tareas se mudo al modulo "Tareas".

// Modulos futuros (placeholders visuales, aun no construidos).
const FUTURE = [
  {
    icon: LayoutTemplate,
    title: 'Creacion de paginas',
    desc: 'Asistente guiado para armar component pages: elegir bloques, precargar campos y generar el checklist de publicacion.',
  },
  {
    icon: Sparkles,
    title: 'Mas modulos',
    desc: 'Herramientas especificas de la migracion v2.0 se iran sumando aca (componentes, taxonomias, QA de publicacion).',
  },
]

export default function Ecosystem() {
  const [openId, setOpenId] = useState(null)
  const doc = openId ? PLAYBOOKS.find((d) => d.id === openId) : null

  if (doc) {
    return (
      <div className="content doc-content">
        <DocViewer doc={doc} onBack={() => setOpenId(null)} />
      </div>
    )
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Ecosystem 2.0</h1>
          <div className="sub">Documentacion y modulos de la migracion</div>
        </div>
      </div>

      <div className="content">
        <section className="eco-hub-section">
          <div className="eco-hub-h">
            <BookOpen size={16} /> Documentacion
            <span className="eco-hub-sub">Playbooks del backend Purina Ecosystem v2.0</span>
          </div>
          <div className="eco-hub-grid">
            {PLAYBOOKS.map((d) => {
              const imgs = d.blocks.filter((b) => b.type === 'img').length
              const secs = d.blocks.filter((b) => b.type === 'h1').length
              return (
                <button key={d.id} className="eco-doc-card" onClick={() => setOpenId(d.id)}>
                  <div className="eco-doc-icon"><FileText size={20} /></div>
                  <div className="eco-doc-body">
                    <div className="eco-doc-tag">{d.tag}</div>
                    <h3>{d.title}</h3>
                    <p>{d.subtitle}</p>
                    <div className="eco-doc-meta">{secs} secciones · {imgs} imagenes</div>
                  </div>
                  <ChevronRight size={18} className="eco-doc-arrow" />
                </button>
              )
            })}
          </div>
        </section>

        <section className="eco-hub-section">
          <div className="eco-hub-h">
            <Boxes size={16} /> Modulos
            <span className="eco-hub-sub">En construccion</span>
          </div>
          <div className="eco-hub-grid">
            {FUTURE.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="eco-doc-card soon" aria-disabled>
                  <div className="eco-doc-icon ghost"><Icon size={20} /></div>
                  <div className="eco-doc-body">
                    <h3>{f.title}</h3>
                    <p>{f.desc}</p>
                    <span className="badge-soon">Pronto</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </>
  )
}
