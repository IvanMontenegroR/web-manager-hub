// Export "client-facing": un Gantt VISUAL en Excel (celdas coloreadas que forman las
// barras), con findes/feriados sombreados, ASSIGNED TO y STATUS con color, bandas de
// mes/dia, y plan (fantasma) vs real/proyectado. Usa ExcelJS (soporta estilos de celda).
import ExcelJS from 'exceljs'
import { eachDayISO, isWeekendISO, parseDay, daysBetween } from './dates'
import { partnerColor, partnerName, textOn, statusColor } from './colors'

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
const DOW = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

// #RRGGBB -> 'FFRRGGBB' (ExcelJS ARGB). Sin '#' o invalido -> gris.
function argb(hex, fallback = 'FF9AA0A6') {
  if (!hex) return fallback
  const h = hex.replace('#', '').trim()
  if (h.length !== 6) return fallback
  return ('FF' + h).toUpperCase()
}

// Fills de las barras (tono suave para que sea legible como documento).
const BAR = {
  Completado: 'FF9BD3AE', // verde suave
  'En curso': 'FF9DC3F0', // azul suave
  Pendiente: 'FFD3D7DC', // gris suave
}
const OVERRUN = 'FFE7A6A0' // rojo/salmon: tramo de atraso (real pasa el plan)
const GHOST = 'FFF1F1F1' // plan original donde la realidad se corrio
const NONWORK = 'FFDDDDDD' // finde / feriado
const HEADER_BG = 'FF548235' // verde encabezado
const GRID = 'FFDCDCDC'

const thin = { style: 'thin', color: { argb: GRID } }
const border = { top: thin, left: thin, bottom: thin, right: thin }

const CHECK = 'FF1E7A3D' // verde fuerte para el check de GO-Live

function barFill(status) {
  return BAR[status] || BAR.Pendiente
}

// Detecta la tarea de lanzamiento por nombre: "GO-Live", "Go Live", "GoLive", "GO LIVE".
function isGoLive(name) {
  return /go[\s_-]*live/i.test(name || '')
}

// Leyenda de colores debajo de las tareas (columnas congeladas 1-2, siempre visibles).
function buildLegend(ws, startRow) {
  const items = [
    ['Completado', BAR.Completado],
    ['En curso', BAR['En curso']],
    ['Pendiente', BAR.Pendiente],
    ['Atraso (la realidad supera el plan)', OVERRUN],
    ['Plan original (si la realidad se corrio)', GHOST],
    ['Finde / feriado (no laboral)', NONWORK],
  ]
  const titleCell = ws.getCell(startRow, 1)
  titleCell.value = 'REFERENCIAS'
  titleCell.font = { bold: true, size: 9 }
  titleCell.alignment = { vertical: 'middle' }

  items.forEach((it, i) => {
    const row = startRow + 1 + i
    const label = ws.getCell(row, 1)
    label.value = it[0]
    label.font = { size: 9 }
    label.alignment = { vertical: 'middle' }
    const sw = ws.getCell(row, 2)
    sw.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: it[1] } }
    sw.border = border
  })

  // GO-Live: check verde.
  const glRow = startRow + 1 + items.length
  const glLabel = ws.getCell(glRow, 1)
  glLabel.value = 'GO-Live del mercado'
  glLabel.font = { size: 9 }
  glLabel.alignment = { vertical: 'middle' }
  const glSw = ws.getCell(glRow, 2)
  glSw.value = '✔'
  glSw.font = { bold: true, size: 12, color: { argb: CHECK } }
  glSw.alignment = { horizontal: 'center', vertical: 'middle' }
  glSw.border = border
}

// Rango de dias a dibujar para un set de tareas de un proyecto.
function dateRange(tasks, project) {
  const ds = []
  for (const t of tasks) {
    for (const k of ['planned_start', 'planned_end', 'renderStart', 'renderEnd', 'delayEnd', 'actual_start', 'actual_end']) {
      if (t[k]) ds.push(t[k])
    }
  }
  if (project?.market_launch) ds.push(project.market_launch)
  if (project?.start_date) ds.push(project.start_date)
  if (ds.length === 0) return null
  let min = ds[0], max = ds[0]
  for (const d of ds) {
    if (daysBetween(d, min) > 0) min = d
    if (daysBetween(max, d) > 0) max = d
  }
  // 1 dia de aire a cada lado.
  return eachDayISO(min, max)
}

function safeSheetName(name, idx) {
  const clean = (name || `Proyecto ${idx + 1}`).replace(/[\\/*?:[\]]/g, ' ').trim()
  return (clean || `Proyecto ${idx + 1}`).slice(0, 31)
}

// Dibuja una hoja con el Gantt de un proyecto.
function buildSheet(wb, project, tasks, partners, idx) {
  const ws = wb.addWorksheet(safeSheetName(project.name, idx), {
    views: [{ state: 'frozen', xSplit: 3, ySplit: 3 }],
  })
  const days = dateRange(tasks, project) || eachDayISO(project.start_date || '2026-01-01', project.start_date || '2026-01-01')
  const C0 = 4 // primera columna de dia (A=1 TASK, B=2 ASSIGNED TO, C=3 STATUS)

  // Anchos
  ws.getColumn(1).width = 42
  ws.getColumn(2).width = 16
  ws.getColumn(3).width = 14
  for (let i = 0; i < days.length; i++) ws.getColumn(C0 + i).width = 3.4

  // --- Encabezado ---
  // Fila 1-2 izquierda: titulo + fecha de inicio (bloque verde)
  ws.mergeCells(1, 1, 2, 3)
  const title = ws.getCell(1, 1)
  title.value = `${project.name}${project.start_date ? '\n' + project.start_date : ''}`
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }
  title.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 }
  title.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }

  // Fila 3 izquierda: headers de columnas
  const heads = ['TASK', 'ASSIGNED TO', 'STATUS']
  heads.forEach((h, i) => {
    const c = ws.getCell(3, 1 + i)
    c.value = h
    c.font = { bold: true, size: 9 }
    c.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' }
    c.border = border
  })

  // Bandas de mes (fila 1), numero de dia (fila 2), DOW (fila 3)
  let mStart = 0
  for (let i = 0; i <= days.length; i++) {
    const cur = i < days.length ? parseDay(days[i]) : null
    const prev = i > 0 ? parseDay(days[i - 1]) : null
    const boundary = i === days.length || (prev && cur && (cur.getMonth() !== prev.getMonth() || cur.getFullYear() !== prev.getFullYear()))
    if (boundary && i > 0) {
      const c1 = C0 + mStart
      const c2 = C0 + i - 1
      if (c2 >= c1) ws.mergeCells(1, c1, 1, c2)
      const mc = ws.getCell(1, c1)
      mc.value = `${MESES[prev.getMonth()]} ${prev.getFullYear()}`
      mc.font = { bold: true, size: 9 }
      mc.alignment = { horizontal: 'center', vertical: 'middle' }
      mc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }
      mc.border = border
      mStart = i
    }
  }
  days.forEach((iso, i) => {
    const d = parseDay(iso)
    const wknd = isWeekendISO(iso)
    const col = C0 + i
    const numCell = ws.getCell(2, col)
    numCell.value = d.getDate()
    numCell.font = { size: 8 }
    numCell.alignment = { horizontal: 'center', vertical: 'middle' }
    numCell.border = border
    const dowCell = ws.getCell(3, col)
    dowCell.value = DOW[d.getDay()]
    dowCell.font = { size: 7, color: { argb: 'FF888888' } }
    dowCell.alignment = { horizontal: 'center', vertical: 'middle' }
    dowCell.border = border
    if (wknd) {
      const f = { type: 'pattern', pattern: 'solid', fgColor: { argb: NONWORK } }
      numCell.fill = f
      dowCell.fill = f
    }
  })

  // --- Filas de tareas ---
  const sorted = [...tasks].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  sorted.forEach((t, r) => {
    const row = 4 + r
    // TASK
    const nameCell = ws.getCell(row, 1)
    nameCell.value = t.action_name || ''
    nameCell.font = { size: 9 }
    nameCell.alignment = { vertical: 'middle', wrapText: false }
    nameCell.border = border
    // ASSIGNED TO (color del partner)
    const pColor = argb(partnerColor(partners, t.partner_id))
    const atCell = ws.getCell(row, 2)
    atCell.value = partnerName(partners, t.partner_id, '—')
    atCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: pColor } }
    atCell.font = { bold: true, size: 9, color: { argb: argb(textOn('#' + pColor.slice(2))) } }
    atCell.alignment = { horizontal: 'center', vertical: 'middle' }
    atCell.border = border
    // STATUS (color por estado)
    const sColor = argb(statusColor(t.status))
    const stCell = ws.getCell(row, 3)
    stCell.value = t.status || ''
    stCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sColor } }
    stCell.font = { bold: true, size: 9, color: { argb: argb(textOn('#' + sColor.slice(2))) } }
    stCell.alignment = { horizontal: 'center', vertical: 'middle' }
    stCell.border = border

    // Barras por dia
    const realEnd = t.isDelayed ? t.delayEnd : t.renderEnd
    days.forEach((iso, i) => {
      const col = C0 + i
      const cell = ws.getCell(row, col)
      cell.border = border
      const nonWorking = isWeekendISO(iso) || (t.holidaysSet && t.holidaysSet.has(iso))
      const inReal = t.renderStart && realEnd && iso >= t.renderStart && iso <= realEnd
      const inPlan = t.planned_start && t.planned_end && iso >= t.planned_start && iso <= t.planned_end
      const isOverrun = t.isDelayed && t.planned_end && t.delayEnd && iso > t.planned_end && iso <= t.delayEnd
      let fill = null
      if (nonWorking) fill = NONWORK
      else if (isOverrun) fill = OVERRUN
      else if (inReal) fill = barFill(t.status)
      else if (inPlan) fill = GHOST
      if (fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }
    })

    // GO-Live: check verde en el nombre y en el dia exacto del lanzamiento.
    if (isGoLive(t.action_name)) {
      nameCell.value = {
        richText: [
          { text: '✔ ', font: { bold: true, color: { argb: CHECK } } },
          { text: t.action_name || '', font: { size: 9 } },
        ],
      }
      const goLiveDay = t.actual_end || realEnd || t.planned_end
      const gi = goLiveDay ? days.indexOf(goLiveDay) : -1
      if (gi >= 0) {
        const gcell = ws.getCell(row, C0 + gi)
        gcell.value = '✔'
        gcell.font = { bold: true, size: 11, color: { argb: CHECK } }
        gcell.alignment = { horizontal: 'center', vertical: 'middle' }
      }
    }
  })

  // Leyenda de colores (una fila de aire debajo de la ultima tarea).
  buildLegend(ws, 4 + sorted.length + 1)

  ws.getRow(1).height = 20
  return ws
}

async function download(wb, filename) {
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Exporta TODOS los proyectos (no archivados) -> una hoja por proyecto.
export async function exportGlobal(enriched, projects, partners) {
  const wb = new ExcelJS.Workbook()
  const active = projects.filter((p) => !p.archived)
  active.forEach((project, idx) => {
    const tasks = enriched.filter((t) => t.project_id === project.id)
    buildSheet(wb, project, tasks, partners, idx)
  })
  if (active.length === 0) buildSheet(wb, { name: 'Sin proyectos' }, [], partners, 0)
  await download(wb, 'web-manager-hub_timeline.xlsx')
}

// Exporta UN proyecto.
export async function exportProject(project, enriched, partners) {
  const wb = new ExcelJS.Workbook()
  const tasks = enriched.filter((t) => t.project_id === project.id)
  buildSheet(wb, project, tasks, partners, 0)
  const safe = (project.name || 'proyecto').replace(/[^\w\-]+/g, '_')
  await download(wb, `web-manager-hub_${safe}.xlsx`)
}
