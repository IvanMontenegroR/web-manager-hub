// Proyeccion (forecast) NO destructiva del arrastre de atrasos por dependencias.
// El baseline (planned_start/planned_days) nunca se toca. Aca calculamos, por tarea:
//   projStart / projEnd : donde caeria realmente segun el avance real de sus predecesoras
//   effEnd              : fin efectivo usado para empujar a las siguientes
//   pushed / pushedBy   : si la empujo una predecesora, y cual (accountability)
import { plannedEnd, addBusinessDays, addDaysISO, daysBetween } from './dates'

// Primer dia habil DESPUES de iso (para el calendario de la tarea sucesora).
function nextBusinessDay(iso, holidays) {
  return addBusinessDays(addDaysISO(iso, 1), 1, holidays)
}

// tasks: array de tasks enriquecidas (con planned_end y holidaysSet). todayISO: hoy.
// Devuelve Map task.id -> { projStart, projEnd, effEnd, pushed, pushedBy }.
export function computeProjection(tasks, todayISO) {
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const memo = new Map()
  const stack = new Set()

  function eff(t) {
    if (memo.has(t.id)) return memo.get(t.id)
    // Guarda anti-ciclos: si volvemos a entrar, caemos al baseline.
    if (stack.has(t.id)) {
      const base = {
        projStart: t.planned_start,
        projEnd: t.planned_end,
        effEnd: t.actual_end || t.planned_end,
        pushed: false,
        pushedBy: null,
        pulled: false,
        firm: !!t.actual_end,
      }
      return base
    }
    stack.add(t.id)

    // Fin efectivo mas tardio entre las predecesoras. `bindingFirm` = si esa
    // predecesora que manda YA cerro de verdad (actual_end); solo asi se adelanta.
    let predEnd = null
    let pushedBy = null
    let bindingFirm = false
    for (const depId of Array.isArray(t.depends_on) ? t.depends_on : []) {
      const dep = byId.get(depId)
      if (!dep) continue
      const de = eff(dep)
      if (de.effEnd && (!predEnd || daysBetween(predEnd, de.effEnd) > 0)) {
        predEnd = de.effEnd
        pushedBy = dep.id
        bindingFirm = de.firm
      }
    }

    // Inicio proyectado. Si la tarea YA empezo, su inicio real es un hecho.
    // Si no empezo: se EMPUJA al dia habil siguiente al fin de la predecesora
    // (siempre que caiga despues del baseline); o se ADELANTA si la predecesora
    // ya cerro antes (solo con entrega real, para no romper el worst-case).
    let projStart = t.planned_start
    let pushed = false
    let pulled = false
    if (t.actual_start) {
      projStart = t.actual_start
    } else if (predEnd) {
      const earliest = nextBusinessDay(predEnd, t.holidaysSet)
      const delta = daysBetween(projStart, earliest) // earliest - baseline
      if (delta > 0) {
        projStart = earliest
        pushed = true
      } else if (delta < 0 && bindingFirm) {
        projStart = earliest
        pulled = true
      }
    }
    if (!pushed && !pulled) pushedBy = null

    // Fin proyectado y fin efectivo (para empujar a las siguientes).
    let projEnd
    let effEnd
    if (t.actual_end) {
      projEnd = t.actual_end
      effEnd = t.actual_end
    } else {
      projEnd = plannedEnd(projStart, t.planned_days, t.holidaysSet)
      // Una tarea abierta no puede terminar antes de hoy: si esta vencida, empuja desde hoy.
      effEnd = daysBetween(projEnd, todayISO) > 0 ? todayISO : projEnd
    }

    const res = { projStart, projEnd, effEnd, pushed, pushedBy, pulled, firm: !!t.actual_end }
    memo.set(t.id, res)
    stack.delete(t.id)
    return res
  }

  const out = new Map()
  for (const t of tasks) out.set(t.id, eff(t))
  return out
}
