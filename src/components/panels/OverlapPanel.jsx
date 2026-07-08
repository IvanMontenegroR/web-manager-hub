import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useData } from '../../context/DataContext.jsx'
import { partnerColor, partnerName } from '../../lib/colors'
import { fmtCorto } from '../../lib/dates'

export default function OverlapPanel() {
  const { pairs, partners, projects } = useData()
  const projName = (id) => projects.find((p) => p.id === id)?.name || 'Proyecto'

  return (
    <div className="card panel">
      <h3 className="section-title">
        <AlertTriangle size={15} color="var(--danger)" />
        Solapamientos por partner
        <span className="count">{pairs.length}</span>
      </h3>

      {pairs.length === 0 ? (
        <div className="panel-empty">
          <CheckCircle2 size={16} color="var(--ok)" />
          Sin solapamientos entre proyectos.
        </div>
      ) : (
        pairs.map(({ a, b, partner_id }, i) => {
          const color = partnerColor(partners, partner_id)
          return (
            <div className="conflict-item" key={i}>
              <div className="ci-head">
                <span className="swatch" style={{ width: 11, height: 11, borderRadius: 3, background: color, display: 'inline-block' }} />
                <span className="ci-partner">{partnerName(partners, partner_id)}</span>
                <span className="ci-action">{a.action_name === b.action_name ? a.action_name : `${a.action_name} / ${b.action_name}`}</span>
              </div>
              <div className="ci-legs">
                <div className="ci-leg">
                  <div className="leg-proj">{projName(a.project_id)}</div>
                  <div className="leg-range">{fmtCorto(a.planned_start)} a {fmtCorto(a.planned_end)}</div>
                </div>
                <div className="ci-leg">
                  <div className="leg-proj">{projName(b.project_id)}</div>
                  <div className="leg-range">{fmtCorto(b.planned_start)} a {fmtCorto(b.planned_end)}</div>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
