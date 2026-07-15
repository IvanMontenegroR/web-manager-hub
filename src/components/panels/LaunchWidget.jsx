import { useMemo } from 'react'
import { Rocket } from 'lucide-react'
import { useData } from '../../context/DataContext.jsx'
import { toISO, parseDay } from '../../lib/dates'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function fmt(l) {
  if (l.precision === 'month' && l.launch_date) {
    const d = parseDay(l.launch_date)
    return `${MESES[d.getMonth()]} ${d.getFullYear()}`
  }
  const d = parseDay(l.launch_date)
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]}`
}

// Widget compacto de proximos lanzamientos por mercado (arriba de los estados).
export default function LaunchWidget() {
  const { projects, launchesByProject } = useData()

  const byMarket = useMemo(() => {
    const today = toISO(new Date())
    const monthKey = today.slice(0, 7)
    const rows = []
    for (const p of projects) {
      if (p.archived) continue
      for (const l of launchesByProject.get(p.id) || []) {
        if (!l.launch_date) continue // TBD fuera del widget
        const upcoming = l.precision === 'month' ? l.launch_date.slice(0, 7) >= monthKey : l.launch_date >= today
        if (upcoming) rows.push({ ...l, project: p.name })
      }
    }
    const m = new Map()
    for (const r of rows) {
      if (!m.has(r.market)) m.set(r.market, [])
      m.get(r.market).push(r)
    }
    for (const arr of m.values()) arr.sort((a, b) => (a.launch_date || '').localeCompare(b.launch_date || ''))
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [projects, launchesByProject])

  if (byMarket.length === 0) return null

  return (
    <div className="launch-widget">
      <div className="lw-title"><Rocket size={13} /> Próximos lanzamientos</div>
      <div className="lw-markets">
        {byMarket.map(([market, items]) => (
          <div key={market} className="lw-market">
            <span className="lw-mk">{market}</span>
            <div className="lw-items">
              {items.map((it) => (
                <span key={it.id} className="lw-item" title={`${it.project} — ${fmt(it)}`}>
                  <b>{fmt(it)}</b> {it.project}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
