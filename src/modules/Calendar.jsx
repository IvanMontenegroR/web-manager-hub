import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, addWeeks, addDays, addYears, isSameMonth, isSameDay, getMonth, getYear,
} from 'date-fns'
import { useData } from '../context/DataContext.jsx'
import { parseDay } from '../lib/dates'

const MES_L = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const MES_S = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DOW_L = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const VIEWS = [['day', 'Día'], ['week', 'Semana'], ['month', 'Mes'], ['year', 'Año']]
const wk = { weekStartsOn: 1 }

export default function Calendar() {
  const { projects, launchesByProject } = useData()
  // La vista (dia/semana/mes/año) se recuerda; el cursor arranca siempre en hoy.
  const [view, setView] = useState(() => {
    const v = localStorage.getItem('wmh_cal_view')
    return ['day', 'week', 'month', 'year'].includes(v) ? v : 'month'
  })
  const [cursor, setCursor] = useState(() => new Date())
  useEffect(() => { localStorage.setItem('wmh_cal_view', view) }, [view])

  const events = useMemo(() => {
    const out = []
    for (const p of projects) {
      if (p.archived) continue
      for (const l of launchesByProject.get(p.id) || []) {
        if (!l.launch_date) continue
        out.push({ id: l.id, d: parseDay(l.launch_date), iso: l.launch_date, market: l.market, project: p.name, precision: l.precision })
      }
    }
    return out
  }, [projects, launchesByProject])

  const dayEvents = (day) => events.filter((e) => e.precision !== 'month' && isSameDay(e.d, day))
  const monthEvents = (date) => events.filter((e) => e.precision === 'month' && getMonth(e.d) === getMonth(date) && getYear(e.d) === getYear(date))

  const step = (dir) => {
    if (view === 'day') setCursor((c) => addDays(c, dir))
    else if (view === 'week') setCursor((c) => addWeeks(c, dir))
    else if (view === 'month') setCursor((c) => addMonths(c, dir))
    else setCursor((c) => addYears(c, dir))
  }

  const title =
    view === 'year' ? `${getYear(cursor)}`
    : view === 'day' ? `${DOW_L[cursor.getDay()]} ${cursor.getDate()} ${MES_S[cursor.getMonth()]} ${cursor.getFullYear()}`
    : `${MES_L[cursor.getMonth()]} ${cursor.getFullYear()}`

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Calendario</h1>
          <div className="sub">Lanzamientos de proyectos por mercado</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-icon" title="Anterior" onClick={() => step(-1)}><ChevronLeft size={16} /></button>
          <button className="btn" onClick={() => setCursor(new Date())}>Hoy</button>
          <button className="btn btn-icon" title="Siguiente" onClick={() => step(1)}><ChevronRight size={16} /></button>
          <span className="cal-title">{title}</span>
          <div className="cal-views">
            {VIEWS.map(([v, t]) => (
              <button key={v} className={`btn btn-sm${view === v ? ' active' : ''}`} onClick={() => setView(v)}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="content">
        {events.length === 0 && (
          <div className="panel-empty" style={{ marginBottom: 12 }}>
            <CalendarDays size={16} /> No hay lanzamientos cargados. Agregalos en cada proyecto.
          </div>
        )}
        {view === 'month' && <MonthView cursor={cursor} dayEvents={dayEvents} monthEvents={monthEvents} />}
        {view === 'week' && <WeekView cursor={cursor} dayEvents={dayEvents} monthEvents={monthEvents} />}
        {view === 'day' && <DayView cursor={cursor} dayEvents={dayEvents} monthEvents={monthEvents} />}
        {view === 'year' && (
          <YearView cursor={cursor} events={events} onOpen={(m) => { setCursor(new Date(getYear(cursor), m, 1)); setView('month') }} />
        )}
      </div>
    </>
  )
}

function Ev({ e }) {
  return <span className="cal-ev" title={`${e.market} · ${e.project}`}><b>{e.market}</b> {e.project}</span>
}

function MonthBand({ evs }) {
  if (!evs.length) return null
  return (
    <div className="cal-band">
      <span className="cal-band-lbl">Este mes (aprox.)</span>
      {evs.map((e) => <span key={e.id} className="cal-ev month" title={`${e.market} · ${e.project}`}><b>{e.market}</b> {e.project}</span>)}
    </div>
  )
}

function MonthView({ cursor, dayEvents, monthEvents }) {
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor), wk), end: endOfWeek(endOfMonth(cursor), wk) })
  const today = new Date()
  return (
    <div>
      <MonthBand evs={monthEvents(cursor)} />
      <div className="cal-grid">
        {DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}
        {days.map((day) => {
          const out = !isSameMonth(day, cursor)
          const evs = dayEvents(day)
          return (
            <div key={day.toISOString()} className={`cal-cell${out ? ' out' : ''}${isSameDay(day, today) ? ' today' : ''}`}>
              <div className="cal-daynum">{day.getDate()}</div>
              <div className="cal-cell-evs">{evs.map((e) => <Ev key={e.id} e={e} />)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeekView({ cursor, dayEvents, monthEvents }) {
  const days = eachDayOfInterval({ start: startOfWeek(cursor, wk), end: endOfWeek(cursor, wk) })
  const today = new Date()
  return (
    <div>
      <MonthBand evs={monthEvents(cursor)} />
      <div className="cal-week">
        {days.map((day) => (
          <div key={day.toISOString()} className={`cal-wcol${isSameDay(day, today) ? ' today' : ''}`}>
            <div className="cal-whead">{DOW[(day.getDay() + 6) % 7]} {day.getDate()}</div>
            <div className="cal-cell-evs">{dayEvents(day).map((e) => <Ev key={e.id} e={e} />)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DayView({ cursor, dayEvents, monthEvents }) {
  const evs = dayEvents(cursor)
  const mo = monthEvents(cursor)
  return (
    <div className="cal-day">
      <MonthBand evs={mo} />
      {evs.length === 0 ? (
        <div className="panel-empty">Sin lanzamientos con fecha exacta este día.</div>
      ) : (
        evs.map((e) => (
          <div key={e.id} className="cal-day-item"><span className="lw-mk">{e.market}</span> {e.project}</div>
        ))
      )}
    </div>
  )
}

function YearView({ cursor, events, onOpen }) {
  const y = getYear(cursor)
  const today = new Date()
  return (
    <div className="cal-year">
      {MES_L.map((name, m) => {
        const count = events.filter((e) => getYear(e.d) === y && getMonth(e.d) === m).length
        const isCur = today.getFullYear() === y && today.getMonth() === m
        return (
          <button key={m} className={`cal-ymonth${isCur ? ' today' : ''}`} onClick={() => onOpen(m)}>
            <div className="cal-ymname">{name}</div>
            <div className="cal-ycount">{count ? `${count} lanzamiento${count > 1 ? 's' : ''}` : '—'}</div>
          </button>
        )
      })}
    </div>
  )
}
