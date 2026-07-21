import { useState } from 'react'
import { Download, FileSpreadsheet, CheckSquare, Square } from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import { useData } from '../../context/DataContext.jsx'
import { exportSelection } from '../../lib/exportTimeline'

// Modal para elegir qué proyectos exportar a Excel. Cada proyecto va en su
// pestaña; con 2 o más se agrega una pestaña "Resumen (semanas)".
export default function ExportModal({ zoom, onClose }) {
  const { projects, enriched, partners, holidays } = useData()
  const active = projects.filter((p) => !p.archived)
  const archived = projects.filter((p) => p.archived)
  const [sel, setSel] = useState(() => new Set(active.map((p) => p.id)))
  const [busy, setBusy] = useState(false)

  const toggle = (id) =>
    setSel((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const selectedProjects = projects.filter((p) => sel.has(p.id))

  async function run() {
    if (!selectedProjects.length) return
    setBusy(true)
    try {
      await exportSelection(selectedProjects, enriched, partners, zoom === 'week', holidays)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const Row = (p) => (
    <label key={p.id} className={`hol-item${sel.has(p.id) ? '' : ' off'}`}>
      <input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} />
      <span className="hol-name">{p.name}</span>
      {p.market && <span className="hol-date">{p.market}</span>}
    </label>
  )

  const allActive = active.length > 0 && active.every((p) => sel.has(p.id))
  const toggleAllActive = () =>
    setSel((s) => {
      const n = new Set(s)
      if (allActive) active.forEach((p) => n.delete(p.id))
      else active.forEach((p) => n.add(p.id))
      return n
    })

  return (
    <Modal
      title="Exportar a Excel"
      icon={<FileSpreadsheet size={18} color="var(--purina)" />}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={run} disabled={busy || !sel.size}>
            <Download size={15} /> {busy ? 'Generando...' : `Exportar ${sel.size} proyecto${sel.size !== 1 ? 's' : ''}`}
          </button>
        </>
      }
    >
      <div className="hint" style={{ marginBottom: 10 }}>
        Cada proyecto va en su propia pestaña. Si elegís <b>2 o más</b>, se agrega una pestaña
        <b> “Resumen (semanas)”</b> con el timeline de todos (1 cuadrito = 1 semana).
      </div>

      {active.length > 0 && (
        <div className="field">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Activos</span>
            <button className="btn btn-sm" onClick={toggleAllActive} style={{ marginLeft: 'auto' }}>
              {allActive ? <CheckSquare size={13} /> : <Square size={13} />} Todos
            </button>
          </label>
          <div className="hol-list">{active.map(Row)}</div>
        </div>
      )}

      {archived.length > 0 && (
        <div className="field">
          <label>Archivados</label>
          <div className="hol-list">{archived.map(Row)}</div>
        </div>
      )}
    </Modal>
  )
}
