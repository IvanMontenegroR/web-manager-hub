import { useState } from 'react'
import { FolderPlus } from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import { useData } from '../../context/DataContext.jsx'
import { createProject, updateProject } from '../../lib/db'
import { toISO } from '../../lib/dates'

const STATUSES = ['En curso', 'Pausado', 'Completado', 'Cancelado']

export default function ProjectModal({ project, onClose }) {
  const { refresh } = useData()
  const editing = !!project
  const [form, setForm] = useState({
    name: project?.name || '',
    brand: project?.brand || '',
    market: project?.market || '',
    start_date: project?.start_date || toISO(new Date()),
    status: project?.status || 'En curso',
  })
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function save() {
    if (!form.name.trim()) return setErr('El nombre es obligatorio.')
    setSaving(true)
    setErr(null)
    try {
      if (editing) await updateProject(project.id, form)
      else await createProject(form)
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
      <div className="row-2">
        <div className="field">
          <label>Marca</label>
          <input className="control" value={form.brand} onChange={set('brand')} placeholder="Dog Chow" />
        </div>
        <div className="field">
          <label>Mercado</label>
          <input className="control" value={form.market} onChange={set('market')} placeholder="MX" />
        </div>
      </div>
      <div className="row-2">
        <div className="field">
          <label>Fecha de inicio</label>
          <input type="date" className="control" value={form.start_date} onChange={set('start_date')} />
        </div>
        <div className="field">
          <label>Status</label>
          <select className="control" value={form.status} onChange={set('status')}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  )
}
