// Logica derivada: deteccion de solapamientos por partner y calculo de retrasos.
// Todo se mide en DIAS HABILES (sin fines de semana ni feriados del partner).
import {
  plannedEnd, businessDaysBetween, hasBusinessDayInRange,
  rangesOverlap, daysBetween,
} from './dates'

// Enriquece una task con planned_end (dias habiles) y su delta de atraso (dias habiles).
export function withDerived(task, holidays) {
  const pEnd = plannedEnd(task.planned_start, task.planned_days, holidays)
  // Retraso: dias habiles que actual_end supera a planned_end.
  let delayDays = 0
  if (task.actual_end && daysBetween(pEnd, task.actual_end) > 0) {
    delayDays = businessDaysBetween(pEnd, task.actual_end, holidays)
  }
  return { ...task, planned_end: pEnd, delayDays, isDelayed: delayDays > 0 }
}

// Enriquece todas las tasks usando los feriados del partner de cada una.
export function enrich(tasks, holidaysByPartner) {
  return tasks.map((t) => withDerived(t, holidaysByPartner?.get(t.partner_id)))
}

function maxISO(a, b) {
  return daysBetween(a, b) >= 0 ? b : a
}
function minISO(a, b) {
  return daysBetween(a, b) >= 0 ? a : b
}

// Solapamiento: mismo partner, proyectos DISTINTOS, y la interseccion de sus rangos
// planificados contiene al menos un dia HABIL (los findes/feriados no cuentan).
export function detectOverlaps(enriched, holidaysByPartner) {
  const list = enriched.filter((t) => t.partner_id && t.planned_start && t.planned_days)
  const pairs = []
  const conflictIds = new Set()

  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]
      const b = list[j]
      if (a.partner_id !== b.partner_id) continue
      if (a.project_id === b.project_id) continue
      if (!rangesOverlap(a.planned_start, a.planned_end, b.planned_start, b.planned_end)) continue
      const s = maxISO(a.planned_start, b.planned_start)
      const e = minISO(a.planned_end, b.planned_end)
      const hol = holidaysByPartner?.get(a.partner_id)
      if (!hasBusinessDayInRange(s, e, hol)) continue
      pairs.push({ a, b, partner_id: a.partner_id })
      conflictIds.add(a.id)
      conflictIds.add(b.id)
    }
  }
  return { pairs, conflictIds }
}

// Lista de tasks retrasadas (ya enriquecidas).
export function detectDelays(enriched) {
  return enriched.filter((t) => t.isDelayed)
}
