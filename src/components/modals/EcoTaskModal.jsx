import { useState } from 'react'
import { Boxes, Plus, X, Check } from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import { ECO_STATUSES, ECO_PRIORITIES, createEcoTask, updateEcoTask } from '../../lib/ecosystemDb'

export default function EcoTaskModal({ task, sections, owners, defaultStatus, nextSort, onClose, onSaved }) {
  const editing = !!task
  const [form, setForm] = useState({
    section: task?.section || '',
    topic: task?.topic || '',
    issue: task?.issue || '',
    action: task?.action || '',
    owner: task?.owner || '',
    status: task?.status || defaultStatus || 'Open',
    priority: task?.priority || 'media',
    deadline: task?.deadline || '',
    notes: task?.notes || '',
    checklist: Array.isArray(task?.checklist) ? task.checklist.map((c) => ({ ...c })) : [],
  })
  const [newItem, setNewItem] = useState('')
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const addItem = () => {
    const text = newItem.trim()
    if (!text) return
    setForm((f) => ({ ...f, checklist: [...f.checklist, { text, done: false }] }))
    setNewItem('')
  }
  const toggleItem = (i) =>
    setForm((f) => ({ ...f, checklist: f.checklist.map((c, j) => (j === i ? { ...c, done: !c.done } : c)) }))
  const removeItem = (i) =>
    setForm((f) => ({ ...f, checklist: f.checklist.filter((_, j) => j !== i) }))

  async function save() {
    if (!form.issue.trim() && !form.topic.trim()) return setErr('Ponele al menos un tema o una descripcion.')
    setSaving(true)
    setErr(null)
    try {
      if (editing) await updateEcoTask(task.id, form)
      else await createEcoTask(form, nextSort ?? 0)
      await onSaved()
      onClose()
    } catch (e) {
      setErr(e.message)
      setSaving(false)
    }
  }

  const doneCount = form.checklist.filter((c) => c.done).length

  return (
    <Modal
      title={editing ? 'Editar tarjeta' : 'Nueva tarjeta'}
      icon={<Boxes size={18} color="var(--purina)" />}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear tarjeta'}
          </button>
        </>
      }
    >
      {err && <div className="form-error">{err}</div>}

      <div className="row-3">
        <div className="field">
          <label>Seccion</label>
          <input className="control" list="eco-sections" value={form.section} onChange={set('section')} placeholder="Producto, Brands..." />
          <datalist id="eco-sections">{sections.map((s) => <option key={s} value={s} />)}</datalist>
        </div>
        <div className="field">
          <label>Tema</label>
          <input className="control" value={form.topic} onChange={set('topic')} placeholder="Food type, Images..." />
        </div>
        <div className="field">
          <label>Responsable</label>
          <input className="control" list="eco-owners" value={form.owner} onChange={set('owner')} placeholder="Ivan, NBS, F5..." />
          <datalist id="eco-owners">{owners.map((o) => <option key={o} value={o} />)}</datalist>
        </div>
      </div>

      <div className="row-3">
        <div className="field">
          <label>Estado (columna)</label>
          <select className="control" value={form.status} onChange={set('status')}>
            {ECO_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Prioridad</label>
          <select className="control" value={form.priority} onChange={set('priority')}>
            {ECO_PRIORITIES.map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Deadline (opcional)</label>
          <input type="date" className="control" value={form.deadline} onChange={set('deadline')} />
          <div className="hint">El deadline manda sobre la prioridad en el orden.</div>
        </div>
      </div>

      <div className="field">
        <label>Problema / situacion</label>
        <textarea className="control" value={form.issue} onChange={set('issue')} rows={2} placeholder="Que pasa" />
      </div>
      <div className="field">
        <label>Accion a tomar</label>
        <textarea className="control" value={form.action} onChange={set('action')} rows={2} placeholder="Que hay que hacer" />
      </div>
      <div className="field">
        <label>Notas</label>
        <textarea className="control" value={form.notes} onChange={set('notes')} rows={2} placeholder="Contexto, definiciones, links..." />
      </div>

      <div className="field">
        <label>Checklist {form.checklist.length > 0 && <span className="hint" style={{ fontWeight: 400 }}>({doneCount}/{form.checklist.length})</span>}</label>
        <div className="eco-check-edit">
          {form.checklist.map((c, i) => (
            <div key={i} className="eco-check-row">
              <button type="button" className={`eco-check-box${c.done ? ' on' : ''}`} onClick={() => toggleItem(i)}>
                {c.done && <Check size={12} />}
              </button>
              <span className={`eco-check-txt${c.done ? ' done' : ''}`}>{c.text}</span>
              <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => removeItem(i)}><X size={13} /></button>
            </div>
          ))}
          <div className="eco-check-add">
            <input
              className="control"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
              placeholder="Agregar sub-tarea y Enter"
            />
            <button type="button" className="btn btn-icon" onClick={addItem}><Plus size={15} /></button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
