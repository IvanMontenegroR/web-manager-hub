// Export "client-facing": un Gantt VISUAL en Excel (celdas coloreadas que forman las
// barras), findes/feriados con rayas negras, ASSIGNED TO y STATUS con color, bandas de
// mes/dia. Brandeado Purina (negro + rojo de marca, con logo). Usa ExcelJS.
import ExcelJS from 'exceljs'
import { eachDayISO, isWeekendISO, parseDay, daysBetween, toISO, fmtLargo } from './dates'
import { partnerColor, partnerName, textOn } from './colors'
import { countryName } from './countries'
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

// Fills de las barras (tono calido suave, misma tonalidad entre los tres).
const BAR = {
  Completado: 'FFC6E6C0', // verde suave (mismo tono calido)
  'En curso': 'FFF7C7AC', // durazno
  Pendiente: 'FFFBE2D5', // durazno claro
}
const PURINA_RED = 'FFED1C24' // rojo de marca
const BRAND_BG = 'FF000000' // negro del logo
const GREEN = 'FF1E7A3D' // check y linea de GO-LIVE
const TODAY_LINE = 'FF7C3AED' // linea del dia de hoy (violeta, distinta del verde/rojo)
const GRID = 'FFBEBEBE'

const thin = { style: 'thin', color: { argb: GRID } }
const border = { top: thin, left: thin, bottom: thin, right: thin }
const medGreen = { style: 'medium', color: { argb: GREEN } }
const medToday = { style: 'medium', color: { argb: TODAY_LINE } }
// Gris claro de los sub-titulos de la leyenda (FERIADOS / RETRASOS / INFO).
const LEGEND_SUBHEAD = 'FFEDEDED'

// Finde / feriado: negro con rayas diagonales (no gris).
const NONWORK_FILL = { type: 'pattern', pattern: 'darkDown', fgColor: { argb: 'FF000000' }, bgColor: { argb: 'FFFFFFFF' } }
// Atraso: rayas diagonales ROJAS (se diferencia por textura del durazno de "En curso").
const OVERRUN_FILL = { type: 'pattern', pattern: 'darkUp', fgColor: { argb: 'FFD0432F' }, bgColor: { argb: 'FFFFFFFF' } }
const solidFill = (a) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: a } })

function barFill(status) {
  return BAR[status] || BAR.Pendiente
}

// Color de las letras marcadoras (F/X): negro, se lee sobre las rayas claras
// (las tramas darkDown/darkUp son lineas finas sobre fondo blanco).
const MARK_COLOR = 'FF000000'

// Marca una celda con una letra (F=feriado, X=atraso) centrada y oscura.
function markCell(cell, letter, color = MARK_COLOR) {
  cell.value = letter
  cell.font = { bold: true, size: 9, color: { argb: color } }
  cell.alignment = { horizontal: 'center', vertical: 'middle' }
}

// Superpone un borde vertical de color a una celda sin perder el resto del borde fino.
function vLine(cell, side) {
  cell.border = { ...(cell.border || border), left: side, right: side }
}

// Dibuja una linea vertical de color en una columna, REFORZANDO los bordes
// compartidos con las celdas vecinas. Sin esto, el borde izquierdo se "rompe":
// el borde derecho (fino) de la celda previa pisa el borde izquierdo de color.
function vLineAt(ws, row, col, side) {
  vLine(ws.getCell(row, col), side)
  if (col > 1) {
    const pv = ws.getCell(row, col - 1)
    pv.border = { ...(pv.border || border), right: side }
  }
  const nx = ws.getCell(row, col + 1)
  nx.border = { ...(nx.border || border), left: side }
}

// Fecha de GO-LIVE del proyecto: la del task que se llame GO-LIVE, o el market_launch.
function goLiveDate(tasks, project) {
  const gl = tasks.find((t) => isGoLive(t.action_name))
  if (gl) {
    const realEnd = gl.isDelayed ? gl.delayEnd : gl.renderEnd
    return gl.actual_end || realEnd || gl.planned_end || null
  }
  return project?.market_launch || null
}

// Detecta la tarea de lanzamiento por nombre: "GO-Live", "Go Live", "GoLive", "GO LIVE".
function isGoLive(name) {
  return /go[\s_-]*live/i.test(name || '')
}

// Leyenda + listado de feriados y retrasos (columnas congeladas 1-2).
function buildLegend(ws, startRow, holList = [], delayList = [], info = {}) {
  const items = [
    ['Completado', solidFill(BAR.Completado), null],
    ['En curso', solidFill(BAR['En curso']), null],
    ['Pendiente', solidFill(BAR.Pendiente), null],
    ['Atraso (X)', OVERRUN_FILL, 'X'],
    ['Finde / feriado (F)', NONWORK_FILL, 'F'],
  ]
  let row = startRow
  const setLabel = (r, text, bold = false, wrap = false) => {
    const c = ws.getCell(r, 1)
    c.value = text
    c.font = { size: 9, bold }
    c.alignment = { vertical: 'middle', wrapText: wrap }
    c.border = border
    return c
  }
  const setSwatch = (r, fill, mark) => {
    const sw = ws.getCell(r, 2)
    if (fill) sw.fill = fill
    if (mark) {
      sw.value = mark
      sw.font = { bold: true, size: 9, color: { argb: MARK_COLOR } }
      sw.alignment = { horizontal: 'center', vertical: 'middle' }
    }
    sw.border = border
    return sw
  }
  // Banda de titulo de la seccion completa (rojo de marca, texto blanco), a tono
  // con los headers de la tabla. Ocupa las dos columnas de la leyenda.
  const banner = (r, text) => {
    const c = setLabel(r, text, true)
    c.fill = solidFill(PURINA_RED)
    c.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
    const sw = ws.getCell(r, 2)
    sw.fill = solidFill(PURINA_RED)
    sw.border = border
  }
  // Sub-titulo (FERIADOS / RETRASOS / INFO): banda gris clara, texto oscuro.
  const subheader = (r, text) => {
    const c = setLabel(r, text, true)
    c.fill = solidFill(LEGEND_SUBHEAD)
    const sw = ws.getCell(r, 2)
    sw.fill = solidFill(LEGEND_SUBHEAD)
    sw.border = border
  }

  banner(row, 'REFERENCIAS')
  row++

  for (const [label, fill, mark] of items) {
    setLabel(row, label)
    setSwatch(row, fill, mark)
    row++
  }

  // GO-LIVE (linea verde) + HOY (linea violeta)
  setLabel(row, 'GO-LIVE (linea verde)')
  { const sw = ws.getCell(row, 2); sw.value = '✔'; sw.font = { bold: true, size: 13, color: { argb: GREEN } }; sw.alignment = { horizontal: 'center', vertical: 'middle' }; sw.border = { ...border, left: medGreen, right: medGreen } }
  row++
  setLabel(row, 'Hoy (linea violeta)')
  ws.getCell(row, 2).border = { ...border, left: medToday, right: medToday }
  row++

  // FERIADOS: fecha — nombre (pais)
  if (holList.length) {
    row++
    subheader(row, 'FERIADOS'); row++
    for (const f of holList) {
      const place = countryName(f.country)
      setLabel(row, `${fmtLargo(f.date)} — ${f.name}${place && place !== '—' ? ` (${place})` : ''}`)
      setSwatch(row, NONWORK_FILL, 'F')
      row++
    }
  }

  // RETRASOS: tarea, dias habiles de atraso y razon (razon completa con wrap).
  if (delayList.length) {
    row++
    subheader(row, 'RETRASOS'); row++
    for (const d of delayList) {
      const dLabel = d.days ? `+${d.days} día${d.days === 1 ? '' : 's'} hábil${d.days === 1 ? '' : 'es'}` : 'atraso'
      setLabel(row, `${d.name}: ${dLabel}${d.reason ? ` — ${d.reason}` : ''}`, false, true)
      setSwatch(row, OVERRUN_FILL, 'X')
      row++
    }
  }

  // INFO: fecha de GO-LIVE original (segun el plan), como referencia al pie.
  if (info.goLiveOriginal) {
    row++
    subheader(row, 'INFO'); row++
    setLabel(row, `Go-live original (plan): ${fmtLargo(info.goLiveOriginal)}`)
    ws.getCell(row, 2).border = border
    row++
  }
}

// Fecha de GO-LIVE ORIGINAL (segun el plan, sin proyeccion ni atraso): el fin
// planeado del task GO-LIVE, o el market_launch del proyecto.
function goLiveOriginal(tasks, project) {
  const gl = tasks.find((t) => isGoLive(t.action_name))
  if (gl) return gl.planned_end || project?.market_launch || null
  return project?.market_launch || null
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

// Dibuja una hoja con el Gantt de un proyecto. week = columnas mas angostas con las
// fechas agrupadas por semana. holByKey = mapa country|date -> nombre de feriado.
function buildSheet(wb, project, tasks, partners, idx, week = false, holByKey = new Map()) {
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
    // Aspect real del logo oficial (1526x330 ~= 4.62); se respeta para no deformarlo.
    ws.addImage(imgId, { tl: { col: 0.12, row: 0.12 }, ext: { width: 111, height: 24 } })
  } catch { /* si falla la imagen, queda la banda negra */ }

  // Fila 2 izquierda (cols 1-3): nombre del proyecto + GO-LIVE resaltado (en vez del inicio).
  ws.mergeCells(2, 1, 2, 3)
  const title = ws.getCell(2, 1)
  const glDate = goLiveDate(tasks, project)
  title.value = {
    richText: [
      { text: `${project.name}`, font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 } },
      ...(glDate ? [{ text: `     ► GO-LIVE: ${fmtLargo(glDate)}`, font: { bold: true, color: { argb: 'FF4ADE80' }, size: 12 } }] : []),
    ],
  }
  title.fill = solidFill(BRAND_BG)
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
    const col = C0 + i
    // Fila 2 = numero de dia. En modo semana se deja vacia y se rotula por semana (abajo).
    const numCell = ws.getCell(2, col)
    numCell.value = week ? '' : d.getDate()
    numCell.font = { size: 8 }
    numCell.alignment = { horizontal: 'center', vertical: 'middle' }
    numCell.border = border
    // Fila 3: en dia = letra del dia; en semana = numero de dia bien chico (para que entre).
    const dowCell = ws.getCell(3, col)
    dowCell.value = week ? d.getDate() : DOW[d.getDay()]
    dowCell.font = { size: week ? 5 : 7, bold: wknd && !week, color: { argb: wknd ? 'FF000000' : 'FF888888' } }
    dowCell.alignment = { horizontal: 'center', vertical: 'middle' }
    dowCell.border = border
  })

  // Modo semana: fila 2 agrupa las fechas por semana (corta en lunes o cambio de mes),
  // celdas mergeadas y centradas => se leen claras bajo la banda de mes.
  if (week) {
    let gs = 0
    for (let i = 1; i <= days.length; i++) {
      const cur = i < days.length ? parseDay(days[i]) : null
      const prev = parseDay(days[i - 1])
      const boundary = i === days.length || cur.getDay() === 1 || cur.getMonth() !== prev.getMonth()
      if (boundary) {
        const c1 = C0 + gs, c2 = C0 + i - 1
        if (c2 > c1) ws.mergeCells(2, c1, 2, c2)
        const cell = ws.getCell(2, c1)
        const d1 = parseDay(days[gs]).getDate(), d2 = prev.getDate()
        cell.value = d1 === d2 ? `${d1}` : `${d1}–${d2}`
        cell.font = { size: 9, bold: true, color: { argb: 'FF444444' } }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = border
        gs = i
      }
    }
  }

  // --- Filas de tareas ---
  const sorted = [...tasks].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  const goLiveCols = new Set()
  const holidaysSeen = new Map() // country|date -> {date, country, name}
  const delaysSeen = [] // {name, from, to, days, reason}
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
      const wknd = isWeekendISO(iso)
      const isHoliday = !wknd && t.holidaysSet && t.holidaysSet.has(iso)
      const nonWorking = wknd || (t.holidaysSet && t.holidaysSet.has(iso))
      const inReal = t.renderStart && realEnd && iso >= t.renderStart && iso <= realEnd
      const isOverrun = t.isDelayed && t.planned_end && t.delayEnd && iso > t.planned_end && iso <= t.delayEnd
      if (nonWorking) cell.fill = NONWORK_FILL
      else if (isOverrun) cell.fill = OVERRUN_FILL
      else if (inReal) cell.fill = solidFill(barFill(t.status))
      // Feriado (solo si NO cae en finde): "F" en la celda + se agrega al listado de Referencias.
      if (isHoliday) {
        markCell(cell, 'F')
        holidaysSeen.set(`${t.country}|${iso}`, {
          date: iso,
          country: t.country,
          name: holByKey.get(`${t.country}|${iso}`) || 'Feriado',
        })
      } else if (isOverrun && !nonWorking) {
        markCell(cell, 'X')
      }
    })

    // Se registra el retraso para el listado de Referencias (fechas + razon).
    if (t.isDelayed && t.delayEnd) {
      delaysSeen.push({
        name: t.action_name || 'Tarea',
        from: t.planned_end,
        to: t.delayEnd,
        days: t.delayDays,
        reason: t.delay_reason || '',
      })
    }

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

  const lastRow = 3 + sorted.length

  // --- Lineas verticales: GO-LIVE (verde) y HOY (violeta, fecha real de exportacion) ---
  const todayIdx = days.indexOf(toISO(new Date()))
  const todayCol = todayIdx >= 0 ? C0 + todayIdx : -1
  for (let row = 2; row <= lastRow; row++) {
    for (const col of goLiveCols) vLineAt(ws, row, col, medGreen)
    if (todayCol > 0 && !goLiveCols.has(todayCol)) vLineAt(ws, row, todayCol, medToday)
  }

  // Leyenda de colores + listado de feriados y retrasos (debajo de la ultima tarea).
  const holList = [...holidaysSeen.values()].sort((a, b) => (a.date < b.date ? -1 : 1))
  buildLegend(ws, 4 + sorted.length + 1, holList, delaysSeen, { goLiveOriginal: goLiveOriginal(tasks, project) })

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

// Lookup nombre de feriado por `country|date` (para las notas de feriado).
function holidayMap(holidays) {
  const m = new Map()
  for (const h of holidays || []) m.set(`${h.country}|${h.date}`, h.name || 'Feriado')
  return m
}

// Exporta TODOS los proyectos (no archivados) -> una hoja por proyecto.
// week: dibuja en modo semana (segun el toggle del cronograma).
export async function exportGlobal(enriched, projects, partners, week = false, holidays = []) {
  const wb = new ExcelJS.Workbook()
  const holByKey = holidayMap(holidays)
  const active = projects.filter((p) => !p.archived)
  active.forEach((project, idx) => {
    const tasks = enriched.filter((t) => t.project_id === project.id)
    buildSheet(wb, project, tasks, partners, idx, week, holByKey)
  })
  if (active.length === 0) buildSheet(wb, { name: 'Sin proyectos' }, [], partners, 0, week, holByKey)
  await download(wb, 'Gantt Timeline.xlsx')
}

// Exporta UN proyecto. Nombre: "Project Name - Gantt Timeline.xlsx".
export async function exportProject(project, enriched, partners, week = false, holidays = []) {
  const wb = new ExcelJS.Workbook()
  const tasks = enriched.filter((t) => t.project_id === project.id)
  buildSheet(wb, project, tasks, partners, 0, week, holidayMap(holidays))
  await download(wb, `${safeFileName(project.name)} - Gantt Timeline.xlsx`)
}
