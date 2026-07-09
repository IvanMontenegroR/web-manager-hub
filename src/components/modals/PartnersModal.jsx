import { useState } from 'react'
import { Users, Plus, Trash2, Check } from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import { useData } from '../../context/DataContext.jsx'
import { createPartner, updatePartner, deletePartner } from '../../lib/db'
import { COUNTRIES } from '../../lib/countries'

export default function PartnersModal({ onClose }) {
  const { partners, refresh } = useData()
  const [draft, setDraft] = useState({})
  const [nw, setNw] = useState({ name: '', color: '#888888', country: '' })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  const val = (p, k) => (draft[p.id]?.[k] ?? p[k])
  const edit = (id, k, v) => setDraft((d) => ({ ...d, [id]: { ...d[id], [k]: v } }))

  async function run(fn) {
    setBusy(true); setErr(null)
    try { await fn(); await refresh() }
    catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  const saveRow = (p) => run(async () => {
    await updatePartner(p.id, { name: val(p, 'name'), color: val(p, 'color'), country: val(p, 'country') || null })
    setDraft((d) => { const c = { ...d }; delete c[p.id]; return c })
  })

  const add = () => {
    if (!nw.name.trim()) return setErr('El nombre del partner es obligatorio.')
    run(async () => { await createPartner(nw); setNw({ name: '', color: '#888888', country: '' }) })
  }

  const CountrySelect = ({ value, onChange }) => (
    <select className="control" value={value || ''} onChange={onChange}>
      <option value="">Usa país del proyecto</option>
      {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
    </select>
  )

  const colorStyle = { width: 34, height: 28, padding: 0, border: '1px solid var(--border-strong)', borderRadius: 6, background: 'none' }

  return (
    <Modal title="Partners" icon={<Users size={18} color="var(--purina)" />} onClose={onClose} wide
      footer={<button className="btn btn-primary" onClick={onClose}>Listo</button>}>
      {err && <div className="form-error">{err}</div>}
      <p className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
        El país define el calendario de feriados del partner. Si se deja vacío (ej. Purina), la tarea
        usa los feriados del mercado del proyecto.
      </p>
      <table className="mtable">
        <thead>
          <tr><th style={{ width: 60 }}>Color</th><th>Nombre</th><th style={{ width: 180 }}>País (feriados)</th><th style={{ width: 90 }}></th></tr>
        </thead>
        <tbody>
          {partners.map((p) => {
            const dirty = !!draft[p.id]
            return (
              <tr key={p.id}>
                <td>
                  <input type="color" value={val(p, 'color')} onChange={(e) => edit(p.id, 'color', e.target.value)} style={colorStyle} />
                </td>
                <td>
                  <input className="control" value={val(p, 'name')} onChange={(e) => edit(p.id, 'name', e.target.value)} />
                </td>
                <td>
                  <CountrySelect value={val(p, 'country')} onChange={(e) => edit(p.id, 'country', e.target.value)} />
                </td>
                <td>
                  <div className="row-actions">
                    {dirty && (
                      <button className="btn btn-sm btn-primary btn-icon" title="Guardar" disabled={busy} onClick={() => saveRow(p)}>
                        <Check size={14} />
                      </button>
                    )}
                    <button className="btn btn-sm btn-danger btn-icon" title="Borrar" disabled={busy}
                      onClick={() => confirm(`Borrar partner ${p.name}? Las tareas quedaran sin partner.`) && run(() => deletePartner(p.id))}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
          <tr>
            <td>
              <input type="color" value={nw.color} onChange={(e) => setNw((n) => ({ ...n, color: e.target.value }))} style={colorStyle} />
            </td>
            <td>
              <input className="control" placeholder="Nuevo partner" value={nw.name}
                onChange={(e) => setNw((n) => ({ ...n, name: e.target.value }))} />
            </td>
            <td>
              <CountrySelect value={nw.country} onChange={(e) => setNw((n) => ({ ...n, country: e.target.value }))} />
            </td>
            <td>
              <div className="row-actions">
                <button className="btn btn-sm btn-icon" title="Agregar" disabled={busy} onClick={add}>
                  <Plus size={14} />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </Modal>
  )
}
