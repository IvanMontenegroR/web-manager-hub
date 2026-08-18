// Export de la "matriz de contenido" de una pagina a Excel para que los MERCADOS
// (no tecnicos) carguen el contenido visual (links de imagenes, titulos, textos...)
// y adelanten trabajo. Layout: a la IZQUIERDA los campos de cada componente (una
// fila por campo; las listas se abren por item, ej. cada card con sus campos), y a
// la DERECHA la imagen del componente renderizado con su contenido. Solo se exportan
// los campos VISUALES (los tecnicos del CMS se marcan `cms:true` y se omiten).
import ExcelJS from 'exceljs'
import html2canvas from 'html2canvas'
import { getComponent, fieldToText, getSpecs, visibleFields, componentHasImage, excelSkip } from '../data/components'
import { PURINA_LOGO_B64 } from './purinaLogo'
import { stripLinks, extractLinks } from './richText'

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
    // Componentes de tema oscuro (paginas de marca oscura): se capturan sobre fondo
    // negro para que el texto claro se vea (sobre blanco quedaria invisible).
    const isDark = node.classList?.contains('cp-dark') || !!node.closest?.('.cp-dark, .pb-page--dark')
    // Pre-resolver todas las imagenes del nodo a dataURL (una vez, deduplicado).
    const srcs = Array.from(new Set(
      Array.from(node.querySelectorAll('img')).map((im) => im.getAttribute('src')).filter(Boolean),
    ))
    const srcMap = new Map()
    await Promise.all(srcs.map(async (s) => { srcMap.set(s, await resolveImg(s)) }))

    const canvas = await html2canvas(node, {
      backgroundColor: isDark ? '#0d0d0f' : '#ffffff', scale: 2, useCORS: true, logging: false,
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

function loadImgEl(dataUrl) {
  return new Promise((res) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = () => res(null)
    img.src = dataUrl
  })
}

// Apila varias capturas (header, cada componente, footer) en UNA sola imagen alta:
// la pagina entera como se veria armada. Todas se llevan al mismo ancho.
const STACK_W = 1180      // ancho de la pagina compuesta (desktop)
const STACK_MAX_H = 24000 // tope de alto: arriba de esto el canvas del browser falla
async function stackImages(dataUrls, bg = '#ffffff') {
  const imgs = []
  for (const d of dataUrls) { const im = d ? await loadImgEl(d) : null; if (im && im.naturalWidth) imgs.push(im) }
  if (!imgs.length) return null
  let w = STACK_W
  const hAt = (width) => imgs.reduce((a, im) => a + Math.round(im.naturalHeight * (width / im.naturalWidth)), 0)
  let h = hAt(w)
  // Paginas muy largas: se achica el ancho para no pasar el tope de alto del canvas.
  if (h > STACK_MAX_H) { w = Math.floor(w * (STACK_MAX_H / h)); h = hAt(w) }
  try {
    const cv = document.createElement('canvas')
    cv.width = w
    cv.height = h
    const ctx = cv.getContext('2d')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)
    let y = 0
    for (const im of imgs) {
      const ih = Math.round(im.naturalHeight * (w / im.naturalWidth))
      ctx.drawImage(im, 0, y, w, ih)
      y += ih
    }
    return cv.toDataURL('image/png')
  } catch { return null }
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

// Marco (perimetro) alrededor de un rango, en cualquier worksheet.
function drawBox(ws, r1, r2, c1, c2, argb, style = 'medium') {
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

// components = [{ id, component_key, content }] en orden.
// getNode(id) devuelve el nodo DOM (.cp-render) del preview de ese componente.
export async function exportPageMatrix(page, components, getNode, opts = {}) {
  const withMetas = opts.metas !== false // por defecto se incluyen las metas (SEO)
  const withFull = opts.fullPage !== false // ...y la imagen de la pagina entera
  // Con 2+ banners (galeria de todos los tipos): el PRIMERO (Main Hero) queda en la
  // matriz como un componente normal, y los OTROS tipos se muestran a su DERECHA, en la
  // misma hoja (bloques en columnas F+). Con 1 solo (pagina del builder) queda inline.
  const isBanner = (c) => getComponent(c.component_key)?.key === 'banner'
  const bannerComps = components.filter(isBanner)
  const useStrip = bannerComps.length >= 2
  const firstBanner = bannerComps[0]
  const otherBanners = useStrip ? bannerComps.slice(1) : []
  const mainComps = useStrip ? components.filter((c) => !isBanner(c) || c === firstBanner) : components
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Web Manager Hub'
  const ws = wb.addWorksheet(safeFileName(page.name).slice(0, 28) || 'Pagina', {
    views: [{ showGridLines: false }],
  })
  const E_W = 70 // ancho (chars) de la columna de imagen
  const columns = [
    { width: 2 },     // A: margen
    { width: 30 },    // B: campo
    { width: 52 },    // C: contenido
    { width: 2 },     // D: separacion
    { width: E_W },   // E: imagen
  ]
  // Columnas para los OTROS tipos de banner a la derecha (bloque: campo 20, contenido 42).
  const STRIP_C0 = columns.length + 2 // 1-based col del primer bloque (F=gap, G=label...)
  if (useStrip) { columns.push({ width: 3 }); for (const _ of otherBanners) columns.push({ width: 20 }, { width: 42 }, { width: 3 }) }
  // Ultima columna, a la derecha de TODO: la pagina entera renderizada (una sola
  // imagen, sin division por campos), para ver de un vistazo como quedaria armada.
  const FULL_W = 64
  if (withFull) columns.push({ width: 3 }, { width: FULL_W })
  const FULL_COL = withFull ? columns.length - 1 : -1 // 0-based
  const FULL_MAX_W = Math.round(FULL_W * 7 + 5) - 24
  ws.columns = columns
  const IMG_COL = 4 // 0-based -> columna E
  // Ancho interior de la col E en px (aprox Excel: chars*7 + 5). La imagen se topea
  // a ese ancho MENOS un margen, para que SIEMPRE quede dentro del marco (no se sale).
  const E_PX = Math.round(E_W * 7 + 5)
  const IMG_MAX_W = E_PX - 34
  const IMG_MAX_H = 320

  const setH = (r, h) => { ws.getRow(r).height = Math.max(ws.getRow(r).height || 0, h) }

  // Capturas memoizadas por (componente, ancho): la imagen de cada seccion y la de la
  // pagina entera comparten la misma captura cuando el ancho coincide.
  const shots = new Map()
  async function shotFor(id, node, w) {
    const k = `${id}:${w}`
    if (!shots.has(k)) shots.set(k, await snapshot(node, w))
    return shots.get(k)
  }

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

  // Renderiza un tipo de banner como bloque (nombre + tamaño + imagen + campos) en las
  // columnas [c, c+1] desde topRow. Sirve para los OTROS tipos, a la derecha del primero.
  async function bannerBlock(comp, topRow, c) {
    const c2 = c + 1
    const content = comp.content || {}
    const bdef = getComponent('banner')
    const thin = { style: 'thin', color: { argb: BORDER } }
    let r = topRow
    ws.mergeCells(r, c, r, c2)
    const nm = ws.getCell(r, c)
    nm.value = content.type || 'Banner'
    nm.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
    nm.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PURINA_RED } }
    nm.alignment = { vertical: 'middle', indent: 1 }
    setH(r, 22); r++
    ws.mergeCells(r, c, r, c2)
    const sz = ws.getCell(r, c)
    sz.value = (getSpecs(bdef, content).map((s) => [s.ratio, s.desktop && `Desktop ${s.desktop}`, s.mobile && `Mobile ${s.mobile}`, s.max && `Max ${s.max}`, s.format].filter(Boolean).join('  -  ')).join('\n') || '—').replace(/·/g, '-')
    sz.font = { italic: true, size: 9, color: { argb: PURINA_RED } }
    sz.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUBHEAD_BG } }
    sz.alignment = { vertical: 'top', wrapText: true }
    setH(r, 40); r++
    const dataUrl = await snapshot(getNode(comp.id), CAP_W)
    if (dataUrl) {
      const probe = await loadSize(dataUrl)
      const nat = probe || { w: 1180, h: 400 }
      const { w, h } = fit(nat.w, nat.h, 430, 240)
      const imgId = wb.addImage({ base64: dataUrl, extension: 'png' })
      ws.addImage(imgId, { tl: { col: (c - 1) + 0.04, row: (r - 1) + 0.1 }, ext: { width: w, height: h }, editAs: 'oneCell' })
      const rows = Math.ceil((h * 0.75 + 8) / 13)
      for (let k = 0; k < rows; k++) setH(r + k, 13)
      r += rows
    }
    ws.getCell(r, c).value = 'Campo'; ws.getCell(r, c2).value = 'Contenido'
    for (const cc of [c, c2]) { const cell = ws.getCell(r, cc); cell.font = { bold: true, size: 9 }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUBHEAD_BG } }; cell.border = { top: thin, bottom: thin, left: thin, right: thin } }
    setH(r, 16); r++
    const bf = (label, value, sub) => {
      const a = ws.getCell(r, c); a.value = label; a.font = { bold: !sub, size: 9, color: { argb: 'FF1F2530' } }; a.alignment = { vertical: 'top', wrapText: true, indent: sub ? 1 : 0 }
      const empty = value == null || value === ''
      const b = ws.getCell(r, c2); b.value = empty ? EMPTY : value; b.font = { size: 9, color: { argb: empty ? MUTED : 'FF1F2530' } }; b.alignment = { vertical: 'top', wrapText: true }
      for (const cc of [c, c2]) ws.getCell(r, cc).border = { top: thin, bottom: thin, left: thin, right: thin }
      setH(r, 16); r++
    }
    const bc = (text) => { ws.mergeCells(r, c, r, c2); const cell = ws.getCell(r, c); cell.value = text; cell.font = { bold: true, size: 9, color: { argb: 'FF7A1216' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CARD_BG } }; cell.alignment = { vertical: 'middle', indent: 1 }; setH(r, 16); r++ }
    for (const f of visibleFields(bdef, content, { excel: true })) {
      if (f.type === 'list') {
        const items = Array.isArray(content[f.key]) && content[f.key].length ? content[f.key] : [{}]
        items.forEach((it, k) => {
          bc(`${f.itemLabel || f.label} ${k + 1}`)
          for (const sf of (f.item || []).filter((sf) => !sf.cms && !excelSkip(sf, it[sf.key]))) bf(sf.label, fieldToText(sf, it[sf.key]), true)
        })
      } else if (!excelSkip(f, content[f.key])) { bf(f.label, fieldToText(f, content[f.key])) }
    }
    drawBox(ws, topRow, r - 1, c, c2, PURINA_RED)
    return r - 1
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

  // Fila campo/contenido en el bloque izquierdo (B=campo, C=contenido). Con
  // opts.disabled los campos se pintan grises (componente reutilizable: no se edita aca).
  function fieldRow(atRow, label, value, opts = {}) {
    const disabled = !!opts.disabled
    const c1 = ws.getCell(atRow, 2)
    c1.value = label
    c1.font = { bold: !opts.sub, size: 10, color: { argb: disabled ? MUTED : (opts.color || 'FF1F2530') } }
    c1.alignment = { vertical: 'top', wrapText: true, indent: opts.sub ? 1 : 0 }
    const c2 = ws.getCell(atRow, 3)
    const empty = value == null || value === ''
    if (opts.link != null) {
      // Fila de ENLACE: la celda lleva el hipervinculo real (en xlsx el link es por
      // celda). Sin URL cargada queda una pista gris para que el mercado la pegue.
      if (opts.link) {
        c2.value = { text: opts.link, hyperlink: opts.link }
        c2.font = { size: 10, underline: true, color: { argb: 'FF0563C1' } }
      } else {
        c2.value = 'Pegá acá el link'
        c2.font = { size: 10, italic: true, color: { argb: MUTED } }
      }
      c2.alignment = { vertical: 'top', wrapText: true }
    } else {
      // Si esta vacio y hay placeholder (ej. "SEO Agency"), se muestra como pista gris.
      c2.value = empty ? (opts.placeholder || EMPTY) : value
      c2.font = { size: 10, italic: !!opts.italic || (empty && !!opts.placeholder) || disabled, color: { argb: (empty || disabled) ? MUTED : 'FF1F2530' } }
      c2.alignment = { vertical: 'top', wrapText: true }
    }
    const thin = { style: 'thin', color: { argb: BORDER } }
    const fill = opts.fill || (disabled ? SUBHEAD_BG : null)
    for (const col of [2, 3]) {
      ws.getCell(atRow, col).border = { top: thin, bottom: thin, left: thin, right: thin }
      if (fill) ws.getCell(atRow, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }
    }
    setH(atRow, estHeight(value))
    return atRow + 1
  }

  // Campo de texto + sus enlaces. El texto va SIN las marcas (se lee natural) y cada
  // enlace baja a su propia fila, con el hipervinculo real: en xlsx el link es por
  // celda, asi que un parrafo con varios enlaces no puede tenerlos todos adentro.
  function textRows(atRow, label, value, opts = {}) {
    const links = extractLinks(value)
    let r = fieldRow(atRow, label, stripLinks(value), opts)
    for (const l of links) {
      r = fieldRow(r, `Link - ${l.text}`, '', { ...opts, sub: true, link: l.url })
    }
    return r
  }

  // Franja de card dentro de una lista (ej. "Marca 1"), merge B..C. Gris si disabled.
  function cardBand(atRow, text, opts = {}) {
    const disabled = !!opts.disabled
    ws.mergeCells(atRow, 2, atRow, 3)
    const c = ws.getCell(atRow, 2)
    c.value = text
    c.font = { bold: true, size: 10, color: { argb: disabled ? MUTED : 'FF7A1216' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: disabled ? SUBHEAD_BG : CARD_BG } }
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
  ws.getCell(3, 2).value = 'Completá el contenido visual de cada componente (izquierda) según la imagen de referencia (derecha): pegá los links de las imágenes/videos, títulos, textos y links. No hace falta saber del CMS. Al final de la hoja, más a la derecha, está la página entera armada para verla de un vistazo.'
  ws.getCell(3, 2).font = { italic: true, size: 10, color: { argb: MUTED } }
  ws.getCell(3, 2).alignment = { wrapText: true, vertical: 'top' }
  setH(3, 30)
  let row = 5

  // Componentes: banda -> [campos izquierda | imagen derecha].
  // El breadcrumb (matrixExclude) no se exporta: se arma solo, no lleva contenido.
  let idx = 0
  for (const comp of mainComps) {
    const def = getComponent(comp.component_key)
    if (def?.matrixExclude) continue
    idx++
    const content = comp.content || {}
    const topRow = row

    // Banda de titulo (bloque izquierdo). En los banners, el subtipo (Banner Type)
    // va entre parentesis para saber de que banner se trata.
    const subtype = def?.key === 'banner' && content.type ? ` (${content.type})` : ''
    row = bandTitle(row, `${idx}. ${def?.name || comp.component_key}${subtype}`, PURINA_RED)

    // Componente REUTILIZABLE (Selector de especie, Banner CTA): se configura una sola
    // vez para todo el sitio. Los campos SE MUESTRAN pero DESHABILITADOS (grises) para
    // dejar claro que en esta pagina no se modifican.
    const disabled = !!def?.reusable
    if (disabled) {
      ws.mergeCells(row, 2, row, 3)
      const nc = ws.getCell(row, 2)
      nc.value = 'Componente reutilizable: se configura una sola vez para todo el sitio. En esta página no se modifica (campos deshabilitados).'
      nc.font = { italic: true, size: 10, color: { argb: MUTED } }
      nc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUBHEAD_BG } }
      nc.alignment = { vertical: 'top', wrapText: true, indent: 1 }
      const thin0 = { style: 'thin', color: { argb: BORDER } }
      for (const col of [2, 3]) ws.getCell(row, col).border = { top: thin0, bottom: thin0, left: thin0, right: thin0 }
      setH(row, 30)
      row++
    }

    // Tamano de imagen recomendado (si aplica). Los reutilizables no cargan imagenes
    // por pagina, asi que se omite.
    if (!disabled) {
      for (const s of getSpecs(def, content)) {
        const label = 'Tamaño de imagen' + (s.label ? ` — ${s.label}` : '')
        const parts = [s.ratio, s.desktop && `Desktop ${s.desktop}`, s.mobile && `Mobile ${s.mobile}`, s.max && `Max ${s.max}`, s.format].filter(Boolean).join('  -  ').replace(/·/g, '-')
        row = fieldRow(row, label, parts, { color: PURINA_RED, italic: true, fill: SUBHEAD_BG })
      }
    }

    // Cabecera Campo | Contenido.
    const thin = { style: 'thin', color: { argb: BORDER } }
    ws.getCell(row, 2).value = 'Campo'
    ws.getCell(row, 3).value = disabled ? 'Contenido (no editable)' : 'Contenido a cargar'
    for (const col of [2, 3]) {
      const c = ws.getCell(row, col)
      c.font = { bold: true, size: 10, color: { argb: disabled ? MUTED : 'FF1F2530' } }
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
        const stored = Array.isArray(content[f.key]) ? content[f.key] : []
        // Lista de tamaño fijo (ej. mosaico = 6 bloques): se rellena a `fixed`.
        const arr = f.fixed
          ? Array.from({ length: f.fixed }, (_, i) => stored[i] || {})
          : (stored.length ? stored : [{}])
        const one = f.itemLabel || f.label
        arr.forEach((item, i) => {
          const role = f.roles ? f.roles[i] : null
          row = cardBand(row, `${one} ${i + 1}${role ? ` — ${role}` : ''}`, { disabled })
          // Con roles, cada bloque muestra solo los subcampos de su rol.
          // Ademas de los tecnicos (cms) y los que no son de este rol, se omiten los
          // que quedaron en su `noneOption` (ej. "Aplica a: Sin iconos"): no hay nada
          // que cargar, seria una fila de ruido.
          const subFields = (f.item || []).filter((sf) => !sf.cms && (!sf.roles || !role || sf.roles.includes(role)) && !excelSkip(sf, item[sf.key]))
          for (const sf of subFields) {
            row = textRows(row, sf.label, fieldToText(sf, item[sf.key]), { sub: true, disabled })
          }
        })
      } else if (!excelSkip(f, content[f.key])) {
        row = textRows(row, f.label, fieldToText(f, content[f.key]), { disabled })
      }
    }

    // Imagen del componente en la columna E. Se captura a ancho DESKTOP (CAP_W) para
    // que renderice como en la pagina real; algunos (ej. 50/50) definen un exportWidth
    // mas angosto para no salir tan bajos. Se ubica centrada dentro del marco.
    const dataUrl = await shotFor(comp.id, getNode(comp.id), def?.exportWidth || CAP_W)
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
      // Alt Text (placeholder "SEO Agency") SOLO en componentes que tienen imagen(es).
      // La primera fila cuyo TOPE queda por debajo del pie de la imagen, asi no la pisa.
      if (componentHasImage(def)) {
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
    }

    // Marco alrededor de todo el componente (campos + imagen) para que se entienda
    // que contenido va con que componente.
    boxBorder(topRow, lastRow, 2, 5, PURINA_RED)

    // Si es el primer banner y hay mas tipos, se muestran a la DERECHA (columnas F+),
    // en la misma hoja, cada uno como su propio bloque.
    if (useStrip && comp === firstBanner) {
      let bottom = lastRow
      for (let k = 0; k < otherBanners.length; k++) {
        const end = await bannerBlock(otherBanners[k], topRow, STRIP_C0 + k * 3)
        if (end > bottom) bottom = end
      }
      if (bottom > lastRow) row = bottom + 1 // dejar sitio si algun tipo quedo mas alto
    }

    row += 1 // separacion entre componentes
  }

  // La PAGINA ENTERA renderizada, a la derecha de todo: header + los componentes en
  // orden + footer, apilados en una sola imagen. No lleva campos: es la referencia
  // visual de como quedaria la pagina armada, al lado del detalle de cada seccion.
  if (withFull) {
    const chrome = opts.chrome || {}
    const parts = []
    if (chrome.header) parts.push(await snapshot(chrome.header, CAP_W))
    for (const comp of components) parts.push(await shotFor(comp.id, getNode(comp.id), CAP_W))
    if (chrome.footer) parts.push(await snapshot(chrome.footer, CAP_W))
    const full = await stackImages(parts, opts.pageBg || '#ffffff')
    if (full) {
      const nat = (await loadSize(full)) || { w: STACK_W, h: STACK_W }
      const w = Math.min(FULL_MAX_W, nat.w)
      const h = Math.round(nat.h * (w / nat.w))
      const band = ws.getCell(5, FULL_COL + 1)
      band.value = 'La página completa'
      band.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
      band.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PURINA_RED } }
      band.alignment = { vertical: 'middle', indent: 1 }
      setH(5, 22)
      const imgId = wb.addImage({ base64: full, extension: 'png' })
      ws.addImage(imgId, { tl: { col: FULL_COL, row: 5 }, ext: { width: w, height: h }, editAs: 'oneCell' })
    }
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
