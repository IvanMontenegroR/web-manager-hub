import { useState } from 'react'
import { CalendarOff, Plus, Trash2 } from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import { useData } from '../../context/DataContext.jsx'
import { createHoliday, deleteHoliday } from '../../lib/db'
import { partnerName, partnerColor } from '../../lib/colors'
import { fmtLargo, toISO } from '../../lib/dates'

export default function HolidaysModal({ onClose }) {
  const { holidays, partners, refresh } = useData()
  const [nw, setNw] = useState({ partner_id: '', date: toISO(new Date()), name: '' })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  async function run(fn) {
    setBusy(true); setErr(null)
    try { await fn(); await refresh() }
    catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  const add = () => {
    if (!nw.partner_id) return setErr('Elegi el partner del feriado.')
    if (!nw.date) return setErr('La fecha es obligatoria.')
    run(async () => {
      await createHoliday(nw)
      setNw((n) => ({ ...n, name: '' }))
    })
  }

  // Ordenados por partner y luego fecha.
  const sorted = [...holidays].sort((a, b) => {
    const pa = partnerName(partners, a.partner_id)
    const pb = partnerName(partners, b.partner_id)
    if (pa !== pb) return pa.localeCompare(pb)
    return a.date.localeCompare(b.date)
  })

  return (
    <Modal
      title="Feriados por partner"
      icon={<CalendarOff size={18} color="var(--purina)" />}
      onClose={onClose}
      wide
      footer={<button className="btn btn-primary" onClick={onClose}>Listo</button>}
    >
      {err && <div className="form-error">{err}</div>}
      <p className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
        Los feriados de un partner no cuentan como dias habiles: se excluyen del calculo de fin
        planificado, de los retrasos y de los solapamientos de ese partner (igual que los findes).
      </p>
      <table className="mtable">
        <thead>
          <tr>
            <th style={{ width: 160 }}>Partner</th>
            <th style={{ width: 150 }}>Fecha</th>
            <th>Nombre (opcional)</th>
            <th style={{ width: 60 }}></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <select className="control" value={nw.partner_id}
                onChange={(e) => setNw((n) => ({ ...n, partner_id: e.target.value }))}>
                <option value="" disabled>Elegir...</option>
                {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </td>
            <td>
              <input type="date" className="control" value={nw.date}
                onChange={(e) => setNw((n) => ({ ...n, date: e.target.value }))} />
            </td>
            <td>
              <input className="control" placeholder="Ej: Independencia" value={nw.name}
                onChange={(e) => setNw((n) => ({ ...n, name: e.target.value }))} />
            </td>
            <td>
              <div className="row-actions">
                <button className="btn btn-sm btn-icon" title="Agregar feriado" disabled={busy} onClick={add}>
                  <Plus size={14} />
                </button>
              </div>
            </td>
          </tr>
          {sorted.length === 0 ? (
            <tr><td colSpan={4} className="hint" style={{ textAlign: 'center', padding: 16 }}>Sin feriados cargados.</td></tr>
          ) : (
            sorted.map((h) => (
              <tr key={h.id}>
                <td>
                  <span style={{
                    display: 'inline-block', width: 10, height: 10, borderRadius: 3,
                    marginRight: 6, verticalAlign: 'middle',
                    background: partnerColor(partners, h.partner_id),
                  }} />
                  {partnerName(partners, h.partner_id)}
                </td>
                <td>{fmtLargo(h.date)}</td>
                <td>{h.name || <span className="hint">—</span>}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn btn-sm btn-danger btn-icon" title="Borrar" disabled={busy}
                      onClick={() => confirm(`Borrar feriado ${fmtLargo(h.date)}?`) && run(() => deleteHoliday(h.id))}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </Modal>
  )
}
