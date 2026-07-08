import { useState } from 'react'
import { Timer, Plus, Trash2, Check } from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import { useData } from '../../context/DataContext.jsx'
import { createSla, updateSla, deleteSla } from '../../lib/db'

export default function SlaModal({ onClose }) {
  const { slas, refresh } = useData()
  const [draft, setDraft] = useState({})
  const [nw, setNw] = useState({ action_name: '', sla_days: 1 })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  const val = (s, k) => (draft[s.id]?.[k] ?? s[k])
  const edit = (id, k, v) => setDraft((d) => ({ ...d, [id]: { ...d[id], [k]: v } }))

  async function run(fn) {
    setBusy(true); setErr(null)
    try { await fn(); await refresh() }
    catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  const saveRow = (s) => run(async () => {
    await updateSla(s.id, { action_name: val(s, 'action_name'), sla_days: val(s, 'sla_days') })
    setDraft((d) => { const c = { ...d }; delete c[s.id]; return c })
  })

  const add = () => {
    if (!nw.action_name.trim()) return setErr('El nombre de la accion es obligatorio.')
    if (Number(nw.sla_days) < 1) return setErr('Los dias SLA deben ser 1 o mas.')
    run(async () => { await createSla(nw); setNw({ action_name: '', sla_days: 1 }) })
  }

  return (
    <Modal title="SLAs (acciones)" icon={<Timer size={18} color="var(--purina)" />} onClose={onClose}
      footer={<button className="btn btn-primary" onClick={onClose}>Listo</button>}>
      {err && <div className="form-error">{err}</div>}
      <p className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
        Cada accion define los dias SLA que autocompletan una tarea nueva (siempre editable por tarea).
      </p>
      <table className="mtable">
        <thead>
          <tr><th>Accion</th><th style={{ width: 110 }}>Dias SLA</th><th style={{ width: 90 }}></th></tr>
        </thead>
        <tbody>
          {slas.map((s) => {
            const dirty = !!draft[s.id]
            return (
              <tr key={s.id}>
                <td>
                  <input className="control" value={val(s, 'action_name')} onChange={(e) => edit(s.id, 'action_name', e.target.value)} />
                </td>
                <td>
                  <input type="number" min="1" className="control" value={val(s, 'sla_days')} onChange={(e) => edit(s.id, 'sla_days', e.target.value)} />
                </td>
                <td>
                  <div className="row-actions">
                    {dirty && (
                      <button className="btn btn-sm btn-primary btn-icon" title="Guardar" disabled={busy} onClick={() => saveRow(s)}>
                        <Check size={14} />
                      </button>
                    )}
                    <button className="btn btn-sm btn-danger btn-icon" title="Borrar" disabled={busy}
                      onClick={() => confirm(`Borrar SLA ${s.action_name}?`) && run(() => deleteSla(s.id))}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
          <tr>
            <td>
              <input className="control" placeholder="Nueva accion" value={nw.action_name}
                onChange={(e) => setNw((n) => ({ ...n, action_name: e.target.value }))} />
            </td>
            <td>
              <input type="number" min="1" className="control" value={nw.sla_days}
                onChange={(e) => setNw((n) => ({ ...n, sla_days: e.target.value }))} />
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
