import { useState } from 'react'
import { Timer, Trash2 } from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import { createPartnerSla, updatePartnerSla, deletePartnerSla } from '../../lib/db'

// Alta/edicion de una fila de SLA de partner. `categories`/`tiers` alimentan datalists.
export default function SlaItemModal({ item, prefill, partnerId, partnerName, categories, tiers, nextSort, onClose, onSaved }) {
  const editing = !!item
  const [form, setForm] = useState({
    category: item?.category ?? prefill?.category ?? '',
    activity: item?.activity ?? prefill?.activity ?? '',
    tier: item?.tier ?? prefill?.tier ?? '',
    value: item?.value ?? '',
  })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function save() {
    if (!form.activity.trim()) return setErr('La actividad es obligatoria.')
    if (!form.value.trim()) return setErr('El valor (dias o rango) es obligatorio.')
    setBusy(true); setErr(null)
    try {
      if (editing) await updatePartnerSla(item.id, { ...form, partner_id: partnerId })
      else await createPartnerSla({ ...form, partner_id: partnerId }, nextSort ?? 0)
      await onSaved(); onClose()
    } catch (e) { setErr(e.message); setBusy(false) }
  }

  async function remove() {
    if (!confirm(`Borrar "${item.activity}"?`)) return
    setBusy(true); setErr(null)
    try { await deletePartnerSla(item.id); await onSaved(); onClose() }
    catch (e) { setErr(e.message); setBusy(false) }
  }

  return (
    <Modal
      title={`${editing ? 'Editar' : 'Nueva'} fila — ${partnerName}`}
      icon={<Timer size={18} color="var(--purina)" />}
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
      <div className="field">
        <label>Categoria / grupo</label>
        <input className="control" list="sla-cats" value={form.category} onChange={set('category')} placeholder="Ej: Websites, SEO..." />
        <datalist id="sla-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
      </div>
      <div className="field">
        <label>Actividad</label>
        <input className="control" value={form.activity} onChange={set('activity')} placeholder="Ej: 1 - 3 productos" />
      </div>
      <div className="row-2">
        <div className="field">
          <label>Volumen / columna (opcional)</label>
          <input className="control" list="sla-tiers" value={form.tier} onChange={set('tier')} placeholder="Ej: 1 - 10 pages" />
          <datalist id="sla-tiers">{tiers.map((t) => <option key={t} value={t} />)}</datalist>
          <div className="hint">Vacio = valor unico. Con volumen, arma una matriz por columnas.</div>
        </div>
        <div className="field">
          <label>Valor (dias o rango)</label>
          <input className="control" value={form.value} onChange={set('value')} placeholder="Ej: 3  ·  8 - 12 days  ·  N/A" />
        </div>
      </div>
    </Modal>
  )
}
