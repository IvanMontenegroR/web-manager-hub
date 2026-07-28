// Export de la "matriz de contenido" de una pagina a Excel para los editores del CMS.
// Layout apilado: cada seccion (header, componente, footer) va una debajo de otra,
// con la imagen del componente RENDERIZADO CON SU CONTENIDO arriba (en su propia fila,
// con alto explicito para que no se superpongan) y la tabla campo -> contenido abajo.
import ExcelJS from 'exceljs'
import html2canvas from 'html2canvas'
import { getComponent, fieldToText } from '../data/components'

const PURINA_RED = 'FFED1C24'
const HEAD_BG = 'FF1F2530'
const SUBHEAD_BG = 'FFF1F3F5'
const MUTED = 'FF868E99'
const BORDER = 'FFE4E7EB'

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
  // Fijamos el ancho en px durante la captura: html2canvas resuelve los width:%
  // contra un ancestro con ancho explicito; sin esto, los width:100% colapsan.
  // forceWidth ademas fuerza el layout desktop (ej. header, que a ancho angosto desborda).
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

// components = [{ id, component_key, content }] en orden.
// getNode(id) devuelve el nodo DOM (.cp-render) del preview de ese componente.
// headerNode / footerNode = nodos del Header/Footer global (opcionales), como contexto.
export async function exportPageMatrix(page, components, getNode, headerNode, footerNode) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Web Manager Hub'
  const ws = wb.addWorksheet(safeFileName(page.name).slice(0, 28) || 'Pagina', {
    views: [{ showGridLines: false }],
  })
  ws.columns = [
    { width: 3 },   // A: margen
    { width: 34 },  // B: campo
    { width: 95 },  // C: contenido
  ]

  // Coloca una imagen en SU PROPIA fila, con alto explicito (px -> pt) para que la
  // siguiente seccion arranque debajo sin superponerse. Devuelve la fila siguiente.
  async function placeImage(dataUrl, atRow, targetWidth) {
    const probe = await loadSize(dataUrl)
    const w = targetWidth
    const h = probe ? Math.round((probe.h / probe.w) * w) : 200
    const imgId = wb.addImage({ base64: dataUrl, extension: 'png' })
    ws.getRow(atRow).height = Math.round(h * 0.75) + 8 // 1px ~ 0.75pt + padding
    ws.addImage(imgId, { tl: { col: 0.2, row: atRow - 1 + 0.06 }, ext: { width: w, height: h }, editAs: 'oneCell' })
    return atRow + 1
  }

  function bandTitle(atRow, text, bg) {
    ws.mergeCells(atRow, 1, atRow, 3)
    const c = ws.getCell(atRow, 1)
    c.value = text
    c.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
    c.alignment = { vertical: 'middle', indent: 1 }
    ws.getRow(atRow).height = 22
    return atRow + 1
  }

  function note(atRow, text) {
    ws.mergeCells(atRow, 1, atRow, 3)
    ws.getCell(atRow, 1).value = text
    ws.getCell(atRow, 1).font = { italic: true, size: 10, color: { argb: MUTED } }
    return atRow + 1
  }

  // Titulo de la pagina.
  ws.mergeCells(1, 1, 1, 3)
  const title = ws.getCell(1, 1)
  title.value = `${page.name}${page.path ? '  ·  ' + page.path : ''}`
  title.font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } }
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD_BG } }
  title.alignment = { vertical: 'middle', indent: 1 }
  ws.getRow(1).height = 26
  let row = note(2, 'Matriz de contenido para carga en el CMS. Una seccion por componente, en orden.') + 1

  // Header global.
  if (headerNode) {
    const durl = await snapshot(headerNode, 1180)
    if (durl) {
      row = bandTitle(row, 'Header — global (en todas las paginas)', HEAD_BG)
      row = await placeImage(durl, row, 760)
      row = note(row, 'El header es global: se configura una sola vez para todo el sitio, no por pagina.') + 1
    }
  }

  // Componentes: titulo -> imagen arriba -> tabla campo/contenido abajo.
  let idx = 0
  for (const comp of components) {
    idx++
    const def = getComponent(comp.component_key)
    row = bandTitle(row, `${idx}. ${def?.name || comp.component_key}`, PURINA_RED)

    const dataUrl = await snapshot(getNode(comp.id))
    if (dataUrl) row = await placeImage(dataUrl, row, 680)

    // Cabecera de la tabla de campos.
    ws.getCell(row, 2).value = 'Campo'
    ws.getCell(row, 3).value = 'Contenido'
    for (const col of [2, 3]) {
      const c = ws.getCell(row, col)
      c.font = { bold: true, size: 10 }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUBHEAD_BG } }
      c.alignment = { vertical: 'middle' }
    }
    row++

    for (const f of (def?.fields || [])) {
      const c1 = ws.getCell(row, 2)
      c1.value = f.label
      c1.font = { bold: true, size: 10 }
      c1.alignment = { vertical: 'top', wrapText: true }
      const c2 = ws.getCell(row, 3)
      c2.value = fieldToText(f, comp.content?.[f.key]) || '—'
      c2.alignment = { vertical: 'top', wrapText: true }
      c2.font = { size: 10 }
      for (const col of [2, 3]) {
        ws.getCell(row, col).border = {
          top: { style: 'thin', color: { argb: BORDER } },
          bottom: { style: 'thin', color: { argb: BORDER } },
        }
      }
      row++
    }
    row += 1 // separacion entre componentes
  }

  // Footer global.
  if (footerNode) {
    const durl = await snapshot(footerNode, 1180)
    if (durl) {
      row = bandTitle(row, 'Footer — global (en todas las paginas)', HEAD_BG)
      row = await placeImage(durl, row, 760)
      row = note(row, 'El footer es global: se configura una sola vez para todo el sitio, no por pagina.') + 1
    }
  }

  await download(wb, `${safeFileName(page.name)} — Matriz de contenido.xlsx`)
}
