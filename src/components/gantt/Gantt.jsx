import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useData } from '../../context/DataContext.jsx'
import {
  toISO, parseDay, addDaysISO, daysBetween, eachDayISO, isWeekendISO,
  fmtCorto, fmtLargo,
} from '../../lib/dates'
import { textOn, partnerColor, partnerName } from '../../lib/colors'

const DOW = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const MESES_LARGO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// today real del navegador
function todayISO() {
  return toISO(new Date())
}

// Convierte un codigo de pais de 2 letras (MX, BR, AR) en emoji de bandera.
function flagEmoji(cc) {
  if (!cc || !/^[a-zA-Z]{2}$/.test(cc.trim())) return ''
  const c = cc.trim().toUpperCase()
  return String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65, 0x1f1e6 + c.charCodeAt(1) - 65)
}

export default function Gantt({ onEditProject, onDeleteProject, onAddTask, onEditTask, onDeleteTask }) {
  const { projects, partners, enriched, conflictIds } = useData()
  const [tip, setTip] = useState(null)

  const geo = useMemo(() => {
    const dates = []
    for (const t of enriched) {
      if (t.planned_start) dates.push(t.planned_start)
      if (t.planned_end) dates.push(t.planned_end)
      if (t.actual_start) dates.push(t.actual_start)
      if (t.actual_end) dates.push(t.actual_end)
    }
    const today = todayISO()
    dates.push(today)
    if (dates.length === 0) dates.push(today)
    let min = dates[0], max = dates[0]
    for (const d of dates) {
      if (daysBetween(d, min) > 0) min = d
      if (daysBetween(max, d) > 0) max = d
    }
    const start = addDaysISO(min, -2)
    const end = addDaysISO(max, 3)
    const days = eachDayISO(start, end)
    // segmentos de mes
    const months = []
    for (const iso of days) {
      const d = parseDay(iso)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const last = months[months.length - 1]
      if (last && last.key === key) last.count += 1
      else months.push({ key, count: 1, label: `${MESES_LARGO[d.getMonth()]} ${d.getFullYear()}` })
    }
    const weekendIdx = days.map((iso, i) => (isWeekendISO(iso) ? i : -1)).filter((i) => i >= 0)
    const todayIdx = daysBetween(start, today)
    return { start, days, months, weekendIdx, todayIdx, today }
  }, [enriched])

  const tasksByProject = useMemo(() => {
    const map = {}
    for (const t of enriched) {
      ;(map[t.project_id] ||= []).push(t)
    }
    for (const k in map) map[k].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    return map
  }, [enriched])

  const dayW = 34
  const labelW = 300
  const idxOf = (iso) => daysBetween(geo.start, iso)
  const totalW = geo.days.length * dayW

  function BgLayer() {
    return (
      <>
        {geo.weekendIdx.map((i) => (
          <div key={i} className="bg-day weekend" style={{ left: i * dayW, width: dayW }} />
        ))}
        {geo.todayIdx >= 0 && geo.todayIdx < geo.days.length && (
          <div className="today-line" style={{ left: geo.todayIdx * dayW + dayW / 2 }} />
        )}
      </>
    )
  }

  function showTip(e, t, project) {
    const color = partnerColor(partners, t.partner_id)
    setTip({
      x: e.clientX, y: e.clientY,
      color,
      title: t.action_name,
      project: project.name,
      partner: partnerName(partners, t.partner_id),
      planned: `${fmtCorto(t.planned_start)} a ${fmtCorto(t.planned_end)}`,
      dias: t.planned_days,
      status: t.status,
      actual: t.actual_start || t.actual_end
        ? `${fmtCorto(t.actual_start)} a ${fmtCorto(t.actual_end)}`
        : null,
      conflict: conflictIds.has(t.id),
      delay: t.isDelayed ? t.delayDays : 0,
    })
  }

  if (projects.length === 0) {
    return (
      <div className="empty-projects">
        No hay proyectos todavia. Crea el primero con el boton Nuevo proyecto.
      </div>
    )
  }

  return (
    <>
      <div className="gantt-wrap">
        <div className="gantt-grid" style={{ width: labelW + totalW }}>
          {/* Header */}
          <div className="gantt-head">
            <div className="head-months">
              <div className="corner corner-top">Cronograma por dia</div>
              {geo.months.map((m) => (
                <div key={m.key} className="month-cell" style={{ width: m.count * dayW, minWidth: m.count * dayW }}>
                  {m.label}
                </div>
              ))}
            </div>
            <div className="head-days">
              <div className="corner corner-bottom">Proyecto / Tarea</div>
              {geo.days.map((iso, i) => {
                const d = parseDay(iso)
                const wknd = isWeekendISO(iso)
                const isToday = i === geo.todayIdx
                return (
                  <div key={iso} className={`day-cell${wknd ? ' weekend' : ''}${isToday ? ' today' : ''}`}>
                    <div className="dow">{DOW[d.getDay()]}</div>
                    <div className="dnum">{d.getDate()}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Filas */}
          {projects.map((project) => {
            const tks = tasksByProject[project.id] || []
            return (
              <div key={project.id}>
                <div className="proj-row">
                  <div className="proj-label">
                    <span className="p-name">{project.name}</span>
                    {project.market && (
                      <span className="p-flag" title={project.market}>
                        <span className="flag">{flagEmoji(project.market)}</span>
                        {project.market}
                      </span>
                    )}
                    <div className="proj-actions">
                      <button className="btn btn-ghost btn-sm btn-icon" title="Agregar tarea" onClick={() => onAddTask(project)}>
                        <Plus size={15} />
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Editar proyecto" onClick={() => onEditProject(project)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Borrar proyecto" onClick={() => onDeleteProject(project)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="proj-timeline" style={{ width: totalW }}>
                    <BgLayer />
                  </div>
                </div>

                {tks.map((t) => {
                  const color = partnerColor(partners, t.partner_id)
                  const isConflict = conflictIds.has(t.id)
                  const left = idxOf(t.planned_start) * dayW + 2
                  const width = Math.max(t.planned_days * dayW - 4, 16)
                  const delayLeft = (idxOf(t.planned_end) + 1) * dayW
                  const delayWidth = t.delayDays * dayW - 2
                  return (
                    <div className="task-row" key={t.id}>
                      <div className="task-label">
                        <span className="swatch" style={{ background: color }} />
                        <span className="t-name">{t.action_name}</span>
                        <span className="t-partner">{partnerName(partners, t.partner_id)}</span>
                        <div className="task-actions">
                          <button className="btn btn-ghost btn-sm btn-icon" title="Editar tarea" onClick={() => onEditTask(t, project)}>
                            <Pencil size={13} />
                          </button>
                          <button className="btn btn-ghost btn-sm btn-icon" title="Borrar tarea" onClick={() => onDeleteTask(t, project)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="task-timeline" style={{ width: totalW }}>
                        <BgLayer />
                        <div
                          className={`bar${isConflict ? ' conflict' : ''}`}
                          style={{ left, width, background: color, color: textOn(color) }}
                          onMouseEnter={(e) => showTip(e, t, project)}
                          onMouseMove={(e) => setTip((p) => (p ? { ...p, x: e.clientX, y: e.clientY } : p))}
                          onMouseLeave={() => setTip(null)}
                        >
                          <span className="bar-txt">{t.action_name}</span>
                        </div>
                        {t.isDelayed && (
                          <div
                            className="bar-delay"
                            style={{ left: delayLeft, width: Math.max(delayWidth, 10) }}
                            onMouseEnter={(e) => showTip(e, t, project)}
                            onMouseMove={(e) => setTip((p) => (p ? { ...p, x: e.clientX, y: e.clientY } : p))}
                            onMouseLeave={() => setTip(null)}
                          >
                            +{t.delayDays}d
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {tip && (
        <div
          className="tooltip"
          style={{
            left: Math.min(tip.x + 14, window.innerWidth - 300),
            top: Math.min(tip.y + 14, window.innerHeight - 170),
          }}
        >
          <div className="tt-title">
            <span className="tt-swatch" style={{ background: tip.color }} />
            {tip.title}
          </div>
          <div className="tt-row"><span>Proyecto</span><b>{tip.project}</b></div>
          <div className="tt-row"><span>Partner</span><b>{tip.partner}</b></div>
          <div className="tt-row"><span>Plan</span><b>{tip.planned}</b></div>
          <div className="tt-row"><span>Dias SLA</span><b>{tip.dias}</b></div>
          <div className="tt-row"><span>Status</span><b>{tip.status}</b></div>
          {tip.actual && <div className="tt-row"><span>Real</span><b>{tip.actual}</b></div>}
          {tip.conflict && <div className="tt-flag danger">Solapamiento de partner</div>}
          {tip.delay > 0 && <div className="tt-flag warn">Retraso de {tip.delay} dia{tip.delay > 1 ? 's' : ''}</div>}
        </div>
      )}
    </>
  )
}
