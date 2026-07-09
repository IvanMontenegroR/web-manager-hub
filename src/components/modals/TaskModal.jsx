import { useMemo, useState } from 'react'
import { ListPlus } from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import { useData } from '../../context/DataContext.jsx'
import { createTask, updateTask } from '../../lib/db'
import { plannedEnd, daysBetween, businessDaysBetween, isWeekendISO, fmtCorto, toISO } from '../../lib/dates'
import { taskCountry, countryName } from '../../lib/countries'

// El retraso se detecta automaticamente (fin real > fin plan); no es un estado manual.
const TASK_STATUSES = ['Pendiente', 'En curso', 'Completado']
const CUSTOM = '__custom__'

export default function TaskModal({ task, project, onClose }) {
  const { slas, partners, tasks, holidaysByCountry, holidays, refresh } = useData()
  const editing = !!task

  const knownAction = slas.some((s) => s.action_name === task?.action_name)

  // Tareas hermanas (mismo proyecto) para elegir predecesoras.
  const siblings = tasks
    .filter((t) => t.project_id === project?.id && t.id !== task?.id)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  // Default de dependencias: al editar, las guardadas; al crear, la ultima tarea del proyecto.
  const defaultDeps = editing
    ? (Array.isArray(task.depends_on) ? task.depends_on : [])
    : (() => {
        const prev = siblings.reduce((m, t) => (!m || (t.sort_order || 0) > (m.sort_order || 0) ? t : m), null)
        return prev ? [prev.id] : []
      })()

  const [form, setForm] = useState({
    action_name: task?.action_name || '',
    partner_id: task?.partner_id || '',
    planned_start: task?.planned_start || project?.start_date || toISO(new Date()),
    planned_days: task?.planned_days ?? 1,
    status: task?.status || 'Pendiente',
    actual_start: task?.actual_start || '',
    actual_end: task?.actual_end || '',
    delay_reason: task?.delay_reason || '',
    excluded_holidays: Array.isArray(task?.excluded_holidays) ? task.excluded_holidays : [],
    depends_on: defaultDeps,
  })

  const toggleDep = (id) =>
    setForm((f) => {
      const cur = f.depends_on || []
      return { ...f, depends_on: cur.includes(id) ? cur.filter((d) => d !== id) : [...cur, id] }
    })
  // control del selector de accion: valor de sla o custom
  const [actionSel, setActionSel] = useState(
    !task?.action_name ? '' : knownAction ? task.action_name : CUSTOM
  )
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  // Calendario de feriados de la tarea: pais del partner, o el market del proyecto.
  const partner = partners.find((p) => p.id === form.partner_id)
  const country = taskCountry(partner, project)
  const countrySet = holidaysByCountry?.get(country) || null

  // Feriados efectivos = los del pais menos los excluidos en esta tarea.
  const holSet = useMemo(() => {
    if (!countrySet) return null
    const excl = form.excluded_holidays
    if (!excl || !excl.length) return countrySet
    const s = new Set(countrySet)
    for (const d of excl) s.delete(d)
    return s
  }, [countrySet, form.excluded_holidays])

  const pEnd = useMemo(
    () => plannedEnd(form.planned_start, Number(form.planned_days) || 1, holSet),
    [form.planned_start, form.planned_days, holSet]
  )
  const delayDays =
    form.actual_end && daysBetween(pEnd, form.actual_end) > 0
      ? businessDaysBetween(pEnd, form.actual_end, holSet)
      : 0
  const isDelayed = delayDays > 0

  // Feriados (dia habil) del pais dentro del rango de la tarea, para poder excluirlos.
  const spanEndFull = plannedEnd(form.planned_start, Number(form.planned_days) || 1, countrySet)
  const holidaysInSpan = holidays
    .filter(
      (h) =>
        h.country === country &&
        !isWeekendISO(h.date) &&
        h.date >= form.planned_start &&
        h.date <= spanEndFull
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  const toggleHoliday = (date) =>
    setForm((f) => {
      const cur = f.excluded_holidays || []
      return {
        ...f,
        excluded_holidays: cur.includes(date) ? cur.filter((d) => d !== date) : [...cur, date],
      }
    })

  function onActionChange(e) {
    const v = e.target.value
    setActionSel(v)
    if (v === CUSTOM) {
      setForm((f) => ({ ...f, action_name: '' }))
    } else {
      const sla = slas.find((s) => s.action_name === v)
      setForm((f) => ({
        ...f,
        action_name: v,
        // autocompleta dias del SLA (override permitido despues)
        planned_days: sla ? sla.sla_days : f.planned_days,
      }))
    }
  }

  async function save() {
    if (!form.action_name.trim()) return setErr('La accion es obligatoria.')
    if (!form.planned_start) return setErr('La fecha de inicio es obligatoria.')
    if (Number(form.planned_days) < 1) return setErr('Los dias deben ser 1 o mas.')
    if (isDelayed && !form.delay_reason.trim()) {
      return setErr('El fin real supera el fin planificado: la razon del retraso es obligatoria.')
    }
    setSaving(true)
    setErr(null)
    try {
      if (editing) {
        await updateTask(task.id, form)
      } else {
        const siblings = tasks.filter((t) => t.project_id === project.id)
        const nextSort = siblings.reduce((m, t) => Math.max(m, t.sort_order || 0), 0) + 1
        await createTask({ ...form, project_id: project.id }, nextSort)
      }
      await refresh()
      onClose()
    } catch (e) {
      setErr(e.message)
      setSaving(false)
    }
  }

  return (
    <Modal
      title={editing ? 'Editar tarea' : 'Agregar tarea'}
      icon={<ListPlus size={18} color="var(--purina)" />}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Agregar tarea'}
          </button>
        </>
      }
    >
      {err && <div className="form-error">{err}</div>}
      {project && (
        <div className="field">
          <label>Proyecto</label>
          <input className="control" value={project.name} disabled />
        </div>
      )}

      <div className="row-2">
        <div className="field req">
          <label>Accion</label>
          <select className="control" value={actionSel} onChange={onActionChange}>
            <option value="" disabled>Elegir accion...</option>
            {slas.map((s) => (
              <option key={s.id} value={s.action_name}>
                {s.action_name} ({s.sla_days}d)
              </option>
            ))}
            <option value={CUSTOM}>Otra (personalizada)</option>
          </select>
          {actionSel === CUSTOM && (
            <input
              className="control"
              style={{ marginTop: 8 }}
              value={form.action_name}
              onChange={set('action_name')}
              placeholder="Nombre de la accion"
            />
          )}
        </div>
        <div className="field">
          <label>Partner</label>
          <select className="control" value={form.partner_id} onChange={set('partner_id')}>
            <option value="">Sin partner</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="row-3">
        <div className="field req">
          <label>Fecha inicio (plan)</label>
          <input type="date" className="control" value={form.planned_start} onChange={set('planned_start')} />
        </div>
        <div className="field req">
          <label>Dias habiles (SLA)</label>
          <input type="number" min="1" className="control" value={form.planned_days} onChange={set('planned_days')} />
          <div className="hint">Fin plan: {fmtCorto(pEnd)} (sin findes ni feriados del partner)</div>
        </div>
        <div className="field">
          <label>Status</label>
          <select className="control" value={form.status} onChange={set('status')}>
            {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {siblings.length > 0 && (
        <div className="field">
          <label>Depende de (predecesoras)</label>
          <div className="hint" style={{ marginBottom: 6 }}>
            Si una predecesora se atrasa, esta tarea se corre en el <b>forecast</b> (el plan no cambia).
            Para una tarea en paralelo (ej. SEO), dejala dependiendo del punto de ramificacion, no de la
            tarea que corre en simultaneo.
          </div>
          <div className="hol-list">
            {siblings.map((s) => {
              const on = (form.depends_on || []).includes(s.id)
              return (
                <label key={s.id} className="hol-item">
                  <input type="checkbox" checked={on} onChange={() => toggleDep(s.id)} />
                  <span className="hol-name">{s.action_name}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {holidaysInSpan.length > 0 && (
        <div className="field">
          <label>Feriados en el rango ({countryName(country)})</label>
          <div className="hint" style={{ marginBottom: 6 }}>
            Cuentan como dias no habiles y corren el fin. Destilda uno si esta tarea NO se frena ese
            dia (ej. hay un backup approver de otro pais).
          </div>
          <div className="hol-list">
            {holidaysInSpan.map((h) => {
              const excluded = (form.excluded_holidays || []).includes(h.date)
              return (
                <label key={h.id} className={`hol-item${excluded ? ' off' : ''}`}>
                  <input type="checkbox" checked={!excluded} onChange={() => toggleHoliday(h.date)} />
                  <span className="hol-date">{fmtCorto(h.date)}</span>
                  <span className="hol-name">{h.name || 'Feriado'}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      <div className="row-2">
        <div className="field">
          <label>Inicio real</label>
          <input type="date" className="control" value={form.actual_start} onChange={set('actual_start')} />
        </div>
        <div className="field">
          <label>Fin real</label>
          <input type="date" className="control" value={form.actual_end} onChange={set('actual_end')} />
        </div>
      </div>

      <div className={`field${isDelayed ? ' req' : ''}`}>
        <label>Razon del retraso</label>
        <textarea
          className="control"
          value={form.delay_reason}
          onChange={set('delay_reason')}
          placeholder={isDelayed ? 'Obligatoria: el fin real supera el fin planificado' : 'Opcional'}
        />
        {isDelayed && (
          <div className="hint" style={{ color: 'var(--danger)' }}>
            Retraso de {delayDays} dia{delayDays > 1 ? 's' : ''} habil{delayDays > 1 ? 'es' : ''} respecto al fin plan ({fmtCorto(pEnd)}).
          </div>
        )}
      </div>
    </Modal>
  )
}
