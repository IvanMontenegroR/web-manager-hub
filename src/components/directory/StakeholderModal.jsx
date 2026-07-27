import { useState } from 'react'
import { Users, Trash2 } from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import { createStakeholder, updateStakeholder, deleteStakeholder } from '../../lib/directoryDb'

// Alta/edicion de una persona del directorio. `areas` = de que se encarga (marcas o
// temas libres); se escribe separado por comas. `suggestAreas` alimenta el datalist.
export default function StakeholderModal({ item, suggestAreas = [], nextSort, onClose, onSaved }) {
  const editing = !!item
  const [form, setForm] = useState({
    name: item?.name ?? '',
    role: item?.role ?? '',
    areas: (item?.areas ?? []).join(', '),
    email: item?.email ?? '',
    phone: item?.phone ?? '',
    notes: item?.notes ?? '',
  })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function save() {
    if (!form.name.trim()) return setErr('El nombre es obligatorio.')
    setBusy(true); setErr(null)
    const payload = { ...form, areas: form.areas.split(',').map((s) => s.trim()).filter(Boolean) }
    try {
      if (editing) await updateStakeholder(item.id, payload)
      else await createStakeholder(payload, nextSort ?? 0)
      await onSaved(); onClose()
    } catch (e) { setErr(e.message); setBusy(false) }
  }

  async function remove() {
    if (!confirm(`Borrar a "${item.name}"?`)) return
    setBusy(true); setErr(null)
    try { await deleteStakeholder(item.id); await onSaved(); onClose() }
    catch (e) { setErr(e.message); setBusy(false) }
  }

  return (
    <Modal
      title={editing ? 'Editar persona' : 'Nueva persona'}
      icon={<Users size={18} color="var(--purina)" />}
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
          <input className="control" value={form.name} onChange={set('name')} placeholder="Ej: Marina" />
        </div>
        <div className="field">
          <label>Rol / responsabilidad</label>
          <input className="control" value={form.role} onChange={set('role')} placeholder="Ej: Brand owner" />
        </div>
      </div>
      <div className="field">
        <label>Se encarga de <span className="lbl-muted">(marcas o temas, separados por coma)</span></label>
        <input className="control" list="dir-areas" value={form.areas} onChange={set('areas')} placeholder="Ej: Friskies, Fancy Feast, Felix" />
        <datalist id="dir-areas">{suggestAreas.map((a) => <option key={a} value={a} />)}</datalist>
      </div>
      <div className="row-2">
        <div className="field">
          <label>Email <span className="lbl-muted">(opcional)</span></label>
          <input className="control" value={form.email} onChange={set('email')} placeholder="nombre@..." />
        </div>
        <div className="field">
          <label>Telefono <span className="lbl-muted">(opcional)</span></label>
          <input className="control" value={form.phone} onChange={set('phone')} placeholder="+..." />
        </div>
      </div>
      <div className="field">
        <label>Notas <span className="lbl-muted">(opcional)</span></label>
        <textarea className="control" rows={2} value={form.notes} onChange={set('notes')} />
      </div>
    </Modal>
  )
}
