import { useState } from 'react'
import { FileStack, Trash2 } from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import { createPage, updatePage, deletePage, PAGE_STATUSES, PAGE_STATUS_LABEL } from '../../lib/pagesDb'

// Alta/edicion de una pagina del tracker de "Creacion de paginas".
export default function PageModal({ item, nextSort, onClose, onSaved }) {
  const editing = !!item
  const [form, setForm] = useState({
    name: item?.name ?? '',
    path: item?.path ?? '',
    status: item?.status ?? 'Not started',
    notes: item?.notes ?? '',
  })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function save() {
    if (!form.name.trim()) return setErr('El nombre de la pagina es obligatorio.')
    setBusy(true); setErr(null)
    try {
      if (editing) await updatePage(item.id, form)
      else await createPage(form, nextSort ?? 0)
      await onSaved(); onClose()
    } catch (e) { setErr(e.message); setBusy(false) }
  }

  async function remove() {
    if (!confirm(`Borrar la pagina "${item.name}"?`)) return
    setBusy(true); setErr(null)
    try { await deletePage(item.id); await onSaved(); onClose() }
    catch (e) { setErr(e.message); setBusy(false) }
  }

  return (
    <Modal
      title={editing ? 'Editar pagina' : 'Nueva pagina'}
      icon={<FileStack size={18} color="var(--purina)" />}
      onClose={onClose}
      footer={
        <>
          {editing && <button className="btn btn-danger" onClick={remove} disabled={busy}><Trash2 size={15} /> Borrar</button>}
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Guardando...' : 'Guardar'}</button>
        </>
      }
    >
      {err && <div className="form-error">{err}</div>}
      <div className="row-2">
        <div className="field">
          <label>Nombre</label>
          <input className="control" value={form.name} onChange={set('name')} placeholder="Ej: Homepage" />
        </div>
        <div className="field">
          <label>Path / URL <span className="lbl-muted">(opcional)</span></label>
          <input className="control" value={form.path} onChange={set('path')} placeholder="Ej: /" />
        </div>
      </div>
      <div className="field">
        <label>Estado</label>
        <select className="control" value={form.status} onChange={set('status')}>
          {PAGE_STATUSES.map((s) => <option key={s} value={s}>{PAGE_STATUS_LABEL[s]}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Notas <span className="lbl-muted">(opcional)</span></label>
        <textarea className="control" rows={2} value={form.notes} onChange={set('notes')} />
      </div>
    </Modal>
  )
}
