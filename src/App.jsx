import { useState } from 'react'
import { LayoutGrid, CalendarDays, Timer, ClipboardList, ListChecks, Boxes, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import WebProjects from './modules/WebProjects.jsx'
import Calendar from './modules/Calendar.jsx'
import Ecosystem from './modules/Ecosystem.jsx'
import Tareas from './modules/Tareas.jsx'
import Slas from './modules/Slas.jsx'
import Placeholder from './modules/Placeholder.jsx'

const MODULES = [
  { id: 'web', label: 'Web Projects', icon: LayoutGrid, ready: true },
  { id: 'cal', label: 'Calendario', icon: CalendarDays, ready: true },
  { id: 'slas', label: 'SLAs', icon: Timer, ready: true },
  { id: 'ops', label: 'Daily Ops', icon: ClipboardList, ready: false,
    desc: 'Tracker de tickets y pedidos con owner (yo o partner), bloqueos y stakeholder.' },
  { id: 'tasks', label: 'Tareas', icon: ListChecks, ready: true,
    desc: 'Tablero Kanban de coordinacion. Incluye tareas de Ecosystem 2.0.' },
  { id: 'eco', label: 'Ecosystem 2.0', icon: Boxes, ready: true,
    desc: 'Documentacion y modulos de la migracion.' },
]

export default function App() {
  const [active, setActive] = useState('web')
  const [collapsed, setCollapsed] = useState(false)
  const mod = MODULES.find((m) => m.id === active)

  return (
    <div className={`app${collapsed ? ' nav-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">W</div>
          <div className="brand-text">
            <div className="brand-name">Web Manager Hub</div>
            <div className="brand-sub">Nestle Purina LATAM</div>
          </div>
        </div>

        <button
          className="nav-toggle"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? 'Expandir barra' : 'Colapsar barra'}
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          <span className="nav-label">Colapsar</span>
        </button>

        {MODULES.map((m) => {
          const Icon = m.icon
          return (
            <button
              key={m.id}
              className={`nav-item${active === m.id ? ' active' : ''}`}
              onClick={() => setActive(m.id)}
              title={m.label}
            >
              <Icon size={17} />
              <span className="nav-label">{m.label}</span>
              {!m.ready && <span className="badge-soon">Pronto</span>}
            </button>
          )
        })}
        <div className="sidebar-foot">Herramienta interna. Uso personal.</div>
      </aside>

      <main className="main">
        {mod.id === 'web' ? (
          <WebProjects />
        ) : mod.id === 'cal' ? (
          <Calendar />
        ) : mod.id === 'eco' ? (
          <Ecosystem />
        ) : mod.id === 'tasks' ? (
          <Tareas />
        ) : mod.id === 'slas' ? (
          <Slas />
        ) : (
          <Placeholder title={mod.label} desc={mod.desc} icon={mod.icon} />
        )}
      </main>
    </div>
  )
}
