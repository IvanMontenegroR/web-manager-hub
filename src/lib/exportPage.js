// Export de la "matriz de contenido" de una pagina a Excel para que los MERCADOS
// (no tecnicos) carguen el contenido visual (links de imagenes, titulos, textos...)
// y adelanten trabajo. Layout: a la IZQUIERDA los campos de cada componente (una
// fila por campo; las listas se abren por item, ej. cada card con sus campos), y a
// la DERECHA la imagen del componente renderizado con su contenido. Solo se exportan
// los campos VISUALES (los tecnicos del CMS se marcan `cms:true` y se omiten).
import ExcelJS from 'exceljs'
import html2canvas from 'html2canvas'
import { getComponent, fieldToText, getSpecs, visibleFields } from '../data/components'
import { PURINA_LOGO_B64 } from './purinaLogo'

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

// html2canvas NO puede leer los pixeles de una imagen cross-origin cuyo host no manda
// header CORS -> la dibuja en blanco. Por eso, antes de capturar, cada imagen se
// pre-convierte a dataURL: 1) intento directo con crossOrigin (hosts con CORS, ej.
// Supabase Storage); 2) via proxy CORS (images.weserv.nl) para links sin CORS; 3) si
// aun asi no se puede, se reemplaza por un recuadro con el link (nunca queda en blanco).
const IMG_CACHE = new Map()

function loadToDataUrl(src) {
  return new Promise((res) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const cv = document.createElement('canvas')
        cv.width = img.naturalWidth || 1
        cv.height = img.naturalHeight || 1
        cv.getContext('2d').drawImage(img, 0, 0)
        res(cv.toDataURL('image/png'))
      } catch { res(null) }
    }
    img.onerror = () => res(null)
    img.src = src
  })
}

// URL a traves del proxy de imagenes (agrega CORS) para hosts que no lo mandan.
function weservUrl(url) {
  try {
    const u = new URL(url, window.location.href)
    const prefix = u.protocol === 'https:' ? 'ssl:' : ''
    return 'https://images.weserv.nl/?url=' + encodeURIComponent(prefix + u.host + u.pathname + u.search)
  } catch { return null }
}

// Resuelve una URL de imagen a dataURL (o null si no se pudo capturar de ningun modo).
async function resolveImg(src) {
  if (!src || src.startsWith('data:')) return src || null
  if (IMG_CACHE.has(src)) return IMG_CACHE.get(src)
  let out = await loadToDataUrl(src)
  if (!out) { const w = weservUrl(src); if (w) out = await loadToDataUrl(w) }
  IMG_CACHE.set(src, out)
  return out
}

// Placeholder (para el clon de html2canvas) cuando una imagen no se pudo capturar.
function imgPlaceholder(doc, url) {
  const box = doc.createElement('div')
  box.textContent = url ? `Imagen: ${url}` : 'Imagen'
  box.setAttribute('style', 'box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:100%;height:100%;min-height:140px;background:#eceff2;color:#6b727b;font:12px sans-serif;padding:14px;text-align:center;word-break:break-all;border-radius:8px;')
  return box
}

// Captura un nodo del DOM a PNG (dataURL). Devuelve null si falla.
async function snapshot(node, forceWidth) {
  if (!node) return null
  const w = forceWidth || node.offsetWidth || 800
  const prevWidth = node.style.width
  node.style.width = w + 'px'
  try {
    const h = node.offsetHeight || 300
    // Pre-resolver todas las imagenes del nodo a dataURL (una vez, deduplicado).
    const srcs = Array.from(new Set(
      Array.from(node.querySelectorAll('img')).map((im) => im.getAttribute('src')).filter(Boolean),
    ))
    const srcMap = new Map()
    await Promise.all(srcs.map(async (s) => { srcMap.set(s, await resolveImg(s)) }))

    const canvas = await html2canvas(node, {
      backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: false,
      width: w, height: h, windowWidth: w, windowHeight: h,
      onclone: (doc, clone) => {
        const scope = clone && clone.querySelectorAll ? clone : doc
        scope.querySelectorAll('img').forEach((im) => {
          const s = im.getAttribute('src')
          const d = srcMap.get(s)
          if (d) { im.setAttribute('src', d); im.removeAttribute('crossorigin') }
          else if (s && !s.startsWith('data:')) { im.replaceWith(imgPlaceholder(doc, s)) }
        })
        // Los <video> no los captura html2canvas: se muestran como placeholder.
        scope.querySelectorAll('video').forEach((v) => {
          v.replaceWith(imgPlaceholder(doc, v.getAttribute('src') || ''))
        })
      },
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

// Ancho de captura de los componentes: se fuerza a desktop para que rendericen
// como en la pagina real (imagenes anchas y bajas), sin depender del ancho del
// canvas de edicion (que produce capturas altas y angostas que se pisan).
const CAP_W = 1180

// components = [{ id, component_key, content }] en orden.
// getNode(id) devuelve el nodo DOM (.cp-render) del preview de ese componente.
export async function exportPageMatrix(page, components, getNode, opts = {}) {
  const withMetas = opts.metas !== false // por defecto se incluyen las metas (SEO)
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Web Manager Hub'
  const ws = wb.addWorksheet(safeFileName(page.name).slice(0, 28) || 'Pagina', {
    views: [{ showGridLines: false }],
  })
  const E_W = 70 // ancho (chars) de la columna de imagen
  ws.columns = [
    { width: 2 },     // A: margen
    { width: 30 },    // B: campo
    { width: 52 },    // C: contenido
    { width: 2 },     // D: separacion
    { width: E_W },   // E: imagen
  ]
  const IMG_COL = 4 // 0-based -> columna E
  // Ancho interior de la col E en px (aprox Excel: chars*7 + 5). La imagen se topea
  // a ese ancho MENOS un margen, para que SIEMPRE quede dentro del marco (no se sale).
  const E_PX = Math.round(E_W * 7 + 5)
  const IMG_MAX_W = E_PX - 34
  const IMG_MAX_H = 320

  const setH = (r, h) => { ws.getRow(r).height = Math.max(ws.getRow(r).height || 0, h) }

  // Prepara la imagen: la registra en el workbook y calcula su tamaño encajado en la
  // celda de imagen. Devuelve { id, w, h, hpt } o null. El alto en pt (hpt) sirve para
  // reservar filas. NO la ancla todavia (se ubica centrada despues de armar el marco).
  async function prepImage(dataUrl) {
    if (!dataUrl) return null
    const probe = await loadSize(dataUrl)
    const nat = probe || { w: 1180, h: 620 }
    const { w, h } = fit(nat.w, nat.h, IMG_MAX_W, IMG_MAX_H)
    const id = wb.addImage({ base64: dataUrl, extension: 'png' })
    return { id, w, h, hpt: h * 0.75 }
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
    const empty = value == null || value === ''
    // Si esta vacio y hay placeholder (ej. "SEO Agency"), se muestra como pista gris.
    c2.value = empty ? (opts.placeholder || EMPTY) : value
    c2.font = { size: 10, italic: !!opts.italic || (empty && !!opts.placeholder), color: { argb: empty ? MUTED : 'FF1F2530' } }
    c2.alignment = { vertical: 'top', wrapText: true }
    const thin = { style: 'thin', color: { argb: BORDER } }
    for (const col of [2, 3]) {
      ws.getCell(atRow, col).border = { top: thin, bottom: thin, left: thin, right: thin }
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
    const thin = { style: 'thin', color: { argb: BORDER } }
    ws.getCell(atRow, 2).border = { top: thin, bottom: thin, left: thin }
    ws.getCell(atRow, 3).border = { top: thin, bottom: thin, right: thin }
    setH(atRow, 18)
    return atRow + 1
  }

  // Dibuja un marco (perimetro) alrededor de un rango de celdas, para agrupar
  // visualmente los campos (izquierda) con la imagen del componente (derecha).
  function boxBorder(r1, r2, c1, c2, argb, style = 'medium') {
    const side = { style, color: { argb } }
    for (let c = c1; c <= c2; c++) {
      const top = ws.getCell(r1, c); top.border = { ...top.border, top: side }
      const bot = ws.getCell(r2, c); bot.border = { ...bot.border, bottom: side }
    }
    for (let r = r1; r <= r2; r++) {
      const lc = ws.getCell(r, c1); lc.border = { ...lc.border, left: side }
      const rc = ws.getCell(r, c2); rc.border = { ...rc.border, right: side }
    }
  }

  // Banda superior con el logo Purina.
  ws.mergeCells(1, 2, 1, 5)
  ws.getCell(1, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD_BG } }
  setH(1, 34)
  const logoId = wb.addImage({ base64: PURINA_LOGO_B64, extension: 'png' })
  // Aspect real del logo oficial (1526x330 ~= 4.62); se respeta para no deformarlo.
  ws.addImage(logoId, { tl: { col: 1.12, row: 0.2 }, ext: { width: 148, height: 32 } })

  // Titulo de la pagina + instrucciones para el mercado.
  ws.mergeCells(2, 2, 2, 5)
  const title = ws.getCell(2, 2)
  title.value = `${page.name}${page.path ? '  -  ' + page.path : ''}`
  title.font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } }
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD_BG } }
  title.alignment = { vertical: 'middle', indent: 1 }
  setH(2, 26)
  ws.mergeCells(3, 2, 3, 5)
  ws.getCell(3, 2).value = 'Completá el contenido visual de cada componente (izquierda) según la imagen de referencia (derecha): pegá los links de las imágenes/videos, títulos, textos y links. No hace falta saber del CMS.'
  ws.getCell(3, 2).font = { italic: true, size: 10, color: { argb: MUTED } }
  ws.getCell(3, 2).alignment = { wrapText: true, vertical: 'top' }
  setH(3, 30)
  let row = 5

  // Componentes: banda -> [campos izquierda | imagen derecha].
  // El breadcrumb (matrixExclude) no se exporta: se arma solo, no lleva contenido.
  let idx = 0
  for (const comp of components) {
    const def = getComponent(comp.component_key)
    if (def?.matrixExclude) continue
    idx++
    const content = comp.content || {}
    const topRow = row

    // Banda de titulo (bloque izquierdo). En los banners, el subtipo (Banner Type)
    // va entre parentesis para saber de que banner se trata.
    const subtype = def?.key === 'banner' && content.type ? ` (${content.type})` : ''
    row = bandTitle(row, `${idx}. ${def?.name || comp.component_key}${subtype}`, PURINA_RED)

    if (def?.reusable) {
      // Componente REUTILIZABLE (ej. Footer banner): no se carga contenido por
      // pagina. Se muestra solo la imagen de referencia + una nota.
      ws.mergeCells(row, 2, row, 3)
      const nc = ws.getCell(row, 2)
      nc.value = 'Componente reutilizable: se configura una sola vez para todo el sitio. No se carga contenido por página.'
      nc.font = { italic: true, size: 10, color: { argb: MUTED } }
      nc.alignment = { vertical: 'top', wrapText: true, indent: 1 }
      setH(row, 30)
      row++
    } else {
      // Tamano de imagen recomendado (si aplica).
      for (const s of getSpecs(def, content)) {
        const label = 'Tamaño de imagen' + (s.label ? ` — ${s.label}` : '')
        const parts = [s.ratio, s.desktop && `Desktop ${s.desktop}`, s.mobile && `Mobile ${s.mobile}`, s.max && `Max ${s.max}`, s.format].filter(Boolean).join('  -  ').replace(/·/g, '-')
        row = fieldRow(row, label, parts, { color: PURINA_RED, italic: true, fill: SUBHEAD_BG })
      }

      // Cabecera Campo | Contenido.
      const thin = { style: 'thin', color: { argb: BORDER } }
      ws.getCell(row, 2).value = 'Campo'
      ws.getCell(row, 3).value = 'Contenido a cargar'
      for (const col of [2, 3]) {
        const c = ws.getCell(row, col)
        c.font = { bold: true, size: 10 }
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUBHEAD_BG } }
        c.alignment = { vertical: 'middle' }
        c.border = { top: thin, bottom: thin, left: thin, right: thin }
      }
      setH(row, 18)
      row++

      // Campos VISUALES (los cms:true se omiten). Las listas se abren por item,
      // con etiqueta SINGULAR (Marca 1, Producto 1, Articulo 1...).
      const visible = visibleFields(def, content, { excel: true })
      for (const f of visible) {
        if (f.type === 'list') {
          const items = Array.isArray(content[f.key]) ? content[f.key] : []
          const arr = items.length ? items : [{}] // al menos 1 plantilla vacia
          const subFields = (f.item || []).filter((sf) => !sf.cms)
          const one = f.itemLabel || f.label
          arr.forEach((item, i) => {
            row = cardBand(row, `${one} ${i + 1}`)
            for (const sf of subFields) {
              row = fieldRow(row, sf.label, fieldToText(sf, item[sf.key]), { sub: true })
            }
          })
        } else {
          row = fieldRow(row, f.label, fieldToText(f, content[f.key]))
        }
      }
    }

    // Imagen del componente en la columna E. Se captura a ancho DESKTOP (CAP_W)
    // para que renderice como en la pagina real (ancha y baja). Se ubica centrada
    // verticalmente dentro del marco, encajada en la celda (no se sale del borde).
    const dataUrl = await snapshot(getNode(comp.id), CAP_W)
    const img = await prepImage(dataUrl)
    const PAD = 12     // pt de aire arriba/abajo dentro del marco
    const CAP_GAP = 4  // aire entre la imagen y su Alt Text
    const CAP_H = 16   // fila del Alt Text (debajo de la imagen)
    // El grupo imagen + Alt Text se centra vertical dentro del area del componente.
    const groupHpt = img ? img.hpt + CAP_GAP + CAP_H : 0

    // Reservar filas (debajo de la banda) hasta que quepa el grupo + padding.
    // El +40 da aire para el centrado y el redondeo de filas del Alt Text.
    const areaPt = () => { let a = 0; for (let r = topRow + 1; r < row; r++) a += ws.getRow(r).height || 15; return a }
    while (areaPt() < groupHpt + 40) { setH(row, 16); row++ }
    const lastRow = row - 1

    if (img) {
      let total = 0; for (let r = topRow + 1; r <= lastRow; r++) total += ws.getRow(r).height || 15
      const targetTop = Math.max(0, (total - groupHpt) / 2)
      // Fila donde ancla la imagen (la mas cercana por arriba a targetTop).
      let a = 0, rr = topRow + 1
      while (rr < lastRow) { const hh = ws.getRow(rr).height || 15; if (a + hh > targetTop) break; a += hh; rr++ }
      ws.addImage(img.id, { tl: { col: IMG_COL, row: rr - 1 }, ext: { width: img.w, height: img.h }, editAs: 'oneCell' })
      // Alt Text: la primera fila cuyo TOPE queda por debajo del pie de la imagen
      // (placeholder "SEO Agency" para la agencia SEO), asi nunca pisa la imagen.
      const capTop = a + img.hpt + CAP_GAP
      let b = a, cr = rr
      while (cr < lastRow && b < capTop) { b += ws.getRow(cr).height || 15; cr++ }
      const cap = ws.getCell(cr, IMG_COL + 1)
      cap.value = { richText: [
        { text: 'Alt Text: ', font: { bold: true, size: 9, color: { argb: 'FF1F2530' } } },
        { text: 'SEO Agency', font: { italic: true, size: 9, color: { argb: MUTED } } },
      ] }
      cap.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      setH(cr, CAP_H)
    }

    // Marco alrededor de todo el componente (campos + imagen) para que se entienda
    // que contenido va con que componente.
    boxBorder(topRow, lastRow, 2, 5, PURINA_RED)

    row += 1 // separacion entre componentes
  }

  // Metas de la pagina (SEO) al final de la matriz. Las carga la agencia SEO, por eso
  // el placeholder "SEO Agency". Se omiten cuando el export no es de una pagina real
  // (ej. la galeria "Todos los componentes" pasa metas:false).
  if (withMetas) {
    const metaTop = row
    row = bandTitle(row, 'Metas de la página (SEO)', PURINA_RED, true)
    for (const label of ['Meta title', 'Meta description']) {
      ws.getCell(row, 2).value = label
      ws.getCell(row, 2).font = { bold: true, size: 10, color: { argb: 'FF1F2530' } }
      ws.getCell(row, 2).alignment = { vertical: 'top', wrapText: true }
      ws.mergeCells(row, 3, row, 5)
      const c = ws.getCell(row, 3)
      c.value = 'SEO Agency'
      c.font = { italic: true, size: 10, color: { argb: MUTED } }
      c.alignment = { vertical: 'top', wrapText: true }
      const thin = { style: 'thin', color: { argb: BORDER } }
      for (const col of [2, 3, 4, 5]) ws.getCell(row, col).border = { top: thin, bottom: thin, left: thin, right: thin }
      setH(row, label === 'Meta description' ? 34 : 22)
      row++
    }
    boxBorder(metaTop, row - 1, 2, 5, PURINA_RED)
  }

  await download(wb, `${safeFileName(page.name)} — Matriz de contenido.xlsx`)
}
