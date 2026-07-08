// Utilidades de fecha para el Gantt. Trabajamos con fechas "puras" (YYYY-MM-DD)
// sin zona horaria: las parseamos a mediodia UTC para evitar corrimientos de dia.
import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  isWeekend as dfIsWeekend,
} from 'date-fns'

// Parsea 'YYYY-MM-DD' a Date estable (mediodia local, sin saltos por TZ).
export function parseDay(iso) {
  if (!iso) return null
  // parseISO de 'YYYY-MM-DD' da medianoche local; sirve para comparar dias.
  return parseISO(iso)
}

// Formatea un Date a 'YYYY-MM-DD'.
export function toISO(date) {
  return format(date, 'yyyy-MM-dd')
}

// Suma dias a una fecha ISO y devuelve ISO.
export function addDaysISO(iso, n) {
  return toISO(addDays(parseDay(iso), n))
}

// planned_end = planned_start + planned_days - 1 (misma logica que la columna generada).
export function plannedEnd(planned_start, planned_days) {
  if (!planned_start || !planned_days) return planned_start
  return addDaysISO(planned_start, planned_days - 1)
}

// Dias de calendario entre dos ISO (b - a). Mismo dia = 0.
export function daysBetween(aISO, bISO) {
  return differenceInCalendarDays(parseDay(bISO), parseDay(aISO))
}

// Cantidad de dias inclusivos entre a y b (a..b). Mismo dia = 1.
export function inclusiveSpan(aISO, bISO) {
  return daysBetween(aISO, bISO) + 1
}

// Dos rangos [aStart,aEnd] y [bStart,bEnd] (inclusivos) se intersectan.
export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return daysBetween(aStart, bEnd) >= 0 && daysBetween(bStart, aEnd) >= 0
}

export function isWeekendISO(iso) {
  return dfIsWeekend(parseDay(iso))
}

// Genera un array de ISO desde start hasta end inclusive.
export function eachDayISO(startISO, endISO) {
  const out = []
  const total = inclusiveSpan(startISO, endISO)
  for (let i = 0; i < total; i++) out.push(addDaysISO(startISO, i))
  return out
}

// Formato corto para tooltips y paneles: '01 jul'.
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export function fmtCorto(iso) {
  if (!iso) return '-'
  const d = parseDay(iso)
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]}`
}

export function fmtLargo(iso) {
  if (!iso) return '-'
  const d = parseDay(iso)
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}
