// Export de la "matriz de contenido" de una pagina a Excel para los editores del CMS.
// Por cada componente colocado: una imagen del componente RENDERIZADO CON SU CONTENIDO
// (captura del preview via html2canvas) + una tabla campo -> contenido con lo que hay
// que cargar en Drupal.
import ExcelJS from 'exceljs'
import html2canvas from 'html2canvas'
import { getComponent, fieldToText } from '../data/components'

const PURINA_RED = 'FFED1C24'
const HEAD_BG = 'FF1F2530'
const SUBHEAD_BG = 'FFF1F3F5'

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
  // forceWidth ademas fuerza el layout desktop (ej. header, que a ancho angosto
  // desborda su nav).
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

// components = [{ id, component_key, content }] en orden.
// getNode(id) devuelve el nodo DOM (.cp-render) del preview de ese componente.
// headerNode = nodo del Header global (opcional), se pone como contexto arriba.
export async function exportPageMatrix(page, components, getNode, headerNode) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Web Manager Hub'
  const ws = wb.addWorksheet(safeFileName(page.name).slice(0, 28) || 'Pagina', {
    views: [{ showGridLines: false }],
  })
  ws.columns = [
    { width: 4 },   // A: idx
    { width: 30 },  // B: campo
    { width: 62 },  // C: contenido
    { width: 40 },  // D: (imagen se ancla aca)
  ]

  // Titulo de la pagina.
  ws.mergeCells(1, 1, 1, 4)
  const title = ws.getCell(1, 1)
  title.value = `${page.name}${page.path ? '  ·  ' + page.path : ''}`
  title.font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } }
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD_BG } }
  title.alignment = { vertical: 'middle', indent: 1 }
  ws.getRow(1).height = 26
  ws.getCell(2, 1).value = 'Matriz de contenido para carga en el CMS. Una seccion por componente, en orden.'
  ws.mergeCells(2, 1, 2, 4)
  ws.getCell(2, 1).font = { italic: true, size: 10, color: { argb: 'FF868E99' } }

  let row = 4

  // Header global (contexto): imagen + nota. Se configura una vez para todo el sitio.
  if (headerNode) {
    const durl = await snapshot(headerNode, 1180)
    if (durl) {
      ws.mergeCells(row, 1, row, 4)
      const hh = ws.getCell(row, 1)
      hh.value = 'Header — global (en todas las paginas)'
      hh.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
      hh.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD_BG } }
      hh.alignment = { vertical: 'middle', indent: 1 }
      ws.getRow(row).height = 22
      row++
      const imgId = wb.addImage({ base64: durl, extension: 'png' })
      const probe = await loadSize(durl)
      const w = 720
      const h2 = probe ? Math.round((probe.h / probe.w) * w) : 60
      ws.addImage(imgId, { tl: { col: 0.05, row: row - 1 + 0.1 }, ext: { width: w, height: h2 }, editAs: 'oneCell' })
      row += Math.ceil(h2 / 18) + 1
      ws.getCell(row, 1).value = 'El header es global: se configura una sola vez para todo el sitio, no por pagina.'
      ws.mergeCells(row, 1, row, 4)
      ws.getCell(row, 1).font = { italic: true, size: 10, color: { argb: 'FF868E99' } }
      row += 2
    }
  }

  let idx = 0
  for (const comp of components) {
    idx++
    const def = getComponent(comp.component_key)
    const compName = def?.name || comp.component_key

    // Encabezado del componente.
    ws.mergeCells(row, 1, row, 4)
    const h = ws.getCell(row, 1)
    h.value = `${idx}. ${compName}`
    h.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
    h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PURINA_RED } }
    h.alignment = { vertical: 'middle', indent: 1 }
    ws.getRow(row).height = 22
    row++

    // Fila de headers de la tabla de campos + imagen anclada a la derecha (col D).
    const headRow = row
    ws.getCell(headRow, 2).value = 'Campo'
    ws.getCell(headRow, 3).value = 'Contenido'
    ws.getCell(headRow, 4).value = 'Vista del componente'
    for (const col of [2, 3, 4]) {
      const c = ws.getCell(headRow, col)
      c.font = { bold: true, size: 10 }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUBHEAD_BG } }
      c.alignment = { vertical: 'middle' }
    }
    row++

    const fieldStartRow = row
    const fields = def?.fields || []
    for (const f of fields) {
      const c1 = ws.getCell(row, 2)
      c1.value = f.label
      c1.font = { bold: true, size: 10 }
      c1.alignment = { vertical: 'top', wrapText: true }
      const c2 = ws.getCell(row, 3)
      c2.value = fieldToText(f, comp.content?.[f.key]) || '—'
      c2.alignment = { vertical: 'top', wrapText: true }
      c2.font = { size: 10 }
      // bordes suaves
      for (const col of [2, 3]) {
        ws.getCell(row, col).border = {
          top: { style: 'thin', color: { argb: 'FFE4E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE4E7EB' } },
        }
      }
      row++
    }
    const fieldEndRow = Math.max(row - 1, fieldStartRow)

    // Imagen del componente, anclada en la col D abarcando las filas de campos.
    const dataUrl = await snapshot(getNode(comp.id))
    if (dataUrl) {
      const imgId = wb.addImage({ base64: dataUrl, extension: 'png' })
      // Escalar a ~360px de ancho manteniendo proporcion.
      const probe = await loadSize(dataUrl)
      const w = 360
      const h2 = probe ? Math.round((probe.h / probe.w) * w) : 200
      ws.addImage(imgId, {
        tl: { col: 3.05, row: headRow + 0.1 },
        ext: { width: w, height: h2 },
        editAs: 'oneCell',
      })
      // asegurar alto suficiente en las filas de campos para que la imagen entre
      const needRows = Math.ceil(h2 / 18)
      const haveRows = fieldEndRow - fieldStartRow + 1
      if (needRows > haveRows) {
        // agrega filas vacias debajo para dar espacio a la imagen
        row += (needRows - haveRows)
      }
    }

    row += 2 // separacion entre componentes
  }

  await download(wb, `${safeFileName(page.name)} — Matriz de contenido.xlsx`)
}

function loadSize(dataUrl) {
  return new Promise((res) => {
    const img = new Image()
    img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => res(null)
    img.src = dataUrl
  })
}
