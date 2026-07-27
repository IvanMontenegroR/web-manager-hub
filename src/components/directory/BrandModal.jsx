import { useState } from 'react'
import { Tag, Trash2, Plus, X } from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import { createBrand, updateBrand, deleteBrand, SPECIES } from '../../lib/directoryDb'

// Alta/edicion de una ficha de marca. `owners` = responsables (coma-separado).
// `links` = repetidor de {label,url}. `suggestOwners` alimenta el datalist.
export default function BrandModal({ item, suggestOwners = [], nextSort, onClose, onSaved }) {
  const editing = !!item
  const [form, setForm] = useState({
    name: item?.name ?? '',
    owners: (item?.owners ?? []).join(', '),
    species: item?.species ?? '',
    guidelines: item?.guidelines ?? '',
    notes: item?.notes ?? '',
  })
  const [links, setLinks] = useState(item?.links?.length ? item.links : [])
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setLink = (i, k, v) => setLinks((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)))
  const addLink = () => setLinks((ls) => [...ls, { label: '', url: '' }])
  const delLink = (i) => setLinks((ls) => ls.filter((_, j) => j !== i))

  async function save() {
    if (!form.name.trim()) return setErr('El nombre de la marca es obligatorio.')
    setBusy(true); setErr(null)
    const payload = {
      ...form,
      owners: form.owners.split(',').map((s) => s.trim()).filter(Boolean),
      links: links.map((l) => ({ label: l.label?.trim() || '', url: l.url?.trim() || '' })).filter((l) => l.url || l.label),
    }
    try {
      if (editing) await updateBrand(item.id, payload)
      else await createBrand(payload, nextSort ?? 0)
      await onSaved(); onClose()
    } catch (e) { setErr(e.message); setBusy(false) }
  }

  async function remove() {
    if (!confirm(`Borrar la marca "${item.name}"?`)) return
    setBusy(true); setErr(null)
    try { await deleteBrand(item.id); await onSaved(); onClose() }
    catch (e) { setErr(e.message); setBusy(false) }
  }

  return (
    <Modal
      title={editing ? 'Editar marca' : 'Nueva marca'}
      icon={<Tag size={18} color="var(--purina)" />}
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
          <label>Marca</label>
          <input className="control" value={form.name} onChange={set('name')} placeholder="Ej: Fancy Feast" />
        </div>
        <div className="field">
          <label>Especie <span className="lbl-muted">(opcional)</span></label>
          <select className="control" value={form.species} onChange={set('species')}>
            <option value="">—</option>
            {SPECIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label>Responsable(s) <span className="lbl-muted">(separados por coma)</span></label>
        <input className="control" list="dir-owners" value={form.owners} onChange={set('owners')} placeholder="Ej: Marina" />
        <datalist id="dir-owners">{suggestOwners.map((o) => <option key={o} value={o} />)}</datalist>
      </div>
      <div className="field">
        <label>Guidelines / lineamientos <span className="lbl-muted">(opcional)</span></label>
        <textarea className="control" rows={3} value={form.guidelines} onChange={set('guidelines')} placeholder="Tono, colores, do/don't, referencias de marca..." />
      </div>
      <div className="field">
        <label>Links <span className="lbl-muted">(opcional)</span></label>
        {links.map((l, i) => (
          <div className="dir-link-row" key={i}>
            <input className="control" value={l.label} onChange={(e) => setLink(i, 'label', e.target.value)} placeholder="Etiqueta (ej: Brand book)" />
            <input className="control" value={l.url} onChange={(e) => setLink(i, 'url', e.target.value)} placeholder="https://..." />
            <button className="btn btn-sm btn-icon" title="Quitar" onClick={() => delLink(i)}><X size={14} /></button>
          </div>
        ))}
        <button className="btn btn-sm" onClick={addLink} style={{ marginTop: 6 }}><Plus size={13} /> Agregar link</button>
      </div>
      <div className="field">
        <label>Notas <span className="lbl-muted">(opcional)</span></label>
        <textarea className="control" rows={2} value={form.notes} onChange={set('notes')} />
      </div>
    </Modal>
  )
}
