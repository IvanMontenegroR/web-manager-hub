// Export de la "matriz de contenido" de una pagina a Excel para que los MERCADOS
// (no tecnicos) carguen el contenido visual (links de imagenes, titulos, textos...)
// y adelanten trabajo. Layout: a la IZQUIERDA los campos de cada componente (una
// fila por campo; las listas se abren por item, ej. cada card con sus campos), y a
// la DERECHA la imagen del componente renderizado con su contenido. Solo se exportan
// los campos VISUALES (los tecnicos del CMS se marcan `cms:true` y se omiten).
import ExcelJS from 'exceljs'
import html2canvas from 'html2canvas'
import { getComponent, fieldToText, getSpecs } from '../data/components'

const PURINA_RED = 'FFED1C24'
const HEAD_BG = 'FF1F2530'
const CARD_BG = 'FFFCE9EA'   // franja de card (rosa muy claro)
const SUBHEAD_BG = 'FFF1F3F5'
const MUTED = 'FF868E99'
const BORDER = 'FFE4E7EB'
const EMPTY = '—'

function safeFileName(name) {
  return (name || 'Pagina').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim()
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

// Captura un nodo del DOM a PNG (dataURL). Devuelve null si falla.
async function snapshot(node, forceWidth) {
  if (!node) return null
  const w = forceWidth || node.offsetWidth || 800
  const prevWidth = node.style.width
  node.style.width = w + 'px'
  try {
    const h = node.offsetHeight || 300
    const canvas = await html2canvas(node, {
      backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: false,
      width: w, height: h, windowWidth: w, windowHeight: h,
    })
    return canvas.toDataURL('image/png')
  } catch {
    return null
  } finally {
    node.style.width = prevWidth
  }
}

function loadSize(dataUrl) {
  return new Promise((res) => {
    const img = new Image()
    img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => res(null)
    img.src = dataUrl
  })
}

// Alto estimado (pt) de una celda de contenido segun cuanto texto wrapea.
function estHeight(text, charsPerLine = 48) {
  const s = String(text == null ? '' : text)
  const lines = s.split('\n').reduce((acc, ln) => acc + Math.max(1, Math.ceil((ln.length || 1) / charsPerLine)), 0)
  return Math.max(18, lines * 13 + 6)
}

// Escala una imagen para que entre en maxW x maxH (sin agrandar de mas).
function fit(w, h, maxW, maxH) {
  const s = Math.min(maxW / w, maxH / h)
  return { w: Math.round(w * s), h: Math.round(h * s) }
}

// components = [{ id, component_key, content }] en orden.
// getNode(id) devuelve el nodo DOM (.cp-render) del preview de ese componente.
export async function exportPageMatrix(page, components, getNode, headerNode, footerNode) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Web Manager Hub'
  const ws = wb.addWorksheet(safeFileName(page.name).slice(0, 28) || 'Pagina', {
    views: [{ showGridLines: false }],
  })
  ws.columns = [
    { width: 2 },   // A: margen
    { width: 30 },  // B: campo
    { width: 52 },  // C: contenido
    { width: 2 },   // D: separacion
    { width: 62 },  // E: imagen
  ]
  const IMG_COL = 4 // 0-based -> columna E

  const setH = (r, h) => { ws.getRow(r).height = Math.max(ws.getRow(r).height || 0, h) }

  // Coloca la imagen del componente a la derecha (columna E), anclada a `topRow`.
  // Devuelve el alto de la imagen en pt (para reservar filas y no pisar lo de abajo).
  async function placeImageRight(dataUrl, topRow) {
    if (!dataUrl) return 0
    const probe = await loadSize(dataUrl)
    const nat = probe || { w: 1180, h: 620 }
    const { w, h } = fit(nat.w, nat.h, 430, 360)
    const imgId = wb.addImage({ base64: dataUrl, extension: 'png' })
    ws.addImage(imgId, { tl: { col: IMG_COL + 0.12, row: topRow - 1 + 0.12 }, ext: { width: w, height: h }, editAs: 'oneCell' })
    return h * 0.75 + 10 // px -> pt + padding
  }

  // Banda de titulo (merge B..C). Devuelve la fila siguiente.
  function bandTitle(atRow, text, bg, span5) {
    ws.mergeCells(atRow, 2, atRow, span5 ? 5 : 3)
    const c = ws.getCell(atRow, 2)
    c.value = text
    c.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
    c.alignment = { vertical: 'middle', indent: 1 }
    setH(atRow, 22)
    return atRow + 1
  }

  // Fila campo/contenido en el bloque izquierdo (B=campo, C=contenido).
  function fieldRow(atRow, label, value, opts = {}) {
    const c1 = ws.getCell(atRow, 2)
    c1.value = label
    c1.font = { bold: !opts.sub, size: 10, color: { argb: opts.color || 'FF1F2530' } }
    c1.alignment = { vertical: 'top', wrapText: true, indent: opts.sub ? 1 : 0 }
    const c2 = ws.getCell(atRow, 3)
    c2.value = value == null || value === '' ? EMPTY : value
    c2.font = { size: 10, italic: !!opts.italic, color: { argb: (value == null || value === '') ? MUTED : 'FF1F2530' } }
    c2.alignment = { vertical: 'top', wrapText: true }
    for (const col of [2, 3]) {
      ws.getCell(atRow, col).border = {
        top: { style: 'thin', color: { argb: BORDER } },
        bottom: { style: 'thin', color: { argb: BORDER } },
      }
      if (opts.fill) ws.getCell(atRow, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } }
    }
    setH(atRow, estHeight(value))
    return atRow + 1
  }

  // Franja de card dentro de una lista (ej. "Marca 1"), merge B..C.
  function cardBand(atRow, text) {
    ws.mergeCells(atRow, 2, atRow, 3)
    const c = ws.getCell(atRow, 2)
    c.value = text
    c.font = { bold: true, size: 10, color: { argb: 'FF7A1216' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CARD_BG } }
    c.alignment = { vertical: 'middle', indent: 1 }
    setH(atRow, 18)
    return atRow + 1
  }

  // Titulo de la pagina + instrucciones para el mercado.
  ws.mergeCells(1, 2, 1, 5)
  const title = ws.getCell(1, 2)
  title.value = `${page.name}${page.path ? '  ·  ' + page.path : ''}`
  title.font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } }
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD_BG } }
  title.alignment = { vertical: 'middle', indent: 1 }
  setH(1, 26)
  ws.mergeCells(2, 2, 2, 5)
  ws.getCell(2, 2).value = 'Completá el contenido visual de cada componente (izquierda) según la imagen de referencia (derecha): pegá los links de las imágenes/videos, títulos, textos y links. No hace falta saber del CMS.'
  ws.getCell(2, 2).font = { italic: true, size: 10, color: { argb: MUTED } }
  ws.getCell(2, 2).alignment = { wrapText: true, vertical: 'top' }
  setH(2, 30)
  let row = 4

  // Seccion de imagen a lo ancho (header/footer globales, sin campos).
  async function fullSection(label, dataUrl, noteText) {
    row = bandTitle(row, label, HEAD_BG, true)
    if (dataUrl) {
      const probe = await loadSize(dataUrl)
      const nat = probe || { w: 1180, h: 200 }
      const { w, h } = fit(nat.w, nat.h, 760, 240)
      const imgId = wb.addImage({ base64: dataUrl, extension: 'png' })
      ws.addImage(imgId, { tl: { col: 1.2, row: row - 1 + 0.1 }, ext: { width: w, height: h }, editAs: 'oneCell' })
      const rowsNeeded = Math.ceil((h * 0.75 + 12) / 16)
      for (let i = 0; i < rowsNeeded; i++) setH(row + i, 16)
      row += rowsNeeded
    }
    if (noteText) {
      ws.mergeCells(row, 2, row, 5)
      ws.getCell(row, 2).value = noteText
      ws.getCell(row, 2).font = { italic: true, size: 9, color: { argb: MUTED } }
      row += 1
    }
    row += 1
  }

  // Header global.
  if (headerNode) {
    const durl = await snapshot(headerNode, 1180)
    if (durl) await fullSection('Header — global (igual en todas las páginas)', durl, 'El header es global: se configura una sola vez para todo el sitio, no por página.')
  }

  // Componentes: banda -> [campos izquierda | imagen derecha].
  let idx = 0
  for (const comp of components) {
    idx++
    const def = getComponent(comp.component_key)
    const content = comp.content || {}
    const topRow = row

    // Banda de titulo (bloque izquierdo).
    row = bandTitle(row, `${idx}. ${def?.name || comp.component_key}`, PURINA_RED)

    // Tamano de imagen recomendado (si aplica).
    for (const s of getSpecs(def, content)) {
      const label = 'Tamaño de imagen' + (s.label ? ` — ${s.label}` : '')
      const parts = [s.ratio, s.desktop && `Desktop ${s.desktop}`, s.mobile && `Mobile ${s.mobile}`, s.max && `Max ${s.max}`, s.format].filter(Boolean).join('  ·  ')
      row = fieldRow(row, label, parts, { color: PURINA_RED, italic: true, fill: SUBHEAD_BG })
    }

    // Cabecera Campo | Contenido.
    ws.getCell(row, 2).value = 'Campo'
    ws.getCell(row, 3).value = 'Contenido a cargar'
    for (const col of [2, 3]) {
      const c = ws.getCell(row, col)
      c.font = { bold: true, size: 10 }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUBHEAD_BG } }
      c.alignment = { vertical: 'middle' }
    }
    setH(row, 18)
    row++

    // Campos VISUALES (los cms:true se omiten). Las listas se abren por item.
    const visible = (def?.fields || []).filter((f) => !f.cms)
    for (const f of visible) {
      if (f.type === 'list') {
        const items = Array.isArray(content[f.key]) ? content[f.key] : []
        const arr = items.length ? items : [{}] // al menos 1 plantilla vacia
        const subFields = (f.item || []).filter((sf) => !sf.cms)
        arr.forEach((item, i) => {
          row = cardBand(row, `${f.label} ${i + 1}`)
          for (const sf of subFields) {
            row = fieldRow(row, sf.label, fieldToText(sf, item[sf.key]), { sub: true })
          }
        })
      } else {
        row = fieldRow(row, f.label, fieldToText(f, content[f.key]))
      }
    }

    // Imagen del componente a la derecha, anclada al inicio de la banda.
    const dataUrl = await snapshot(getNode(comp.id))
    const imgPt = await placeImageRight(dataUrl, topRow)

    // Reservar filas si la imagen es mas alta que el bloque de campos.
    let acc = 0
    for (let r = topRow; r < row; r++) acc += ws.getRow(r).height || 15
    while (acc < imgPt) { setH(row, 16); acc += 16; row++ }

    row += 1 // separacion entre componentes
  }

  // Footer global.
  if (footerNode) {
    const durl = await snapshot(footerNode, 1180)
    if (durl) await fullSection('Footer — global (igual en todas las páginas)', durl, 'El footer es global: se configura una sola vez para todo el sitio, no por página.')
  }

  await download(wb, `${safeFileName(page.name)} — Matriz de contenido.xlsx`)
}
