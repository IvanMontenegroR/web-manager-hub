import { useState } from 'react'
import { Boxes, BookOpen, FileText, ChevronRight, LayoutTemplate, Sparkles } from 'lucide-react'
import { PLAYBOOKS } from '../data/playbooks'
import DocViewer from '../components/docs/DocViewer.jsx'
import PagesTracker from '../components/pages/PagesTracker.jsx'
import PageBuilder from '../components/pages/PageBuilder.jsx'

// Ecosystem 2.0 = hub de la migracion. Hoy: documentacion (playbooks del backend
// v2.0) y el modulo "Creacion de paginas" (tracker de paginas + builder/export).
// El Kanban de tareas se mudo al modulo "Tareas".

// Modulos futuros (placeholders visuales, aun no construidos).
const FUTURE = [
  {
    icon: Sparkles,
    title: 'Mas modulos',
    desc: 'Herramientas especificas de la migracion v2.0 se iran sumando aca (componentes, taxonomias, QA de publicacion).',
  },
]

export default function Ecosystem() {
  const [openId, setOpenId] = useState(null)
  const [view, setView] = useState(null) // null | 'pages'
  const [builderPage, setBuilderPage] = useState(null)
  const doc = openId ? PLAYBOOKS.find((d) => d.id === openId) : null

  if (builderPage) {
    return (
      <>
        <div className="topbar">
          <div>
            <h1>Armar: {builderPage.name}</h1>
            <div className="sub">Builder de pagina — componentes y contenido</div>
          </div>
        </div>
        <PageBuilder page={builderPage} onBack={() => setBuilderPage(null)} />
      </>
    )
  }

  if (view === 'pages') {
    return (
      <>
        <div className="topbar">
          <div>
            <h1>Creacion de paginas</h1>
            <div className="sub">Paginas a armar — estado y prioridad</div>
          </div>
        </div>
        <PagesTracker onBack={() => setView(null)} onOpenBuilder={setBuilderPage} />
      </>
    )
  }

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
          </div>
          <div className="eco-hub-grid">
            <button className="eco-doc-card" onClick={() => setView('pages')}>
              <div className="eco-doc-icon"><LayoutTemplate size={20} /></div>
              <div className="eco-doc-body">
                <div className="eco-doc-tag">Builder</div>
                <h3>Creacion de paginas</h3>
                <p>Lista de paginas a armar (estado + prioridad). Proximamente: builder visual con componentes y export de matriz de contenido para editores.</p>
              </div>
              <ChevronRight size={18} className="eco-doc-arrow" />
            </button>
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
