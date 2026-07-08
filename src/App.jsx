import { useState } from 'react'
import { LayoutGrid, ClipboardList, ListChecks, Boxes } from 'lucide-react'
import WebProjects from './modules/WebProjects.jsx'
import Placeholder from './modules/Placeholder.jsx'

const MODULES = [
  { id: 'web', label: 'Web Projects', icon: LayoutGrid, ready: true },
  { id: 'ops', label: 'Daily Ops', icon: ClipboardList, ready: false,
    desc: 'Tracker de tickets y pedidos con owner (yo o partner), bloqueos y stakeholder.' },
  { id: 'tasks', label: 'Tareas', icon: ListChecks, ready: false,
    desc: 'Lista unificada cross modulo con tags de mercado y proyecto, y flag Status a Helo exportable.' },
  { id: 'eco', label: 'Ecosystem 2.0', icon: Boxes, ready: false,
    desc: 'Tracker de status de implementaciones: CIAM, Conversational AI, Web Content.' },
]

export default function App() {
  const [active, setActive] = useState('web')
  const mod = MODULES.find((m) => m.id === active)

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">W</div>
          <div>
            <div className="brand-name">Web Manager Hub</div>
            <div className="brand-sub">Nestle Purina LATAM</div>
          </div>
        </div>
        {MODULES.map((m) => {
          const Icon = m.icon
          return (
            <button
              key={m.id}
              className={`nav-item${active === m.id ? ' active' : ''}`}
              onClick={() => setActive(m.id)}
            >
              <Icon size={17} />
              {m.label}
              {!m.ready && <span className="badge-soon">Pronto</span>}
            </button>
          )
        })}
        <div className="sidebar-foot">Herramienta interna. Uso personal.</div>
      </aside>

      <main className="main">
        {mod.ready ? (
          <WebProjects />
        ) : (
          <Placeholder title={mod.label} desc={mod.desc} icon={mod.icon} />
        )}
      </main>
    </div>
  )
}
