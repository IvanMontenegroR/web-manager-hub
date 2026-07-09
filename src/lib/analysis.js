// Logica derivada: deteccion de solapamientos por partner y calculo de retrasos.
// Todo se mide en DIAS HABILES (sin fines de semana ni feriados del partner).
import {
  plannedEnd, businessDaysBetween, hasBusinessDayInRange,
  rangesOverlap, daysBetween,
} from './dates'

// Enriquece una task con planned_end (dias habiles) y su delta de atraso (dias habiles).
// Atraso = cerro tarde (actual_end > planned_end) O sigue abierta y ya paso su fin
// planeado (se mide contra HOY). Ambos son "atraso" y se tratan/pintan igual.
export function withDerived(task, holidays, today) {
  const pEnd = plannedEnd(task.planned_start, task.planned_days, holidays)
  // Fin de referencia: si cerro, su fin real; si ya arranco (en curso) y sigue abierta
  // y vencida, HOY. Una tarea que NO arranco no es "atraso propio": su demora es
  // heredada (la predecesora) y se ve como forecast, no como retraso rojo.
  const started = !!task.actual_start || task.status === 'En curso'
  const openOverdue = started && !task.actual_end && !!today && daysBetween(pEnd, today) > 0
  const delayRef = task.actual_end || (openOverdue ? today : null)
  let delayDays = 0
  let delayEnd = null
  if (delayRef && daysBetween(pEnd, delayRef) > 0) {
    delayDays = businessDaysBetween(pEnd, delayRef, holidays)
    delayEnd = delayRef
  }
  return { ...task, planned_end: pEnd, delayDays, isDelayed: delayDays > 0, delayEnd }
}

function maxISO(a, b) {
  return daysBetween(a, b) >= 0 ? b : a
}
function minISO(a, b) {
  return daysBetween(a, b) >= 0 ? a : b
}

// Solapamiento: mismo partner, proyectos DISTINTOS, y la interseccion de sus rangos
// REALES/proyectados (renderStart..renderEnd) contiene al menos un dia HABIL (los
// findes/feriados no cuentan). Usa el set de feriados efectivo (a.holidaysSet).
export function detectOverlaps(enriched) {
  const list = enriched.filter((t) => t.partner_id && t.planned_start && t.planned_days)
  const pairs = []
  const conflictIds = new Set()
  const s0 = (t) => t.renderStart || t.planned_start
  const e0 = (t) => t.renderEnd || t.planned_end

  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]
      const b = list[j]
      if (a.partner_id !== b.partner_id) continue
      if (a.project_id === b.project_id) continue
      if (!rangesOverlap(s0(a), e0(a), s0(b), e0(b))) continue
      const s = maxISO(s0(a), s0(b))
      const e = minISO(e0(a), e0(b))
      if (!hasBusinessDayInRange(s, e, a.holidaysSet)) continue
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
