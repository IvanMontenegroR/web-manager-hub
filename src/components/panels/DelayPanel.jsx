import { Clock, CheckCircle2 } from 'lucide-react'
import { useData } from '../../context/DataContext.jsx'
import { partnerName } from '../../lib/colors'
import { fmtCorto } from '../../lib/dates'
import { totalDelayDays } from '../../lib/analysis'

export default function DelayPanel() {
  const { delays, partners, projects } = useData()
  const projName = (id) => projects.find((p) => p.id === id)?.name || 'Proyecto'

  return (
    <div className="card panel">
      <h3 className="section-title">
        <Clock size={15} color="var(--warn)" />
        Retrasos
        <span className="count">{delays.length}</span>
      </h3>

      {delays.length === 0 ? (
        <div className="panel-empty">
          <CheckCircle2 size={16} color="var(--ok)" />
          Ninguna tarea supera su fin planificado.
        </div>
      ) : (
        delays.map((t) => (
          <div className="delay-item" key={t.id}>
            <div className="delay-head">
              <span className="ci-partner">{projName(t.project_id)}</span>
              <span className="ci-action">{t.action_name}</span>
              <span className="pill">{partnerName(partners, t.partner_id)}</span>
              <span className="delay-days">+{totalDelayDays(t)} dia{totalDelayDays(t) > 1 ? 's' : ''}</span>
            </div>
            <div className="delay-grid">
              {t.isLateStart && (
                <>
                  <span className="k">Podía arrancar</span><span className="v">{fmtCorto(t.lateStart)}</span>
                  <span className="k">Arrancó</span><span className="v">{fmtCorto(t.actual_start)}</span>
                </>
              )}
              {t.isDelayed && (
                <>
                  <span className="k">Fin SLA</span><span className="v">{fmtCorto(t.effPlanEnd || t.planned_end)}</span>
                  <span className="k">Fin real</span><span className="v">{fmtCorto(t.delayEnd)}</span>
                </>
              )}
            </div>
            {t.delay_reason && <div className="delay-reason">{t.delay_reason}</div>}
          </div>
        ))
      )}
    </div>
  )
}
