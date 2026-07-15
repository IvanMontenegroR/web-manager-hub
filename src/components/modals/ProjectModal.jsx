import { useState } from 'react'
import { FolderPlus, Plus, Trash2 } from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import { useData } from '../../context/DataContext.jsx'
import { createProject, updateProject, replaceProjectLaunches } from '../../lib/db'
import { toISO } from '../../lib/dates'
import { COUNTRIES } from '../../lib/countries'

const STATUSES = ['En curso', 'Pausado', 'Completado', 'Cancelado']
const PRECISIONS = [
  { v: 'day', t: 'Fecha exacta' },
  { v: 'month', t: 'Solo mes' },
  { v: 'tbd', t: 'Sin fecha (TBD)' },
]

export default function ProjectModal({ project, onClose }) {
  const { refresh, launchesByProject } = useData()
  const editing = !!project
  const [form, setForm] = useState({
    name: project?.name || '',
    brand: project?.brand || '',
    market: project?.market || '',
    start_date: project?.start_date || toISO(new Date()),
    status: project?.status || 'En curso',
  })
  const [launches, setLaunches] = useState(
    editing
      ? (launchesByProject.get(project.id) || []).map((l) => ({
          market: l.market || '',
          launch_date: l.launch_date || '',
          precision: l.precision || 'day',
        }))
      : []
  )
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const addLaunch = () =>
    setLaunches((ls) => [...ls, { market: form.market || '', launch_date: '', precision: 'day' }])
  const setLaunch = (i, k, v) =>
    setLaunches((ls) => ls.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)))
  const removeLaunch = (i) => setLaunches((ls) => ls.filter((_, idx) => idx !== i))

  async function save() {
    if (!form.name.trim()) return setErr('El nombre es obligatorio.')
    for (const l of launches) {
      if (!l.market) return setErr('Cada lanzamiento necesita un mercado.')
      if (l.precision !== 'tbd' && !l.launch_date) return setErr('Falta la fecha/mes de un lanzamiento (o marcalo TBD).')
    }
    setSaving(true)
    setErr(null)
    try {
      const proj = editing ? await updateProject(project.id, form) : await createProject(form)
      await replaceProjectLaunches(proj.id, launches)
      await refresh()
      onClose()
    } catch (e) {
      setErr(e.message)
      setSaving(false)
    }
  }

  return (
    <Modal
      title={editing ? 'Editar proyecto' : 'Nuevo proyecto'}
      icon={<FolderPlus size={18} color="var(--purina)" />}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear proyecto'}
          </button>
        </>
      }
    >
      {err && <div className="form-error">{err}</div>}
      <div className="field req">
        <label>Nombre</label>
        <input className="control" value={form.name} onChange={set('name')} placeholder="Landing Dog Chow" autoFocus />
      </div>
      <div className="row-3">
        <div className="field">
          <label>Marca</label>
          <input className="control" value={form.brand} onChange={set('brand')} placeholder="Dog Chow" />
        </div>
        <div className="field">
          <label>Mercado base</label>
          <input className="control" value={form.market} onChange={set('market')} placeholder="MX" />
          <div className="hint">Calendario de trabajo (feriados de Purina).</div>
        </div>
        <div className="field">
          <label>Status</label>
          <select className="control" value={form.status} onChange={set('status')}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="row-2">
        <div className="field">
          <label>Fecha de inicio</label>
          <input type="date" className="control" value={form.start_date} onChange={set('start_date')} />
        </div>
        <div className="field" />
      </div>

      <div className="field">
        <label>Lanzamientos por mercado</label>
        <div className="hint" style={{ marginBottom: 6 }}>
          Fecha objetivo en que cada mercado debe salir al aire. Un proyecto regional tiene varios;
          podés cargar solo el mes y refinar después.
        </div>
        <div className="hol-list">
          {launches.map((l, i) => (
            <div key={i} className="launch-row">
              <select className="control" value={l.market} onChange={(e) => setLaunch(i, 'market', e.target.value)}>
                <option value="" disabled>Mercado...</option>
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
              </select>
              <select className="control" value={l.precision} onChange={(e) => setLaunch(i, 'precision', e.target.value)}>
                {PRECISIONS.map((p) => <option key={p.v} value={p.v}>{p.t}</option>)}
              </select>
              {l.precision === 'day' && (
                <input type="date" className="control" value={l.launch_date || ''} onChange={(e) => setLaunch(i, 'launch_date', e.target.value)} />
              )}
              {l.precision === 'month' && (
                <input type="month" className="control" value={(l.launch_date || '').slice(0, 7)}
                  onChange={(e) => setLaunch(i, 'launch_date', e.target.value ? e.target.value + '-01' : '')} />
              )}
              {l.precision === 'tbd' && <div className="control" style={{ opacity: 0.5 }}>Sin fecha</div>}
              <button className="btn btn-sm btn-danger btn-icon" title="Quitar" onClick={() => removeLaunch(i)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={addLaunch}>
          <Plus size={14} /> Agregar mercado
        </button>
      </div>
    </Modal>
  )
}
