// Export del MENU del sitio a Excel, para que el mercado cargue los textos y los links.
//
// Va en su PROPIO archivo y no adentro de la matriz de cada pagina: el menu es UNO por
// mercado, no contenido de una pagina. Metido en cada matriz, el mismo bloque se
// repetiria en todos los archivos y nadie sabria cual es el que hay que completar.
//
// Estructura: arriba la LISTA de los menus principales (el indice, para ver de una que
// hay que llenar) y despues UNA SECCION por menu principal con sus submenus, numeradas
// igual que en la lista.
import ExcelJS from 'exceljs'
import { PURINA_LOGO_B64 } from './purinaLogo'
import { snapshot } from './exportPage'

const SHEET = 'Menú'
const PURINA_RED = 'FFED1C24'
const HEAD_BG = 'FF1F2530'
const GROUP_BG = 'FFEDEFF2'
const MUTED = 'FF868E99'
const BORDER = 'FFE4E7EB'
// Mismo amarillo que la matriz de contenido: lo que falta completar.
const TODO_BG = 'FFFFF2C2'

const LAYOUT_LABEL = {
  boxes: 'Grupos con título',
  links: 'Lista de links',
}

function safeFileName(name) {
  return String(name || 'menu').replace(/[\\/:*?"<>|]/g, '-').trim()
}

async function download(wb, filename) {
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Cuantos links tiene un menu, sumando los de todos sus grupos.
function countLinks(item) {
  if (item.layout === 'boxes') {
    return (item.groups || []).reduce((n, g) => n + (g.links || []).length, 0)
  }
  return (item.links || []).length
}

// Tamaño natural de un dataURL, para encajar la imagen sin deformarla.
function loadSize(dataUrl) {
  return new Promise((res) => {
    const im = new Image()
    im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight })
    im.onerror = () => res(null)
    im.src = dataUrl
  })
}

// Ancho con el que se captura el header (desktop) y ancho al que entra en la hoja.
const CAP_W = 1180
const IMG_W = 660

// `getNode(k)` devuelve el nodo del rig de captura: 'bar' = la barra sola, y un indice
// por menu = ese megamenu ABIERTO. Sin `getNode` el Excel sale sin imagenes, que es lo
// que pasaba antes: el mercado leia "1.1 — Grupo: Etapa de vida" sin saber que parte
// del menu es.
export async function exportSiteMenu(market, marketLabel, items, promos, getNode) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(SHEET, { views: [{ showGridLines: false, state: 'frozen', ySplit: 3 }] })
  ws.columns = [
    { width: 2 }, { width: 6 }, { width: 34 }, { width: 46 }, { width: 22 },
    { width: 2 },   // F: separador
    { width: 92 },  // G: la imagen del menu
  ]

  // Capturas: primero la barra (para el indice) y despues un megamenu por seccion.
  const shot = async (k) => (getNode ? snapshot(getNode(k), CAP_W) : null)
  const barShot = await shot('bar')
  const shots = []
  for (let i = 0; i < items.length; i++) shots.push(await shot(i))

  // Ancla una captura a la derecha de la fila `atRow` y devuelve su alto en puntos,
  // para poder reservar las filas que ocupa.
  const place = async (dataUrl, atRow) => {
    if (!dataUrl) return 0
    const nat = (await loadSize(dataUrl)) || { w: CAP_W, h: 400 }
    const w = IMG_W
    const h = Math.round(nat.h * (w / nat.w))
    const id = wb.addImage({ base64: dataUrl, extension: 'png' })
    ws.addImage(id, { tl: { col: 6.15, row: atRow - 1 }, ext: { width: w, height: h }, editAs: 'oneCell' })
    return h * 0.75
  }
  // Reserva filas vacias hasta que la seccion sea al menos tan alta como su imagen,
  // asi la captura de una seccion no se monta sobre la de la siguiente.
  const padTo = (from, to, hpt) => {
    if (!hpt) return to
    let area = 0
    for (let r = from; r < to; r++) area += ws.getRow(r).height || 15
    let r = to
    while (area < hpt + 12) { ws.getRow(r).height = 16; area += 16; r++ }
    return r
  }
  const thin = { style: 'thin', color: { argb: BORDER } }
  const box = { top: thin, bottom: thin, left: thin, right: thin }
  const setH = (r, h) => { ws.getRow(r).height = Math.max(ws.getRow(r).height || 0, h) }
  let row = 1

  // --- Encabezado con el logo ---
  ws.mergeCells(row, 2, row, 5)
  const brand = ws.getCell(row, 2)
  brand.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD_BG } }
  setH(row, 34)
  try {
    const imgId = wb.addImage({ base64: PURINA_LOGO_B64, extension: 'png' })
    ws.addImage(imgId, { tl: { col: 1.15, row: row - 0.82 }, ext: { width: 111, height: 24 } })
  } catch { /* si falla la imagen queda la banda negra */ }
  row++

  ws.mergeCells(row, 2, row, 5)
  const t = ws.getCell(row, 2)
  t.value = `Menú del sitio — ${marketLabel}`
  t.font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } }
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PURINA_RED } }
  t.alignment = { vertical: 'middle', indent: 1 }
  setH(row, 28)
  row++

  ws.mergeCells(row, 2, row, 5)
  const help = ws.getCell(row, 2)
  help.value = 'El menú es el mismo en todas las páginas de este mercado. Abajo está primero la lista de los menús principales y después una sección por cada uno con sus submenús — el número es el mismo en los dos lados. Las celdas en AMARILLO son las que hay que completar.'
  help.font = { italic: true, size: 10, color: { argb: MUTED } }
  help.alignment = { wrapText: true, vertical: 'top' }
  setH(row, 40)
  row += 2

  // --- helpers de fila ---
  const band = (text, bg, size = 12) => {
    ws.mergeCells(row, 2, row, 5)
    const c = ws.getCell(row, 2)
    c.value = text
    c.font = { bold: true, size, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
    c.alignment = { vertical: 'middle', indent: 1 }
    setH(row, size > 10 ? 22 : 18)
    row++
  }
  const groupBand = (text) => {
    ws.mergeCells(row, 2, row, 5)
    const c = ws.getCell(row, 2)
    c.value = text
    c.font = { bold: true, size: 10, color: { argb: 'FF3C444B' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GROUP_BG } }
    c.alignment = { vertical: 'middle', indent: 1 }
    for (const col of [2, 3, 4, 5]) ws.getCell(row, col).border = box
    setH(row, 18)
    row++
  }
  const heads = (cols) => {
    cols.forEach((h, i) => {
      const c = ws.getCell(row, 2 + i)
      c.value = h
      c.font = { bold: true, size: 9, color: { argb: 'FF3C444B' } }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GROUP_BG } }
      c.alignment = { vertical: 'middle', indent: 1 }
      c.border = box
    })
    setH(row, 16)
    row++
  }
  // Una celda: vacia = amarilla, porque es lo que falta cargar.
  const cell = (col, value, opts = {}) => {
    const c = ws.getCell(row, col)
    const empty = value == null || value === ''
    c.value = empty ? (opts.emptyAs || '') : value
    c.font = { size: 10, bold: !!opts.bold, italic: empty && !!opts.emptyAs, color: { argb: empty && opts.emptyAs ? MUTED : 'FF1F2530' } }
    c.alignment = { vertical: 'middle', wrapText: true, indent: opts.indent || 0 }
    c.border = box
    if (empty && !opts.noTodo) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TODO_BG } }
    return c
  }

  // --- 1) La lista de menus principales (el indice) ---
  // Al lado va la BARRA del header cerrada: el indice es la barra, y asi se ve.
  const idxTop = row
  band('Menús principales', PURINA_RED)
  heads(['#', 'Nombre del menú', 'Cómo se ve', 'Submenús'])
  items.forEach((it, i) => {
    cell(2, i + 1, { noTodo: true, bold: true })
    cell(3, it.label, { bold: true })
    cell(4, LAYOUT_LABEL[it.layout] || it.layout || '', { noTodo: true })
    cell(5, `${countLinks(it)} link${countLinks(it) === 1 ? '' : 's'}`, { noTodo: true })
    setH(row, 18)
    row++
  })
  row = padTo(idxTop, row, await place(barShot, idxTop))
  row++

  // --- 2) Una seccion por menu principal, con sus submenus ---
  // Cada una lleva a la derecha su megamenu ABIERTO: sin la imagen, "1.1 — Grupo:
  // Etapa de vida" no le dice nada al mercado.
  for (const [i, it] of items.entries()) {
    const secTop = row
    band(`${i + 1}. ${it.label || 'Menú sin nombre'}`, PURINA_RED)

    if (it.search) {
      groupBand('Buscador (arriba del menú)')
      heads(['', 'Campo', 'Contenido', ''])
      cell(2, '', { noTodo: true }); cell(3, 'Título del buscador', { noTodo: true, bold: true })
      cell(4, it.search.label); cell(5, '', { noTodo: true }); row++
      cell(2, '', { noTodo: true }); cell(3, 'Texto de ejemplo', { noTodo: true, bold: true })
      cell(4, it.search.placeholder); cell(5, '', { noTodo: true }); row++
    }

    if (it.layout === 'boxes') {
      const groups = it.groups || []
      if (!groups.length) {
        groupBand('Este menú todavía no tiene grupos.')
      }
      groups.forEach((g, gi) => {
        groupBand(`${i + 1}.${gi + 1} — Grupo: ${g.title || 'Sin título'}`)
        heads(['#', 'Submenú', 'URL', 'Icono (CMS)'])
        const links = g.links || []
        if (!links.length) {
          cell(2, '', { noTodo: true })
          cell(3, 'Sin links todavía.', { noTodo: true })
          cell(4, '', { noTodo: true }); cell(5, '', { noTodo: true })
          row++
        }
        links.forEach((l, li) => {
          cell(2, `${i + 1}.${gi + 1}.${li + 1}`, { noTodo: true })
          cell(3, l.label)
          cell(4, l.url)
          // En este layout el icono es del GRUPO, no de cada link: la columna queda
          // vacia y el icono va en su propia fila, abajo.
          cell(5, '', { noTodo: true })
          row++
        })
        cell(2, '', { noTodo: true })
        cell(3, 'Icono del grupo', { noTodo: true, bold: true })
        cell(4, g.icon, { noTodo: true, emptyAs: '- Sin icono -' })
        cell(5, '', { noTodo: true })
        row++
      })
    } else {
      const links = it.links || []
      // Sin numero: en este layout no hay grupos, asi que los links cuelgan directo
      // del menu y se numeran 3.1, 3.2... Ponerle "3.1" a la banda chocaria con ellos.
      groupBand('Submenús')
      heads(['#', 'Submenú', 'URL', 'Icono (CMS)'])
      if (!links.length) {
        cell(2, '', { noTodo: true })
        cell(3, 'Sin links todavía.', { noTodo: true })
        cell(4, '', { noTodo: true }); cell(5, '', { noTodo: true })
        row++
      }
      links.forEach((l, li) => {
        cell(2, `${i + 1}.${li + 1}`, { noTodo: true })
        cell(3, l.label)
        cell(4, l.url)
        cell(5, l.icon)
        row++
      })
    }

    if (it.more?.label || it.more?.url) {
      groupBand('Link del pie del menú')
      heads(['', 'Texto', 'URL', ''])
      cell(2, '', { noTodo: true })
      cell(3, it.more?.label)
      cell(4, it.more?.url)
      cell(5, '', { noTodo: true })
      row++
    }

    row = padTo(secTop, row, await place(shots[i], secTop))
    row++
  }

  // --- 3) Las tarjetas de la derecha (las mismas en todos los menus) ---
  band('Tarjetas de la derecha', PURINA_RED)
  ws.mergeCells(row, 2, row, 5)
  const note = ws.getCell(row, 2)
  note.value = promos.length
    ? 'Son las mismas en todos los menús: se cargan una sola vez.'
    : 'Este mercado no muestra tarjetas: el menú ocupa todo el ancho.'
  note.font = { italic: true, size: 10, color: { argb: MUTED } }
  note.alignment = { vertical: 'middle', indent: 1 }
  setH(row, 18)
  row++
  if (promos.length) {
    heads(['#', 'Título', 'Bajada', 'URL'])
    promos.forEach((p, i) => {
      cell(2, i + 1, { noTodo: true, bold: true })
      cell(3, p.title)
      cell(4, p.text)
      cell(5, p.url)
      setH(row, 20)
      row++
    })
  }

  await download(wb, `Menú del sitio - ${safeFileName(marketLabel || market)}.xlsx`)
}
