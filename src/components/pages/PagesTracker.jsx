import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, Plus, Database, FileStack, ChevronUp, ChevronDown, Pencil, Copy, Check, Layers,
} from 'lucide-react'
import {
  fetchPages, seedPages, setPageStatus, persistPageOrder, PAGE_STATUSES, PAGE_STATUS_LABEL, SETUP_SQL,
} from '../../lib/pagesDb'
import PageModal from './PageModal.jsx'

// Clase de color por estado (para el pill).
const STATUS_CLASS = {
  'Not started': 'ns', 'In progress': 'ip', 'On hold': 'oh', Done: 'dn',
}

function SetupBlock() {
  const [copied, setCopied] = useState(false)
  const copy = async () => { try { await navigator.clipboard.writeText(SETUP_SQL); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {} }
  return (
    <div className="dir-setup">
      <div className="dir-setup-head">
        <Database size={18} color="var(--purina)" />
        <div>
          <h3>Falta crear las tablas de paginas</h3>
          <p>Corré este SQL una vez en el editor de Supabase (proyecto Purina-Hub) y recargá.</p>
        </div>
        <button className="btn btn-sm" onClick={copy} style={{ marginLeft: 'auto' }}>
          {copied ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
        </button>
      </div>
      <pre className="dir-setup-sql">{SETUP_SQL}</pre>
    </div>
  )
}

export default function PagesTracker({ onBack, onOpenBuilder }) {
  const [rows, setRows] = useState([])
  const [state, setState] = useState('loading') // loading | ok | missing | error
  const [errMsg, setErrMsg] = useState(null)
  const [modal, setModal] = useState(null)

  async function load() {
    setState('loading')
    const { data, error, tableMissing } = await fetchPages()
    if (tableMissing) return setState('missing')
    if (error) { setErrMsg(error.message); return setState('error') }
    setRows(data); setState('ok')
  }
  useEffect(() => { load() }, [])

  const nextSort = useMemo(() => rows.reduce((m, r) => Math.max(m, r.sort_order || 0), 0) + 1, [rows])
  const counts = useMemo(() => {
    const c = Object.fromEntries(PAGE_STATUSES.map((s) => [s, 0]))
    for (const r of rows) if (c[r.status] != null) c[r.status]++
    return c
  }, [rows])

  // Reordenar (optimista): mueve la fila i en direccion dir y persiste el orden.
  async function move(i, dir) {
    const j = i + dir
    if (j < 0 || j >= rows.length) return
    const next = rows.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    setRows(next)
    try { await persistPageOrder(next) } catch (e) { setErrMsg(e.message); load() }
  }

  async function changeStatus(id, status) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)))
    try { await setPageStatus(id, status) } catch (e) { setErrMsg(e.message); load() }
  }

  if (state === 'loading') return <div className="content"><div className="center-state"><div className="spinner" /><div>Cargando...</div></div></div>
  if (state === 'missing') return <div className="content"><TrackerHead onBack={onBack} /><SetupBlock /></div>
  if (state === 'error') return <div className="content"><TrackerHead onBack={onBack} /><div className="center-state"><div style={{ color: 'var(--danger)', fontWeight: 600 }}>No se pudo cargar</div><div style={{ fontSize: 13 }}>{errMsg}</div><button className="btn" onClick={load}>Reintentar</button></div></div>

  return (
    <div className="content">
      <div className="pages-top">
        <button className="btn btn-sm" onClick={onBack}><ArrowLeft size={14} /> Ecosystem 2.0</button>
        <div className="pages-counts">
          {PAGE_STATUSES.map((s) => (
            <span key={s} className={`pg-count ${STATUS_CLASS[s]}`}>{PAGE_STATUS_LABEL[s]} <b>{counts[s]}</b></span>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setModal({})}>
          <Plus size={15} /> Nueva pagina
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="dir-empty">
          <FileStack size={26} />
          <div className="dir-empty-t">Sin paginas</div>
          <p>Cargá la Homepage para arrancar (el resto de la lista la sumás cuando la tengas), o creá a mano.</p>
          <div className="dir-empty-actions">
            <button className="btn btn-primary" onClick={async () => { await seedPages(); load() }}><Database size={15} /> Cargar Homepage</button>
            <button className="btn" onClick={() => setModal({})}><Plus size={15} /> Crear a mano</button>
          </div>
        </div>
      ) : (
        <div className="pages-list">
          {rows.map((p, i) => (
            <div key={p.id} className="page-row">
              <div className="page-reorder">
                <button className="ic-btn" disabled={i === 0} onClick={() => move(i, -1)} title="Subir"><ChevronUp size={15} /></button>
                <button className="ic-btn" disabled={i === rows.length - 1} onClick={() => move(i, 1)} title="Bajar"><ChevronDown size={15} /></button>
              </div>
              <div className="page-idx">{i + 1}</div>
              <div className="page-main" onClick={() => onOpenBuilder?.(p)} title="Abrir el builder">
                <div className="page-name">{p.name}</div>
                {p.path && <div className="page-path">{p.path}</div>}
                {p.notes && <div className="page-notes">{p.notes}</div>}
              </div>
              <button className="btn btn-sm page-build" onClick={() => onOpenBuilder?.(p)}><Layers size={13} /> Armar</button>
              <select
                className={`page-status ${STATUS_CLASS[p.status]}`}
                value={p.status}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => changeStatus(p.id, e.target.value)}
              >
                {PAGE_STATUSES.map((s) => <option key={s} value={s}>{PAGE_STATUS_LABEL[s]}</option>)}
              </select>
              <button className="ic-btn page-edit" onClick={() => setModal(p)} title="Editar"><Pencil size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <PageModal item={modal.id ? modal : undefined} nextSort={nextSort} onClose={() => setModal(null)} onSaved={load} />
      )}
    </div>
  )
}

function TrackerHead({ onBack }) {
  return (
    <div className="pages-top">
      <button className="btn btn-sm" onClick={onBack}><ArrowLeft size={14} /> Ecosystem 2.0</button>
    </div>
  )
}
