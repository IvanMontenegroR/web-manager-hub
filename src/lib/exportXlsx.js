// Export a Excel (.xlsx). Formato simple de planilla, sin reproducir el Gantt.
// Recibe tasks YA enriquecidas (planned_end / delayDays en dias habiles).
import * as XLSX from 'xlsx'
import { partnerName } from './colors'

// fmt de fecha para planilla: dejamos el ISO tal cual (YYYY-MM-DD), es claro y ordenable.
function buildRows(tasks, projects, partners) {
  const projById = Object.fromEntries(projects.map((p) => [p.id, p]))
  return tasks
    .slice()
    .sort((a, b) => {
      const pa = projById[a.project_id]?.name || ''
      const pb = projById[b.project_id]?.name || ''
      if (pa !== pb) return pa.localeCompare(pb)
      return (a.sort_order || 0) - (b.sort_order || 0)
    })
    .map((t) => ({
      Proyecto: projById[t.project_id]?.name || '',
      'Market Launch': projById[t.project_id]?.market_launch || '',
      Accion: t.action_name || '',
      Partner: partnerName(partners, t.partner_id, ''),
      'Inicio plan': t.planned_start || '',
      'Fin plan': t.planned_end || '',
      'Dias SLA': t.planned_days ?? '',
      'Inicio real': t.actual_start || '',
      'Fin real': t.actual_end || '',
      'Delta dias': t.delayDays || 0,
      Razon: t.delay_reason || '',
    }))
}

function download(rows, sheetName, filename) {
  const ws = XLSX.utils.json_to_sheet(rows)
  // Anchos de columna comodos.
  ws['!cols'] = [
    { wch: 22 }, { wch: 13 }, { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
    { wch: 9 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 48 },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))
  XLSX.writeFile(wb, filename)
}

export function exportGlobal(tasks, projects, partners) {
  const rows = buildRows(tasks, projects, partners)
  download(rows, 'Todos los proyectos', 'web-manager-hub_global.xlsx')
}

export function exportProject(project, tasks, projects, partners) {
  const rows = buildRows(
    tasks.filter((t) => t.project_id === project.id),
    projects,
    partners
  )
  const safe = (project.name || 'proyecto').replace(/[^\w\-]+/g, '_')
  download(rows, project.name || 'Proyecto', `web-manager-hub_${safe}.xlsx`)
}
