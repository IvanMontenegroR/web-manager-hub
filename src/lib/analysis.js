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

// Control diario: clasifica las tareas activas relativo a HOY, en DIAS HABILES,
// para saber que hay que controlar. Trabaja SOLO con fechas reales/comprometidas:
// la fecha comprometida del plan (planned_end) para las abiertas y la fecha real de
// cierre (actual_end) para las cerradas. NO usa el forecast/proyeccion: una tarea que
// vencio y se "corrio para adelante" por delays de una predecesora (nunca arranco) no
// es un atraso real, asi que no aparece. Cada tarea usa su propio calendario
// (holidaysSet). Ventanas de 3 dias habiles.
//   - overdueOpen : arrancaron, vencieron su plan (planned_end paso) y siguen abiertas
//                   (atraso propio y real = t.isDelayed). Bloque urgente.
//   - dueToday    : abiertas cuyo fin PLANEADO cae HOY.
//   - upcoming    : abiertas cuyo fin PLANEADO cae en los proximos 1..3 dias habiles.
//   - recentlyDone: cerradas en los ultimos 0..3 dias habiles (0 = cerro hoy).
export function buildDailyControl(enriched, today) {
  const overdueOpen = []
  const dueToday = []
  const upcoming = []
  const recentlyDone = []
  if (!today) return { overdueOpen, dueToday, upcoming, recentlyDone }

  for (const t of enriched) {
    if (!t.planned_start || !t.planned_end) continue
    const hol = t.holidaysSet

    // Cerrada: bucket por la fecha REAL de cierre.
    if (t.actual_end) {
      if (daysBetween(t.actual_end, today) < 0) continue // cierre en el futuro (dato raro)
      const backDays = businessDaysBetween(t.actual_end, today, hol) // 0 = hoy
      if (backDays <= 3) recentlyDone.push({ ...t, backDays })
      continue
    }

    // Abierta: SIEMPRE contra la fecha comprometida (planned_end), nunca el forecast.
    const diff = daysBetween(today, t.planned_end) // >0 futuro, 0 hoy, <0 ya paso
    if (diff < 0) {
      // Vencio el plan. Solo cuenta como atraso REAL si la tarea arranco (t.isDelayed).
      // Si no arranco, su demora es heredada (la corrio una predecesora): no se muestra.
      if (t.isDelayed) overdueOpen.push({ ...t, overDays: businessDaysBetween(t.planned_end, today, hol) })
    } else if (diff === 0) {
      dueToday.push({ ...t, started: !!t.actual_start || t.status === 'En curso' })
    } else {
      const aheadDays = businessDaysBetween(today, t.planned_end, hol)
      if (aheadDays >= 1 && aheadDays <= 3) upcoming.push({ ...t, aheadDays })
    }
  }

  overdueOpen.sort((a, b) => b.overDays - a.overDays)
  upcoming.sort((a, b) => a.aheadDays - b.aheadDays || daysBetween(b.planned_end, a.planned_end))
  recentlyDone.sort((a, b) => a.backDays - b.backDays)
  return { overdueOpen, dueToday, upcoming, recentlyDone }
}
