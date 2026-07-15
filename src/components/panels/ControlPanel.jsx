import { Target, AlertOctagon, CalendarClock, CalendarPlus, CircleCheck, CheckCircle2 } from 'lucide-react'
import { useData } from '../../context/DataContext.jsx'
import { partnerName } from '../../lib/colors'
import { fmtCorto } from '../../lib/dates'

// Etiquetas relativas en dias habiles.
const backLabel = (n) => (n === 0 ? 'cerro hoy' : n === 1 ? 'ayer hab.' : `hace ${n} d hab.`)
const aheadLabel = (n) => (n === 1 ? 'manana hab.' : `en ${n} d hab.`)

export default function ControlPanel() {
  const { control, partners, projects } = useData()
  const { overdueOpen, dueToday, upcoming, recentlyDone } = control
  const projName = (id) => projects.find((p) => p.id === id)?.name || 'Proyecto'
  const total = overdueOpen.length + dueToday.length + upcoming.length + recentlyDone.length

  const Row = ({ t, right }) => (
    <div className="ctrl-item">
      <div className="ctrl-main">
        <span className="ctrl-proj">{projName(t.project_id)}</span>
        <span className="ctrl-action">{t.action_name}</span>
      </div>
      <div className="ctrl-meta">
        <span className="pill">{partnerName(partners, t.partner_id)}</span>
        {right}
      </div>
    </div>
  )

  return (
    <div className="card panel">
      <h3 className="section-title">
        <Target size={15} color="var(--info)" />
        Control del dia
        <span className="count">{overdueOpen.length + dueToday.length}</span>
      </h3>

      {total === 0 ? (
        <div className="panel-empty">
          <CheckCircle2 size={16} color="var(--ok)" />
          Nada para controlar por ahora.
        </div>
      ) : (
        <div className="ctrl-blocks">
          {overdueOpen.length > 0 && (
            <div className="ctrl-block bad">
              <div className="ctrl-block-head"><AlertOctagon size={13} /> Vencidas sin cerrar <span className="cb-count">{overdueOpen.length}</span></div>
              {overdueOpen.map((t) => (
                <Row key={t.id} t={t} right={<span className="ctrl-tag bad">+{t.overDays} d hab.</span>} />
              ))}
            </div>
          )}

          {dueToday.length > 0 && (
            <div className="ctrl-block today">
              <div className="ctrl-block-head"><CalendarClock size={13} /> Vencen hoy <span className="cb-count">{dueToday.length}</span></div>
              {dueToday.map((t) => (
                <Row
                  key={t.id}
                  t={t}
                  right={<span className={`ctrl-tag ${t.actual_start ? 'info' : 'warn'}`}>{t.actual_start ? 'en curso' : 'sin arrancar'}</span>}
                />
              ))}
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="ctrl-block soon">
              <div className="ctrl-block-head"><CalendarPlus size={13} /> Por vencer (prox. 3 d hab.) <span className="cb-count">{upcoming.length}</span></div>
              {upcoming.map((t) => (
                <Row key={t.id} t={t} right={<span className="ctrl-tag soon" title={fmtCorto(t.ref)}>{aheadLabel(t.aheadDays)}</span>} />
              ))}
            </div>
          )}

          {recentlyDone.length > 0 && (
            <div className="ctrl-block done">
              <div className="ctrl-block-head"><CircleCheck size={13} /> Cerradas recien (ult. 3 d hab.) <span className="cb-count">{recentlyDone.length}</span></div>
              {recentlyDone.map((t) => (
                <Row
                  key={t.id}
                  t={t}
                  right={
                    <>
                      {t.isDelayed
                        ? <span className="ctrl-tag bad">tarde +{t.delayDays}</span>
                        : <span className="ctrl-tag ok">a tiempo</span>}
                      <span className="ctrl-when" title={fmtCorto(t.actual_end)}>{backLabel(t.backDays)}</span>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
