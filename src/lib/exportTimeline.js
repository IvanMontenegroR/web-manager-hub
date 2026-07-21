// Export "client-facing": un Gantt VISUAL en Excel (celdas coloreadas que forman las
// barras), findes/feriados con rayas negras, ASSIGNED TO y STATUS con color, bandas de
// mes/dia. Brandeado Purina (negro + rojo de marca, con logo). Usa ExcelJS.
import ExcelJS from 'exceljs'
import { eachDayISO, isWeekendISO, parseDay, daysBetween, toISO } from './dates'
import { partnerColor, partnerName, textOn } from './colors'
import { PURINA_LOGO_B64 } from './purinaLogo'

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
const DOW = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

// #RRGGBB -> 'FFRRGGBB' (ExcelJS ARGB). Sin '#' o invalido -> gris.
function argb(hex, fallback = 'FF9AA0A6') {
  if (!hex) return fallback
  const h = hex.replace('#', '').trim()
  if (h.length !== 6) return fallback
  return ('FF' + h).toUpperCase()
}

// Fills de las barras (tono suave, misma tonalidad entre los tres).
const BAR = {
  Completado: 'FF9BD3AE', // verde suave
  'En curso': 'FF9DC3F0', // azul suave
  Pendiente: 'FFEED98C', // amarillo suave (misma tonalidad que verde/azul)
}
const OVERRUN = 'FFE7A6A0' // rojo/salmon: tramo de atraso (real pasa el plan)
const PURINA_RED = 'FFED1C24' // rojo de marca
const BRAND_BG = 'FF000000' // negro del logo
const GREEN = 'FF1E7A3D' // check y linea de GO-LIVE
const TODAY_LINE = 'FF7C3AED' // linea del dia de hoy (violeta, distinta del verde/rojo)
const GRID = 'FFBEBEBE'

const thin = { style: 'thin', color: { argb: GRID } }
const border = { top: thin, left: thin, bottom: thin, right: thin }
const medGreen = { style: 'medium', color: { argb: GREEN } }
const medToday = { style: 'medium', color: { argb: TODAY_LINE } }

// Finde / feriado: negro con rayas diagonales (no gris).
const NONWORK_FILL = { type: 'pattern', pattern: 'darkDown', fgColor: { argb: 'FF000000' }, bgColor: { argb: 'FFFFFFFF' } }
const solidFill = (a) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: a } })

function barFill(status) {
  return BAR[status] || BAR.Pendiente
}

// Superpone un borde vertical de color a una celda sin perder el resto del borde fino.
function vLine(cell, side) {
  cell.border = { ...(cell.border || border), left: side, right: side }
}

// Detecta la tarea de lanzamiento por nombre: "GO-Live", "Go Live", "GoLive", "GO LIVE".
function isGoLive(name) {
  return /go[\s_-]*live/i.test(name || '')
}

// Leyenda de colores debajo de las tareas (columnas congeladas 1-2, siempre visibles).
function buildLegend(ws, startRow) {
  const items = [
    ['Completado', solidFill(BAR.Completado)],
    ['En curso', solidFill(BAR['En curso'])],
    ['Pendiente', solidFill(BAR.Pendiente)],
    ['Atraso', solidFill(OVERRUN)],
    ['Finde / feriado (no laboral)', NONWORK_FILL],
  ]
  const titleCell = ws.getCell(startRow, 1)
  titleCell.value = 'REFERENCIAS'
  titleCell.font = { bold: true, size: 9 }
  titleCell.alignment = { vertical: 'middle' }
  titleCell.border = border

  items.forEach((it, i) => {
    const row = startRow + 1 + i
    const label = ws.getCell(row, 1)
    label.value = it[0]
    label.font = { size: 9 }
    label.alignment = { vertical: 'middle' }
    label.border = border
    const sw = ws.getCell(row, 2)
    sw.fill = it[1]
    sw.border = border
  })

  // GO-LIVE: check verde + linea verde.
  const glRow = startRow + 1 + items.length
  const glLabel = ws.getCell(glRow, 1)
  glLabel.value = 'GO-LIVE (linea verde)'
  glLabel.font = { size: 9 }
  glLabel.alignment = { vertical: 'middle' }
  glLabel.border = border
  const glSw = ws.getCell(glRow, 2)
  glSw.value = '✔'
  glSw.font = { bold: true, size: 13, color: { argb: GREEN } }
  glSw.alignment = { horizontal: 'center', vertical: 'middle' }
  glSw.border = { ...border, left: medGreen, right: medGreen }

  // HOY: linea violeta.
  const hoyRow = glRow + 1
  const hoyLabel = ws.getCell(hoyRow, 1)
  hoyLabel.value = 'Hoy (linea violeta)'
  hoyLabel.font = { size: 9 }
  hoyLabel.alignment = { vertical: 'middle' }
  hoyLabel.border = border
  const hoySw = ws.getCell(hoyRow, 2)
  hoySw.border = { ...border, left: medToday, right: medToday }
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

// Dibuja una hoja con el Gantt de un proyecto. week = columnas mas angostas y solo
// se etiquetan los lunes (espeja el modo "Semanas" del cronograma).
function buildSheet(wb, project, tasks, partners, idx, week = false) {
  const ws = wb.addWorksheet(safeSheetName(project.name, idx), {
    views: [{ state: 'frozen', xSplit: 3, ySplit: 3 }],
  })
  const days = dateRange(tasks, project) || eachDayISO(project.start_date || '2026-01-01', project.start_date || '2026-01-01')
  const C0 = 4 // primera columna de dia (A=1 TASK, B=2 ASSIGNED TO, C=3 STATUS)

  // Anchos
  ws.getColumn(1).width = 42
  ws.getColumn(2).width = 16
  ws.getColumn(3).width = 14
  const dayW = week ? 1.6 : 3.4
  for (let i = 0; i < days.length; i++) ws.getColumn(C0 + i).width = dayW

  // --- Encabezado con branding Purina + logo ---
  // Fila 1 izquierda (cols 1-3): banda negra con el logo.
  ws.mergeCells(1, 1, 1, 3)
  const brand = ws.getCell(1, 1)
  brand.fill = solidFill(BRAND_BG)
  brand.border = { top: { style: 'thin', color: { argb: PURINA_RED } }, left: { style: 'thin', color: { argb: PURINA_RED } }, bottom: thin, right: thin }
  ws.getRow(1).height = 26
  try {
    const imgId = wb.addImage({ base64: PURINA_LOGO_B64, extension: 'png' })
    ws.addImage(imgId, { tl: { col: 0.12, row: 0.12 }, ext: { width: 168, height: 30 } })
  } catch { /* si falla la imagen, queda la banda negra */ }

  // Fila 2 izquierda (cols 1-3): nombre del proyecto.
  ws.mergeCells(2, 1, 2, 3)
  const title = ws.getCell(2, 1)
  title.value = `${project.name}${project.start_date ? '   ·   ' + project.start_date : ''}`
  title.fill = solidFill(BRAND_BG)
  title.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  title.alignment = { horizontal: 'left', vertical: 'middle' }
  title.border = border

  // Fila 3 izquierda: headers de columnas
  const heads = ['TASK', 'ASSIGNED TO', 'STATUS']
  heads.forEach((h, i) => {
    const c = ws.getCell(3, 1 + i)
    c.value = h
    c.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } }
    c.fill = solidFill(PURINA_RED)
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
    const isMon = d.getDay() === 1
    const col = C0 + i
    // En modo semana solo se etiquetan los lunes (d/m), en modo dia todos.
    const numCell = ws.getCell(2, col)
    numCell.value = week ? (isMon ? `${d.getDate()}/${d.getMonth() + 1}` : '') : d.getDate()
    numCell.font = { size: 8, bold: week }
    numCell.alignment = { horizontal: week ? 'left' : 'center', vertical: 'middle' }
    numCell.border = border
    const dowCell = ws.getCell(3, col)
    dowCell.value = week ? '' : DOW[d.getDay()]
    dowCell.font = { size: 7, bold: wknd, color: { argb: wknd ? 'FF000000' : 'FF888888' } }
    dowCell.alignment = { horizontal: 'center', vertical: 'middle' }
    dowCell.border = border
  })

  // --- Filas de tareas ---
  const sorted = [...tasks].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  const goLiveCols = new Set()
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
    // STATUS (mismo tono que las barras: verde / azul / amarillo)
    const sBar = barFill(t.status)
    const stCell = ws.getCell(row, 3)
    stCell.value = t.status || ''
    stCell.fill = solidFill(sBar)
    stCell.font = { bold: true, size: 9, color: { argb: argb(textOn('#' + sBar.slice(2))) } }
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
      const isOverrun = t.isDelayed && t.planned_end && t.delayEnd && iso > t.planned_end && iso <= t.delayEnd
      if (nonWorking) cell.fill = NONWORK_FILL
      else if (isOverrun) cell.fill = solidFill(OVERRUN)
      else if (inReal) cell.fill = solidFill(barFill(t.status))
    })

    // GO-LIVE: check VERDE en el nombre y en el dia exacto del lanzamiento.
    if (isGoLive(t.action_name)) {
      nameCell.value = {
        richText: [
          { text: '✔ ', font: { bold: true, color: { argb: GREEN } } },
          { text: t.action_name || '', font: { size: 9 } },
        ],
      }
      const goLiveDay = t.actual_end || realEnd || t.planned_end
      const gi = goLiveDay ? days.indexOf(goLiveDay) : -1
      if (gi >= 0) {
        goLiveCols.add(C0 + gi)
        const gcell = ws.getCell(row, C0 + gi)
        gcell.value = '✔'
        gcell.font = { bold: true, size: 11, color: { argb: GREEN } }
        gcell.alignment = { horizontal: 'center', vertical: 'middle' }
      }
    }
  })

  // --- Lineas verticales: GO-LIVE (verde) y HOY (violeta, fecha real de exportacion) ---
  const lastRow = 3 + sorted.length
  const todayIdx = days.indexOf(toISO(new Date()))
  const todayCol = todayIdx >= 0 ? C0 + todayIdx : -1
  for (let row = 2; row <= lastRow; row++) {
    for (const col of goLiveCols) vLine(ws.getCell(row, col), medGreen)
    if (todayCol > 0 && !goLiveCols.has(todayCol)) vLine(ws.getCell(row, todayCol), medToday)
  }

  // Leyenda de colores (una fila de aire debajo de la ultima tarea).
  buildLegend(ws, 4 + sorted.length + 1)

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

// Limpia un nombre para usarlo como nombre de archivo (sin caracteres invalidos).
function safeFileName(name) {
  return (name || 'Proyecto').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim()
}

// Exporta TODOS los proyectos (no archivados) -> una hoja por proyecto.
// week: dibuja en modo semana (segun el toggle del cronograma).
export async function exportGlobal(enriched, projects, partners, week = false) {
  const wb = new ExcelJS.Workbook()
  const active = projects.filter((p) => !p.archived)
  active.forEach((project, idx) => {
    const tasks = enriched.filter((t) => t.project_id === project.id)
    buildSheet(wb, project, tasks, partners, idx, week)
  })
  if (active.length === 0) buildSheet(wb, { name: 'Sin proyectos' }, [], partners, 0, week)
  await download(wb, 'Gantt Timeline.xlsx')
}

// Exporta UN proyecto. Nombre: "Project Name - Gantt Timeline.xlsx".
export async function exportProject(project, enriched, partners, week = false) {
  const wb = new ExcelJS.Workbook()
  const tasks = enriched.filter((t) => t.project_id === project.id)
  buildSheet(wb, project, tasks, partners, 0, week)
  await download(wb, `${safeFileName(project.name)} - Gantt Timeline.xlsx`)
}
