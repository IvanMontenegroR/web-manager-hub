import { useState } from 'react'
import { Boxes, Plus, X, Check, Tag } from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import {
  ECO_STATUSES, ECO_PRIORITIES, ECO_MARKETS, ECO_MARKET_LABEL, ECO_TOPICS, DEFAULT_MARKET,
  DEFAULT_DEADLINE_DAYS, createEcoTask, updateEcoTask,
} from '../../lib/ecosystemDb'
import { addDaysISO, toISO } from '../../lib/dates'

export default function EcoTaskModal({ task, topics = ECO_TOPICS, owners, allTags = [], defaultStatus, defaultMarket, nextSort, onClose, onSaved }) {
  const editing = !!task
  const [form, setForm] = useState({
    market: task?.market || defaultMarket || DEFAULT_MARKET,
    section: task?.section || '',
    topic: task?.topic || '',
    action: task?.action || '',
    owner: task?.owner || '',
    status: task?.status || defaultStatus || 'Open',
    priority: task?.priority || 'media',
    // Sin deadline propio, una tarjeta nueva arranca con 1 semana (editable).
    deadline: task ? (task.deadline || '') : addDaysISO(toISO(new Date()), DEFAULT_DEADLINE_DAYS),
    notes: task?.notes || '',
    checklist: Array.isArray(task?.checklist) ? task.checklist.map((c) => ({ ...c })) : [],
    tags: Array.isArray(task?.tags) ? [...task.tags] : [],
  })
  const [newTag, setNewTag] = useState('')
  const [newItem, setNewItem] = useState('')
  const [newDate, setNewDate] = useState('')
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const addItem = () => {
    const text = newItem.trim()
    if (!text) return
    setForm((f) => ({ ...f, checklist: [...f.checklist, { text, done: false, deadline: newDate || null }] }))
    setNewItem(''); setNewDate('')
  }
  const toggleItem = (i) =>
    setForm((f) => ({ ...f, checklist: f.checklist.map((c, j) => (j === i ? { ...c, done: !c.done } : c)) }))
  const setItemDeadline = (i, v) =>
    setForm((f) => ({ ...f, checklist: f.checklist.map((c, j) => (j === i ? { ...c, deadline: v || null } : c)) }))
  const removeItem = (i) =>
    setForm((f) => ({ ...f, checklist: f.checklist.filter((_, j) => j !== i) }))

  const addTag = (raw) => {
    const t = (raw ?? newTag).trim()
    if (!t) return
    setForm((f) => (f.tags.some((x) => x.toLowerCase() === t.toLowerCase()) ? f : { ...f, tags: [...f.tags, t] }))
    setNewTag('')
  }
  const removeTag = (t) => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }))
  const suggestions = allTags.filter((t) => !form.tags.some((x) => x.toLowerCase() === t.toLowerCase()))

  async function save() {
    if (!form.topic.trim() && !form.action.trim()) return setErr('Ponele al menos un tema o una accion.')
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
          <label>Mercado</label>
          <select className="control" value={form.market} onChange={set('market')}>
            {ECO_MARKETS.map((m) => <option key={m} value={m}>{ECO_MARKET_LABEL[m] || m}</option>)}
          </select>
          <div className="hint">General = tarea transversal, no de un mercado.</div>
        </div>
        <div className="field">
          <label>Topic</label>
          <select className="control" value={form.section} onChange={set('section')}>
            <option value="">—</option>
            {topics.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Responsable</label>
          <input className="control" list="eco-owners" value={form.owner} onChange={set('owner')} placeholder="Ivan, Diana, NBS..." />
          <datalist id="eco-owners">{owners.map((o) => <option key={o} value={o} />)}</datalist>
        </div>
      </div>

      <div className="field">
        <label>Tema</label>
        <input className="control" value={form.topic} onChange={set('topic')} placeholder="Nombre corto de la tarea" />
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
          <label>Deadline</label>
          <input type="date" className="control" value={form.deadline} onChange={set('deadline')} />
          <div className="hint">Manda sobre la prioridad en el orden. A mitad de camino se marca Follow-up.</div>
        </div>
      </div>

      <div className="field">
        <label>Accion a tomar</label>
        <textarea className="control" value={form.action} onChange={set('action')} rows={2} placeholder="Que hay que hacer" />
      </div>
      <div className="field">
        <label>Nota</label>
        <textarea className="control" value={form.notes} onChange={set('notes')} rows={3} placeholder="Situacion, contexto, definiciones, links..." />
        <div className="hint">Es lo que baja al resumen del 1:1, debajo del tema y la accion.</div>
      </div>

      <div className="field">
        <label>Tags</label>
        <div className="eco-tag-edit">
          {form.tags.map((t) => (
            <span key={t} className="eco-tag"><Tag size={11} /> {t}
              <button type="button" className="eco-tag-x" onClick={() => removeTag(t)}><X size={11} /></button>
            </span>
          ))}
          <input
            className="control eco-tag-input"
            list="eco-tags"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
            placeholder="Agregar tag y Enter"
          />
          <datalist id="eco-tags">{suggestions.map((t) => <option key={t} value={t} />)}</datalist>
        </div>
        {suggestions.length > 0 && (
          <div className="eco-tag-suggest">
            {suggestions.slice(0, 8).map((t) => (
              <button key={t} type="button" className="eco-tag-chip" onClick={() => addTag(t)}>+ {t}</button>
            ))}
          </div>
        )}
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
              <input
                type="date"
                className="control eco-check-date"
                title="Deadline del sub-item"
                value={c.deadline || ''}
                onChange={(e) => setItemDeadline(i, e.target.value)}
              />
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
            <input
              type="date"
              className="control eco-check-date"
              title="Deadline (opcional)"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
            <button type="button" className="btn btn-icon" onClick={addItem}><Plus size={15} /></button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
