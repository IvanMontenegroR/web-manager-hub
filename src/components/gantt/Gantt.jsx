import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Download, CheckCircle2, Ban, Flag, Archive, ArchiveRestore } from 'lucide-react'
import { useData } from '../../context/DataContext.jsx'
import {
  toISO, parseDay, addDaysISO, daysBetween, eachDayISO, isWeekendISO,
  fmtCorto, fmtLargo,
} from '../../lib/dates'
import { textOn, partnerColor, partnerName, statusColor } from '../../lib/colors'
import { countryName } from '../../lib/countries'

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

export default function Gantt({
  projects,
  hidePast = false,
  emptyLabel,
  onEditProject, onDeleteProject, onArchiveProject, onAddTask, onEditTask, onDeleteTask, onExportProject,
}) {
  const { partners, enriched, conflictIds } = useData()
  const [tip, setTip] = useState(null)

  // Solo las tareas de los proyectos que este Gantt renderiza (activos o archivados).
  const projectIds = useMemo(() => new Set(projects.map((p) => p.id)), [projects])
  const myTasks = useMemo(
    () => enriched.filter((t) => projectIds.has(t.project_id)),
    [enriched, projectIds]
  )

  const geo = useMemo(() => {
    const dates = []
    for (const t of myTasks) {
      if (t.planned_start) dates.push(t.planned_start)
      if (t.planned_end) dates.push(t.planned_end)
      if (t.actual_start) dates.push(t.actual_start)
      if (t.actual_end) dates.push(t.actual_end)
      // Tambien las fechas REALES/proyectadas (forecast), para que el header cubra
      // todo lo que se dibuja y no se corte.
      if (t.renderStart) dates.push(t.renderStart)
      if (t.renderEnd) dates.push(t.renderEnd)
      if (t.delayEnd) dates.push(t.delayEnd)
    }
    // El deadline de Market Launch debe quedar siempre dentro del rango visible.
    for (const p of projects) {
      if (p.market_launch) dates.push(p.market_launch)
    }
    const today = todayISO()
    dates.push(today)
    if (dates.length === 0) dates.push(today)
    let min = dates[0], max = dates[0]
    for (const d of dates) {
      if (daysBetween(d, min) > 0) min = d
      if (daysBetween(max, d) > 0) max = d
    }
    // Con hidePast el cronograma arranca hoy; sino, 2 dias antes del primer hito.
    const start = hidePast ? today : addDaysISO(min, -2)
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
  }, [myTasks, projects, hidePast])

  const tasksByProject = useMemo(() => {
    const map = {}
    for (const t of myTasks) {
      ;(map[t.project_id] ||= []).push(t)
    }
    for (const k in map) map[k].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    return map
  }, [myTasks])

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

  // Capa POR ENCIMA de las barras: columnas de finde (y feriados de la fila) para
  // que se vea que no cuentan como dias laborales.
  function OverlayLayer({ holidaysSet }) {
    const holIdx = []
    if (holidaysSet) {
      for (let i = 0; i < geo.days.length; i++) {
        if (holidaysSet.has(geo.days[i])) holIdx.push(i)
      }
    }
    return (
      <>
        {geo.weekendIdx.map((i) => (
          <div key={`w${i}`} className="day-over weekend" style={{ left: i * dayW, width: dayW }} />
        ))}
        {holIdx.map((i) => (
          <div key={`h${i}`} className="day-over holiday" style={{ left: i * dayW, width: dayW }} title="Feriado" />
        ))}
      </>
    )
  }

  // Marcador vertical del Market Launch (deadline del mercado) para un proyecto.
  function LaunchLine({ iso }) {
    if (!iso) return null
    const i = idxOf(iso)
    if (i < 0 || i >= geo.days.length) return null
    return (
      <div
        className="launch-line"
        style={{ left: i * dayW + dayW / 2 }}
        title={`Market Launch: ${fmtLargo(iso)}`}
      />
    )
  }

  function showTip(e, t, project) {
    const color = statusColor(t.status)
    setTip({
      x: e.clientX, y: e.clientY,
      color,
      title: t.action_name,
      project: project.name,
      partner: partnerName(partners, t.partner_id),
      country: t.country,
      planned: `${fmtCorto(t.planned_start)} a ${fmtCorto(t.planned_end)}`,
      dias: t.planned_days,
      status: t.status,
      actual: t.actual_start || t.actual_end
        ? `${fmtCorto(t.actual_start)} a ${fmtCorto(t.actual_end)}`
        : null,
      conflict: conflictIds.has(t.id),
      delay: t.isDelayed ? t.delayDays : 0,
      pushed: t.pushed && !t.actual_end,
      pushedBy: t.pushedByName,
      real:
        t.projStart !== t.planned_start || (t.isDelayed ? t.delayEnd : t.renderEnd) !== t.planned_end
          ? `${fmtCorto(t.projStart)} a ${fmtCorto(t.isDelayed ? t.delayEnd : t.renderEnd)}`
          : null,
    })
  }

  if (projects.length === 0) {
    return (
      <div className="empty-projects">
        {emptyLabel || 'No hay proyectos todavia. Crea el primero con el boton Nuevo proyecto.'}
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
            const done = project.status === 'Completado'
            const cancelled = project.status === 'Cancelado'
            const finished = done || cancelled
            return (
              <div key={project.id} className={`proj-group${finished ? ' finished' : ''}`}>
                <div className="proj-row">
                  <div className="proj-label">
                    <span className="p-name">{project.name}</span>
                    {done && <CheckCircle2 size={14} className="fin-icon ok" title="Completado" />}
                    {cancelled && <Ban size={14} className="fin-icon bad" title="Cancelado" />}
                    {project.market && (
                      <span className="p-flag" title={project.market}>
                        <span className="flag">{flagEmoji(project.market)}</span>
                        {project.market}
                      </span>
                    )}
                    {project.market_launch && (
                      <span className="p-launch" title={`Market Launch: ${fmtLargo(project.market_launch)}`}>
                        <Flag size={11} /> {fmtCorto(project.market_launch)}
                      </span>
                    )}
                    <div className="proj-actions">
                      <button className="btn btn-ghost btn-sm btn-icon" title="Agregar tarea" onClick={() => onAddTask(project)}>
                        <Plus size={15} />
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Editar proyecto" onClick={() => onEditProject(project)}>
                        <Pencil size={14} />
                      </button>
                      {onExportProject && (
                        <button className="btn btn-ghost btn-sm btn-icon" title="Exportar proyecto (Excel)" onClick={() => onExportProject(project)}>
                          <Download size={14} />
                        </button>
                      )}
                      {onArchiveProject && (
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          title={project.archived ? 'Desarchivar proyecto' : 'Archivar proyecto'}
                          onClick={() => onArchiveProject(project)}
                        >
                          {project.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm btn-icon" title="Borrar proyecto" onClick={() => onDeleteProject(project)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="proj-timeline" style={{ width: totalW }}>
                    <BgLayer />
                    <LaunchLine iso={project.market_launch} />
                    <OverlayLayer holidaysSet={null} />
                  </div>
                </div>

                {tks.map((t) => {
                  const color = partnerColor(partners, t.partner_id) // punto del partner en la etiqueta
                  const barColor = statusColor(t.status) // color de la barra segun estado
                  const isConflict = conflictIds.has(t.id)
                  // Barra REAL/proyectada (solida): de projStart al fin real. Si hay atraso
                  // propio, la porcion que pasa el fin del plan va rayada en rojo (bar-delay),
                  // asi que la parte solida corta en planned_end.
                  const barEndIso = t.isDelayed ? t.planned_end : t.renderEnd
                  const startPx = idxOf(t.projStart) * dayW
                  const endPx = (idxOf(barEndIso) + 1) * dayW
                  const clipStart = Math.max(startPx, 0)
                  const barVisible = endPx > 0
                  const left = clipStart + 2
                  const width = Math.max(endPx - clipStart - 4, 12)
                  // Extension de retraso: del dia siguiente al fin plan hasta delayEnd (fin real
                  // o hoy). El numero (+Nd) es en dias habiles.
                  const dStartPx = (idxOf(t.planned_end) + 1) * dayW
                  const dEndPx = t.delayEnd ? (idxOf(t.delayEnd) + 1) * dayW : dStartPx
                  const dClip = Math.max(dStartPx, 0)
                  const delayVisible = t.isDelayed && dEndPx > 0
                  const delayLeft = dClip
                  const delayWidth = Math.max(dEndPx - dClip - 2, 8)
                  // Fantasma del plan original: cuando la realidad se corrio del plan.
                  const startMoved = idxOf(t.projStart) !== idxOf(t.planned_start)
                  const endMoved = !t.isDelayed && idxOf(t.renderEnd) !== idxOf(t.planned_end)
                  const gStartPx = idxOf(t.planned_start) * dayW
                  const gEndPx = (idxOf(t.planned_end) + 1) * dayW
                  const gClip = Math.max(gStartPx, 0)
                  const ghostVisible = (startMoved || endMoved) && gEndPx > 0
                  const gLeft = gClip + 1
                  const gWidth = Math.max(gEndPx - gClip - 2, 10)
                  // Linea rayada que une el fin del fantasma con el inicio de la barra real.
                  const linkLeft = Math.max(gEndPx, 0)
                  const linkVisible = ghostVisible && startPx > linkLeft
                  const linkWidth = Math.max(startPx - linkLeft, 0)
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
                        <LaunchLine iso={project.market_launch} />
                        {ghostVisible && (
                          <div
                            className="bar-ghost"
                            style={{ left: gLeft, width: gWidth }}
                            title={`Plan original: ${fmtCorto(t.planned_start)} a ${fmtCorto(t.planned_end)}`}
                          />
                        )}
                        {linkVisible && (
                          <div className="bar-link" style={{ left: linkLeft, width: linkWidth }} />
                        )}
                        {barVisible && (
                          <div
                            className={`bar${isConflict ? ' conflict' : ''}`}
                            style={{ left, width, background: barColor, color: textOn(barColor) }}
                            onMouseEnter={(e) => showTip(e, t, project)}
                            onMouseMove={(e) => setTip((p) => (p ? { ...p, x: e.clientX, y: e.clientY } : p))}
                            onMouseLeave={() => setTip(null)}
                          >
                            <span className="bar-txt">{t.action_name}</span>
                          </div>
                        )}
                        {delayVisible && (
                          <div
                            className="bar-delay"
                            style={{ left: delayLeft, width: delayWidth }}
                            onMouseEnter={(e) => showTip(e, t, project)}
                            onMouseMove={(e) => setTip((p) => (p ? { ...p, x: e.clientX, y: e.clientY } : p))}
                            onMouseLeave={() => setTip(null)}
                          >
                            +{t.delayDays}d
                          </div>
                        )}
                        <OverlayLayer holidaysSet={t.holidaysSet} />
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
          {tip.country && <div className="tt-row"><span>Feriados</span><b>{countryName(tip.country)}</b></div>}
          <div className="tt-row"><span>Plan</span><b>{tip.planned}</b></div>
          <div className="tt-row"><span>Dias SLA</span><b>{tip.dias}</b></div>
          <div className="tt-row"><span>Status</span><b>{tip.status}</b></div>
          {tip.actual && <div className="tt-row"><span>Real</span><b>{tip.actual}</b></div>}
          {tip.real && <div className="tt-row"><span>Real</span><b>{tip.real}</b></div>}
          {tip.conflict && <div className="tt-flag danger">Solapamiento de partner</div>}
          {tip.delay > 0 && <div className="tt-flag warn">Retraso de {tip.delay} dia{tip.delay > 1 ? 's' : ''}</div>}
          {tip.pushed && (
            <div className="tt-flag info">
              Empujada por dependencia{tip.pushedBy ? `: ${tip.pushedBy}` : ''}
            </div>
          )}
        </div>
      )}
    </>
  )
}
