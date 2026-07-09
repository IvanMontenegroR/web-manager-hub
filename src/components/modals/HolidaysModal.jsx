import { useState } from 'react'
import { CalendarOff, Plus, Trash2 } from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import { useData } from '../../context/DataContext.jsx'
import { createHoliday, deleteHoliday } from '../../lib/db'
import { COUNTRIES, countryName } from '../../lib/countries'
import { fmtLargo, toISO } from '../../lib/dates'

export default function HolidaysModal({ onClose }) {
  const { holidays, refresh } = useData()
  const [nw, setNw] = useState({ country: '', date: toISO(new Date()), name: '' })
  const [filter, setFilter] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  async function run(fn) {
    setBusy(true); setErr(null)
    try { await fn(); await refresh() }
    catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  const add = () => {
    if (!nw.country) return setErr('Elegi el país del feriado.')
    if (!nw.date) return setErr('La fecha es obligatoria.')
    run(async () => { await createHoliday(nw); setNw((n) => ({ ...n, name: '' })) })
  }

  const sorted = [...holidays]
    .filter((h) => !filter || h.country === filter)
    .sort((a, b) => (a.country !== b.country ? a.country.localeCompare(b.country) : a.date.localeCompare(b.date)))

  return (
    <Modal
      title="Feriados por país"
      icon={<CalendarOff size={18} color="var(--purina)" />}
      onClose={onClose}
      wide
      footer={<button className="btn btn-primary" onClick={onClose}>Listo</button>}
    >
      {err && <div className="form-error">{err}</div>}
      <p className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
        Los feriados de un país no cuentan como días hábiles para las tareas de ese calendario
        (el país del partner responsable, o el mercado del proyecto para Purina). Datos 2026 best-effort: revisá y ajustá.
      </p>
      <div style={{ marginBottom: 10, maxWidth: 260 }}>
        <select className="control" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Todos los países ({holidays.length})</option>
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </div>
      <table className="mtable">
        <thead>
          <tr>
            <th style={{ width: 190 }}>País</th>
            <th style={{ width: 150 }}>Fecha</th>
            <th>Nombre</th>
            <th style={{ width: 60 }}></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <select className="control" value={nw.country}
                onChange={(e) => setNw((n) => ({ ...n, country: e.target.value }))}>
                <option value="" disabled>Elegir país...</option>
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </td>
            <td>
              <input type="date" className="control" value={nw.date}
                onChange={(e) => setNw((n) => ({ ...n, date: e.target.value }))} />
            </td>
            <td>
              <input className="control" placeholder="Ej: Feriado local" value={nw.name}
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
            <tr><td colSpan={4} className="hint" style={{ textAlign: 'center', padding: 16 }}>Sin feriados.</td></tr>
          ) : (
            sorted.map((h) => (
              <tr key={h.id}>
                <td>{countryName(h.country)}</td>
                <td>{fmtLargo(h.date)}</td>
                <td>{h.name || <span className="hint">—</span>}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn btn-sm btn-danger btn-icon" title="Borrar" disabled={busy}
                      onClick={() => confirm(`Borrar feriado ${fmtLargo(h.date)} (${countryName(h.country)})?`) && run(() => deleteHoliday(h.id))}>
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
