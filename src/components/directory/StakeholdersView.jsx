import { useEffect, useMemo, useState } from 'react'
import { Users, Plus, Database, Mail, Phone, Pencil, Search } from 'lucide-react'
import { fetchStakeholders, seedStakeholders } from '../../lib/directoryDb'
import StakeholderModal from './StakeholderModal.jsx'
import SetupNotice from './SetupNotice.jsx'

// Iniciales para el avatar (1-2 letras).
function initials(name) {
  const parts = String(name || '').trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?'
}

export default function StakeholdersView({ registerNewHandler, brandNames = [] }) {
  const [rows, setRows] = useState([])
  const [state, setState] = useState('loading') // loading | ok | missing | error
  const [errMsg, setErrMsg] = useState(null)
  const [modal, setModal] = useState(null)
  const [q, setQ] = useState('')

  async function load() {
    setState('loading')
    const { data, error, tableMissing } = await fetchStakeholders()
    if (tableMissing) return setState('missing')
    if (error) { setErrMsg(error.message); return setState('error') }
    setRows(data); setState('ok')
  }
  useEffect(() => { load() }, [])

  const nextSort = useMemo(() => rows.reduce((m, r) => Math.max(m, r.sort_order || 0), 0) + 1, [rows])
  // Expone al padre el "nuevo" para el boton de la topbar.
  useEffect(() => { registerNewHandler?.(() => () => setModal({})) }, [registerNewHandler, nextSort])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((r) =>
      [r.name, r.role, ...(r.areas || [])].some((x) => String(x || '').toLowerCase().includes(s)))
  }, [rows, q])

  if (state === 'loading') return <div className="center-state"><div className="spinner" /><div>Cargando...</div></div>
  if (state === 'missing') return <SetupNotice />
  if (state === 'error') return <div className="center-state"><div style={{ color: 'var(--danger)', fontWeight: 600 }}>No se pudo cargar</div><div style={{ fontSize: 13 }}>{errMsg}</div><button className="btn" onClick={load}>Reintentar</button></div>

  return (
    <div className="dir-panel">
      {rows.length === 0 ? (
        <div className="dir-empty">
          <Users size={26} />
          <div className="dir-empty-t">Directorio vacío</div>
          <p>Cargá los stakeholders iniciales (Marina, Dani Camacho, Luciana Pellegrino) o creá a mano.</p>
          <div className="dir-empty-actions">
            <button className="btn btn-primary" onClick={async () => { await seedStakeholders(); load() }}>
              <Database size={15} /> Cargar iniciales
            </button>
            <button className="btn" onClick={() => setModal({})}><Plus size={15} /> Crear a mano</button>
          </div>
        </div>
      ) : (
        <>
          <div className="dir-toolbar">
            <div className="dir-search">
              <Search size={14} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar persona, rol o marca..." />
            </div>
            <span className="dir-count">{filtered.length} / {rows.length}</span>
          </div>
          <div className="dir-grid people">
            {filtered.map((s) => (
              <div key={s.id} className="person-card" onClick={() => setModal(s)}>
                <div className="person-top">
                  <div className="person-avatar">{initials(s.name)}</div>
                  <div className="person-id">
                    <div className="person-name">{s.name}</div>
                    {s.role && <div className="person-role">{s.role}</div>}
                  </div>
                  <Pencil size={13} className="person-edit" />
                </div>
                {(s.areas?.length > 0) && (
                  <div className="person-areas">
                    {s.areas.map((a) => (
                      <span key={a} className={`dir-chip${brandNames.includes(a) ? ' brand' : ''}`}>{a}</span>
                    ))}
                  </div>
                )}
                {(s.email || s.phone) && (
                  <div className="person-contact">
                    {s.email && <a href={`mailto:${s.email}`} onClick={(e) => e.stopPropagation()}><Mail size={12} /> {s.email}</a>}
                    {s.phone && <span><Phone size={12} /> {s.phone}</span>}
                  </div>
                )}
                {s.notes && <div className="person-notes">{s.notes}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {modal && (
        <StakeholderModal
          item={modal.id ? modal : undefined}
          suggestAreas={brandNames}
          nextSort={nextSort}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
