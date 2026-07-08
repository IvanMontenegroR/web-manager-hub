// Logica derivada: deteccion de solapamientos por partner y calculo de retrasos.
import { plannedEnd, rangesOverlap, daysBetween } from './dates'

// Enriquece cada task con planned_end calculado y su delta de atraso.
export function withDerived(task) {
  const pEnd = plannedEnd(task.planned_start, task.planned_days)
  // Retraso: actual_end supera planned_end. delta = magnitud en dias.
  let delayDays = 0
  if (task.actual_end && daysBetween(pEnd, task.actual_end) > 0) {
    delayDays = daysBetween(pEnd, task.actual_end)
  }
  return { ...task, planned_end: pEnd, delayDays, isDelayed: delayDays > 0 }
}

// Solapamiento: mismo partner, proyectos DISTINTOS, rangos planificados que se pisan.
// Devuelve pares de conflicto y un Set con los ids de tasks en conflicto.
export function detectOverlaps(tasks) {
  const enriched = tasks.map(withDerived).filter((t) => t.partner_id && t.planned_start && t.planned_days)
  const pairs = []
  const conflictIds = new Set()

  for (let i = 0; i < enriched.length; i++) {
    for (let j = i + 1; j < enriched.length; j++) {
      const a = enriched[i]
      const b = enriched[j]
      if (a.partner_id !== b.partner_id) continue
      if (a.project_id === b.project_id) continue
      if (rangesOverlap(a.planned_start, a.planned_end, b.planned_start, b.planned_end)) {
        pairs.push({ a, b, partner_id: a.partner_id })
        conflictIds.add(a.id)
        conflictIds.add(b.id)
      }
    }
  }
  return { pairs, conflictIds }
}

// Lista de tasks retrasadas (con planned_end / actual_end / delta).
export function detectDelays(tasks) {
  return tasks.map(withDerived).filter((t) => t.isDelayed)
}
