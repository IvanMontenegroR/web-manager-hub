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

// --- Dias habiles ---
// Un dia es habil si no es fin de semana y no es feriado del partner (Set de ISO).
export function isBusinessDay(iso, holidays) {
  return !isWeekendISO(iso) && !(holidays && holidays.has(iso))
}

// Devuelve el ISO del n-esimo dia habil contando desde startISO (inclusive).
// Si start cae en fin de semana/feriado, no cuenta y se avanza.
export function addBusinessDays(startISO, n, holidays) {
  let count = 0
  let cur = startISO
  for (let i = 0; i < 100000; i++) {
    if (isBusinessDay(cur, holidays)) {
      count += 1
      if (count >= n) return cur
    }
    cur = addDaysISO(cur, 1)
  }
  return cur
}

// Cantidad de dias habiles en el rango (from, to]  (excluye from, incluye to).
// 0 si to <= from. Usado para medir el retraso en dias habiles.
export function businessDaysBetween(fromISO, toISO_, holidays) {
  if (!fromISO || !toISO_ || daysBetween(fromISO, toISO_) <= 0) return 0
  let count = 0
  let cur = addDaysISO(fromISO, 1)
  while (daysBetween(cur, toISO_) >= 0) {
    if (isBusinessDay(cur, holidays)) count += 1
    cur = addDaysISO(cur, 1)
  }
  return count
}

// Hay al menos un dia habil en el rango [sISO, eISO] (inclusive)?
export function hasBusinessDayInRange(sISO, eISO, holidays) {
  let cur = sISO
  while (daysBetween(cur, eISO) >= 0) {
    if (isBusinessDay(cur, holidays)) return true
    cur = addDaysISO(cur, 1)
  }
  return false
}

// planned_end en DIAS HABILES: el planned_days-esimo dia habil desde planned_start.
// (La columna generada en Postgres es de dias calendario y se ignora: la UI usa esta.)
export function plannedEnd(planned_start, planned_days, holidays) {
  if (!planned_start || !planned_days) return planned_start
  return addBusinessDays(planned_start, planned_days, holidays)
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
