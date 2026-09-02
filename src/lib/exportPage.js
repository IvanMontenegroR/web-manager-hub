// Export de la "matriz de contenido" de una pagina a Excel para que los MERCADOS
// (no tecnicos) carguen el contenido visual (links de imagenes, titulos, textos...)
// y adelanten trabajo. Layout: a la IZQUIERDA los campos de cada componente (una
// fila por campo; las listas se abren por item, ej. cada card con sus campos), y a
// la DERECHA la imagen del componente renderizado con su contenido. Solo se exportan
// los campos VISUALES (los tecnicos del CMS se marcan `cms:true` y se omiten).
import ExcelJS from 'exceljs'
import html2canvas from 'html2canvas'
import {
  getComponent, fieldToText, getSpecs, visibleFields, visibleSubFields,
  excelSkip, slotsOf, emptyLabelFor, isMarketField, componentTitle, effectiveValue,
  maxLengthOf, cmsGroupOf,
} from '../data/components'
import { PURINA_LOGO_B64 } from './purinaLogo'
import { stripLinks, extractLinks, toExcelRich, richToPlain } from './richText'

// Las dos hojas del archivo. El nombre es FIJO porque la hoja CMS referencia a la de
// contenido por formula (='Contenido'!C12).
const SHEET_CONTENT = 'Contenido'
const SHEET_CMS = 'CMS'
const MIRROR_BG = 'FFF7F8FA' // celdas espejadas: vienen de la otra hoja, no se editan aca

const PURINA_RED = 'FFED1C24'
const HEAD_BG = 'FF1F2530'
const CARD_BG = 'FFFCE9EA'   // franja de card (rosa muy claro)
const GROUP_BG = 'FFEDEFF2'  // franja de desplegable del CMS (gris muy claro)
const SUBHEAD_BG = 'FFF1F3F5'
const MUTED = 'FF868E99'
const BORDER = 'FFE4E7EB'
const EMPTY = '—'
// Amarillo de "esto lo completa el mercado". Se pinta solo cuando el campo esta VACIO:
// una vez cargado no hay nada pendiente que marcar.
const TODO_BG = 'FFFFF2C2'

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
// Se exporta porque el export del MENU necesita exactamente lo mismo (capturar el
// megamenu abierto a ancho desktop) y duplicar toda la resolucion de imagenes seria
// mantener dos veces el mismo problema.
export async function snapshot(node, forceWidth) {
  if (!node) return null
  const w = forceWidth || node.offsetWidth || 800
  const prevWidth = node.style.width
  node.style.width = w + 'px'
  // Los componentes anidados (dentro de una pestaña) traen su barra de edicion y el
  // boton de agregar: se ocultan ANTES de medir el alto, asi no entran en la captura
  // ni dejan un hueco. html2canvas clona el documento entero, se lleva la clase.
  document.body.classList.add('pb-exporting')
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
    document.body.classList.remove('pb-exporting')
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
// Los items de una lista tal como se exportan. Una lista de tamaño FIJO (ej. el mosaico
// de 6 bloques) se rellena hasta `fixed`; el resto va tal cual esta cargada — sin items
// no hay nada que mostrar.
function listItems(f, content) {
  const stored = Array.isArray(content?.[f.key]) ? content[f.key] : []
  return f.fixed ? Array.from({ length: f.fixed }, (_, i) => stored[i] || {}) : stored
}

// Que tanto formato admite un campo, igual que el mockup: el CUERPO (`textarea`) es
// rich text con bloques — parrafos y listas, como <Rich> —; un campo de una linea
// (titulos, subtitulos, textos de boton) admite solo lo inline, como <RT>. El resto
// (selects, urls, checkboxes) no lleva formato.
function richKind(f) {
  return f?.type === 'textarea' ? 'textarea' : f?.type === 'text' ? 'text' : null
}

// Etiqueta del campo en la hoja Contenido. Un campo con largo acotado por el diseño (la
// descripcion de una card apaisada) lo aclara ACA: es la unica forma de que el mercado se
// entere, porque en el Excel no hay contador que se lo diga mientras escribe. La hoja CMS
// no lo lleva: ahi las etiquetas son las de Drupal, textuales.
function marketLabel(f, content) {
  const max = maxLengthOf(f, content)
  return max ? `${f.label} (máx. ${max} caracteres)` : f.label
}

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
  // Tira de banners: SOLO para la galeria "Todos los componentes" (`bannerStrip`), que
  // muestra un banner por tipo. Ahi el PRIMERO queda en la matriz como un componente
  // normal y los OTROS tipos van a su DERECHA (bloques en columnas F+). En una pagina de
  // verdad NO aplica: dos banners no son dos variantes de lo mismo, son dos bloques —
  // tipicamente los slides de un Carrusel de banners — y cada uno va en su lugar.
  const isBanner = (c) => getComponent(c.component_key)?.key === 'banner'
  const bannerComps = components.filter(isBanner)
  const useStrip = opts.bannerStrip === true && bannerComps.length >= 2
  const firstBanner = bannerComps[0]
  const otherBanners = useStrip ? bannerComps.slice(1) : []
  const mainComps = useStrip ? components.filter((c) => !isBanner(c) || c === firstBanner) : components
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Web Manager Hub'
  // Nombre FIJO: la hoja CMS la referencia por formula, asi que no puede depender del
  // nombre de la pagina.
  const ws = wb.addWorksheet(SHEET_CONTENT, { views: [{ showGridLines: false }] })
  // Donde quedo cada campo en esta hoja: `${compId}|${path}` -> fila. La hoja CMS
  // apunta ahi con una formula, asi el editor ve lo que carga el mercado sin copiarlo.
  const cellRef = new Map()
  const imgByComp = new Map()   // compId -> imagen ya registrada en el workbook
  // Cada hoja nombra la seccion en SU idioma, y el NUMERO es el mismo en las dos: es lo
  // que permite cruzarlas ("2. Cards con icono" de un lado, "2. Content: Card Grid" del
  // otro). El mercado lee el nombre de la app; el editor, el del paragraph de Drupal.
  const labelByComp = new Map()    // compId -> "3.1.2. Cards con icono"  (hoja Contenido)
  const cmsLabelByComp = new Map() // compId -> "3.1.2. Content: Card Grid" (hoja CMS)
  // Orden en que salieron las secciones en la hoja Contenido. La hoja CMS va EN ESE MISMO
  // orden: si se recorriera la lista plana de componentes, los hijos de un contenedor se
  // mezclarian con los bloques sueltos (su `sort_order` es por GRUPO, no global) y el
  // "6.1.1" caeria entre el 1 y el 2. Se llena en `emitComponent`, que es justo lo que la
  // hoja Contenido dibuja: asi las dos hojas no se pueden desincronizar.
  const cmsOrder = []
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
  // El gap es ancho a proposito: la pagina entera es una referencia aparte, no una
  // columna mas de la matriz, asi que queda claramente separada a la derecha.
  const FULL_W = 64
  if (withFull) columns.push({ width: 14 }, { width: FULL_W })
  const FULL_COL = withFull ? columns.length - 1 : -1 // 0-based
  const FULL_MAX_W = Math.round(FULL_W * 7 + 5) - 24
  ws.columns = columns
  const IMG_COL = 4 // 0-based -> columna E
  // Ancho interior de la col E en px (aprox Excel: chars*7 + 5). La imagen se topea
  // a ese ancho MENOS un margen, para que SIEMPRE quede dentro del marco (no se sale).
  const E_PX = Math.round(E_W * 7 + 5)
  const IMG_MAX_W = E_PX - 34
  // Tope de ALTO holgado a proposito: lo que manda es el ancho de la columna. Con 320
  // un bloque alto (un contenedor de pestañas, los nueve acordeones) entraba por el
  // alto y se dibujaba al 20% del tamaño real — ilegible. Ahora esos casos entran por
  // el ANCHO, o sea lo mas grandes que la columna permite, y se reservan las filas que
  // necesiten. El tope solo evita que algo patologico haga una imagen infinita.
  const IMG_MAX_H = 900

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
          for (const sf of visibleSubFields(f, null, content, { excel: true }).filter((sf) => !excelSkip(sf, it[sf.key]))) bf(sf.label, fieldToText(sf, it[sf.key]), true)
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
      const font = { size: 10, italic: !!opts.italic || (empty && !!opts.placeholder) || !!(empty && opts.todo) || disabled, color: { argb: (empty || disabled) ? MUTED : 'FF1F2530' } }
      // `rich` = el campo es rich text en el CMS: las marcas (**negrita**, viñetas,
      // saltos) se convierten a formato de VERDAD en la celda, no viajan como simbolos.
      // 'textarea' lleva bloques (parrafos y listas); un campo de una linea, solo inline.
      // `todo` = lo entrega el mercado y todavia no esta: en vez del guion va la
      // consigna, y la celda se pinta (ver el fill mas abajo).
      c2.value = empty ? (opts.placeholder || (opts.todo ? 'Completar' : EMPTY))
        : (opts.rich ? toExcelRich(value, font, { block: opts.rich === 'textarea' }) : value)
      c2.font = font
      c2.alignment = { vertical: 'top', wrapText: true }
    }
    if (opts.ref) cellRef.set(opts.ref, atRow)
    const thin = { style: 'thin', color: { argb: BORDER } }
    const fill = opts.fill || (disabled ? SUBHEAD_BG : null)
    for (const col of [2, 3]) {
      ws.getCell(atRow, col).border = { top: thin, bottom: thin, left: thin, right: thin }
      if (fill) ws.getCell(atRow, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }
    }
    // Pendiente del mercado: se pinta SOLO la celda de contenido, que es donde escriben.
    if (opts.todo && empty && !disabled) {
      ws.getCell(atRow, 3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TODO_BG } }
    }
    // El alto se mide sobre el texto YA renderizado: las marcas no ocupan lugar y una
    // lista o un parrafo nuevo suman renglones.
    setH(atRow, estHeight(opts.rich ? richToPlain(value, { block: opts.rich === 'textarea' }) : value))
    return atRow + 1
  }

  // Campo de texto + sus enlaces. El texto va con su FORMATO (negritas, viñetas, saltos)
  // y sin las marcas, y cada enlace baja ademas a su propia fila con el hipervinculo
  // real: en xlsx el link es por celda, asi que un parrafo con varios enlaces no puede
  // tenerlos todos adentro.
  function textRows(atRow, label, value, opts = {}) {
    const links = extractLinks(value)
    // Sin formato (un select, una URL): igual se sacan las marcas de enlace, para que
    // no aparezca un "[texto](url)" crudo en la celda.
    let r = fieldRow(atRow, label, opts.rich ? value : stripLinks(value), opts)
    for (const l of links) {
      // `ref: null` a proposito: el ref es del campo, y `fieldRow` lo REGISTRA en la
      // fila que dibuja. Si las filas de enlace lo heredaran, la ultima se quedaria con
      // el ref y la hoja CMS traeria por formula el "Pegá acá el link" de ese enlace en
      // vez del cuerpo del componente.
      r = fieldRow(r, `Link - ${l.text}`, '', { ...opts, ref: null, sub: true, rich: null, link: l.url })
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

  // Titulo de la pagina.
  ws.mergeCells(2, 2, 2, 5)
  const title = ws.getCell(2, 2)
  title.value = `${page.name}${page.path ? '  -  ' + page.path : ''}`
  title.font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } }
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD_BG } }
  title.alignment = { vertical: 'middle', indent: 1 }
  setH(2, 26)
  let row = 4

  // Referencias de la pagina: el diseño y las dos webs. Van arriba de todo porque son
  // lo primero que se busca al abrir la matriz. Las tres urls salen de la ficha de la
  // pagina si estan cargadas. La contraseña del Figma NO se guarda (cambia por vuelta de
  // diseño): esa se completa siempre en el Excel.
  // La galeria de componentes es un catalogo, no una pagina: no tiene ni Figma ni webs
  // (pasa metas:false, la misma señal).
  if (withMetas) {
    const refTop = row
    row = bandTitle(row, 'Referencias', PURINA_RED)
    row = fieldRow(row, 'Link del Figma', '', { link: page.url_figma || '' })
    row = fieldRow(row, 'Contraseña del Figma', '', { placeholder: 'Escribí acá la contraseña' })
    row = fieldRow(row, 'Web vieja', '', { link: page.url_old || '' })
    row = fieldRow(row, 'Web nueva', '', { link: page.url_new || '' })
    boxBorder(refTop, row - 1, 2, 3, PURINA_RED)
    row++
  }

  // Componentes: banda -> [campos izquierda | imagen derecha].
  // El breadcrumb (matrixExclude) no se exporta: se arma solo, no lleva contenido.
  // `label` = numeracion de la seccion ("3", o "3.1.2" para un componente que vive
  // dentro de una pestaña).
  async function emitComponent(comp, label) {
    const def = getComponent(comp.component_key)
    const content = comp.content || {}
    const topRow = row

    // Banda de titulo (bloque izquierdo). El nombre es el que usamos en la app, no el
    // del CMS: es lo que el mercado lee y por lo que con el tiempo puede pedir
    // ("quiero unas cards con icono acá"). Ver `componentTitle`.
    const name = `${label}. ${componentTitle(def, content) || comp.component_key}`
    labelByComp.set(comp.id, name)
    cmsLabelByComp.set(comp.id, `${label}. ${def?.cmsName || def?.name || comp.component_key}`)
    // `nested` = este bloque vive DENTRO de un contenedor. La hoja CMS lo dibuja
    // indentado y debajo de la banda de su slot, para que se lea como lo que es.
    cmsOrder.push({ comp, nested: !!comp.parent_id })
    row = bandTitle(row, name, PURINA_RED)

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

    // Campos VISUALES (los cms:true se omiten). Un CONTENEDOR de columnas no tiene
    // ninguno: todo lo suyo es tecnico y su contenido son los hijos, que van en sus
    // propias secciones. En ese caso no se dibuja la tabla — una cabecera "Campo |
    // Contenido a cargar" sin una sola fila debajo es ruido para el mercado.
    // Ademas se sacan los campos VACIOS (`excelSkip`): la hoja lista lo que esta
    // pagina lleva, no todo lo que el componente podria llevar. Una lista sin items
    // tampoco baja — seria una card vacia con diez guiones.
    const visible = visibleFields(def, content, { excel: true }).filter((f) => (f.type === 'list'
      ? listItems(f, content).some((it) => visibleSubFields(f, null, content, { excel: true })
        .some((sf) => !excelSkip(sf, it[sf.key])))
      : !excelSkip(f, content[f.key])))

    if (!visible.length) {
      // Sin una sola fila que mostrar no se dibuja la tabla: una cabecera "Campo |
      // Contenido a cargar" vacia es ruido. Pasa en dos casos y se aclara cual: un
      // CONTENEDOR de columnas (todo lo suyo es tecnico, el contenido son los hijos) o
      // un bloque al que no se le cargo nada.
      ws.mergeCells(row, 2, row, 3)
      const nc = ws.getCell(row, 2)
      nc.value = def?.container
        ? 'Este bloque no lleva contenido propio: se carga en los componentes de adentro.'
        : 'Este bloque todavía no tiene contenido cargado.'
      nc.font = { italic: true, size: 10, color: { argb: MUTED } }
      nc.alignment = { vertical: 'middle', indent: 1 }
      setH(row, 18)
      row++
    } else {
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
    }

    // Campos VISUALES (los cms:true se omiten). Las listas se abren por item,
    // con etiqueta SINGULAR (Marca 1, Producto 1, Articulo 1...).
    for (const f of visible) {
      if (f.type === 'list') {
        const arr = listItems(f, content)
        const one = f.itemLabel || f.label
        let shown = 0
        arr.forEach((item, i) => {
          const role = f.roles ? f.roles[i] : null
          // Con roles, cada bloque muestra solo los subcampos de su rol.
          // Ademas de los tecnicos (cms) y los que no son de este rol, se omiten los
          // que quedaron en su `noneOption` y los VACIOS (ver excelSkip).
          const subFields = visibleSubFields(f, role, content, { excel: true }).filter((sf) => !excelSkip(sf, item[sf.key]))
          if (!subFields.length) return // item sin nada: no se dibuja la banda sola
          shown++
          row = cardBand(row, `${one} ${i + 1}${role ? ` — ${role}` : ''}`, { disabled })
          for (const sf of subFields) {
            row = textRows(row, marketLabel(sf, content), fieldToText(sf, item[sf.key]), {
              sub: true, disabled, rich: richKind(sf), todo: isMarketField(sf), ref: `${comp.id}|${f.key}[${i}].${sf.key}`,
            })
          }
        })
        // El componente admite MAS items de los que tiene la pagina, y eso el mercado no
        // tiene forma de saberlo: la lista se corta donde se corto al armarla. Las de
        // tamaño FIJO (ej. el mosaico de 6 bloques) no lo llevan, no se pueden estirar.
        if (!f.fixed && shown && !disabled) {
          row = fieldRow(row, `¿Falta ${one.toLowerCase()}?`,
            `Este bloque admite las que hagan falta. Para pedir otra, copiá el bloque "${one} ${shown}" completo y numerá el siguiente.`,
            { sub: true, italic: true, fill: SUBHEAD_BG, color: MUTED })
        }
      } else if (!excelSkip(f, content[f.key])) {
        row = textRows(row, marketLabel(f, content), fieldToText(f, content[f.key]), { disabled, rich: richKind(f), todo: isMarketField(f), ref: `${comp.id}|${f.key}` })
      }
    }

    // Imagen del componente en la columna E. Se captura a ancho DESKTOP (CAP_W) para
    // que renderice como en la pagina real; algunos (ej. 50/50) definen un exportWidth
    // mas angosto para no salir tan bajos. Se ubica centrada dentro del marco.
    const dataUrl = await shotFor(comp.id, getNode(comp.id), def?.exportWidth || CAP_W)
    const img = await prepImage(dataUrl)
    if (img) imgByComp.set(comp.id, img)
    const PAD = 12 // pt de aire arriba/abajo dentro del marco
    const groupHpt = img ? img.hpt : 0

    // Reservar filas (debajo de la banda) hasta que quepa la imagen + padding.
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

  // Recorrido del arbol: los bloques sueltos en orden y, cuando uno es CONTENEDOR
  // (pestañas o columnas), una seccion por SLOT con los componentes que tiene adentro.
  const roots = mainComps.filter((c) => !c.parent_id)
  // En el ULTIMO slot entran ademas los hijos que apuntan a uno que ya no existe (una
  // pestaña borrada; mismo criterio que el builder), asi el Excel no se come contenido.
  const kidsOf = (id, ti, isLast) => mainComps.filter((c) => c.parent_id === id
    && (isLast ? (c.tab_index ?? 0) >= ti : (c.tab_index ?? 0) === ti))
  // Fila donde arranca la primera seccion: la imagen de la pagina entera se alinea con
  // ella (antes era la 5 fija, pero arriba puede haber bloque de Referencias).
  const firstCompRow = row
  let idx = 0
  for (const comp of roots) {
    const def = getComponent(comp.component_key)
    if (def?.matrixExclude) continue
    idx++
    await emitComponent(comp, String(idx))
    if (!def?.container) continue
    const slots = slotsOf(def, comp.content || {})
    // Como se llama el slot en la banda: la pestaña o la columna.
    const kind = def.slots ? '' : 'Pestaña: '
    for (let ti = 0; ti < slots.length; ti++) {
      const slotNo = `${idx}.${ti + 1}`
      // Banda oscura: no es un componente, es el slot que agrupa a los de abajo.
      row = bandTitle(row, `${slotNo} — ${kind}${slots[ti]?.label || `Slot ${ti + 1}`}`, HEAD_BG)
      const kids = kidsOf(comp.id, ti, ti === slots.length - 1).filter((k) => !getComponent(k.component_key)?.matrixExclude)
      // La hoja CMS lleva la MISMA banda, pero con el nombre del slot en el CMS
      // ("First column"), que es lo que el editor ve en Drupal.
      cmsOrder.push({
        slot: true,
        text: `${slotNo} — ${kind}${slots[ti]?.cmsLabel || slots[ti]?.label || `Slot ${ti + 1}`}`,
        empty: !kids.length,
        emptyNote: def.slots ? 'Esta columna no lleva componentes.' : 'Esta pestaña no lleva componentes.',
      })
      if (!kids.length) {
        ws.mergeCells(row, 2, row, 3)
        const nc = ws.getCell(row, 2)
        nc.value = def.slots ? 'Esta columna todavía no tiene componentes.' : 'Esta pestaña todavía no tiene componentes.'
        nc.font = { italic: true, size: 10, color: { argb: MUTED } }
        nc.alignment = { vertical: 'middle', indent: 1 }
        setH(row, 18)
        row += 2
        continue
      }
      let k = 0
      for (const kid of kids) { k++; await emitComponent(kid, `${slotNo}.${k}`) }
    }
  }

  // La PAGINA ENTERA renderizada, a la derecha de todo: header + los componentes en
  // orden + footer, apilados en una sola imagen. No lleva campos: es la referencia
  // visual de como quedaria la pagina armada, al lado del detalle de cada seccion.
  if (withFull) {
    const chrome = opts.chrome || {}
    const parts = []
    if (chrome.header) parts.push(await snapshot(chrome.header, CAP_W))
    // Solo los bloques SUELTOS: los de adentro de una pestaña ya entran en la captura
    // de su contenedor (se ve la pestaña abierta, como en la pagina real).
    for (const comp of components.filter((c) => !c.parent_id)) parts.push(await shotFor(comp.id, getNode(comp.id), CAP_W))
    if (chrome.footer) parts.push(await snapshot(chrome.footer, CAP_W))
    const full = await stackImages(parts, opts.pageBg || '#ffffff')
    if (full) {
      const nat = (await loadSize(full)) || { w: STACK_W, h: STACK_W }
      const w = Math.min(FULL_MAX_W, nat.w)
      const h = Math.round(nat.h * (w / nat.w))
      const band = ws.getCell(firstCompRow, FULL_COL + 1)
      band.value = 'La página completa'
      band.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
      // Oscura (no roja): no es una seccion de la matriz, es la referencia visual.
      band.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD_BG } }
      band.alignment = { vertical: 'middle', indent: 1 }
      setH(firstCompRow, 22)
      const imgId = wb.addImage({ base64: full, extension: 'png' })
      ws.addImage(imgId, { tl: { col: FULL_COL, row: firstCompRow }, ext: { width: w, height: h }, editAs: 'oneCell' })
    }
  }

  // ---- Hoja CMS: la misma pagina, pero en el orden del formulario de Drupal --------
  // El contenido NO se copia: se referencia con formula a la hoja Contenido, asi lo que
  // carga el mercado aparece de este lado sin que nadie tenga que pasarlo a mano.
  await buildCmsSheet(wb, page, {
    comps: cmsOrder, cellRef, imgByComp, labelByComp: cmsLabelByComp, withMetas,
  })

  await download(wb, `${safeFileName(page.name)} — Matriz de contenido.xlsx`)
}

// ---------------------------------------------------------------------------------
// Hoja CMS: la guia del content editor. Mismo orden que el formulario de Drupal, con
// las etiquetas EXACTAS del CMS (`cmsLabel`), incluidos los campos tecnicos que la
// hoja Contenido no muestra (HTML tags, tokens de color, Classy, Avanzado).
//
// Lo que el mercado carga NO se duplica: la celda es una formula a la hoja Contenido.
// Si el mercado edita alla, aca se actualiza solo. Esas celdas van en gris y la hoja
// se protege, para que nadie pise una formula sin querer.
// ---------------------------------------------------------------------------------
async function buildCmsSheet(wb, page, { comps, cellRef, imgByComp, labelByComp, withMetas }) {
  const ws = wb.addWorksheet(SHEET_CMS, { views: [{ showGridLines: false }] })
  const IMG_W = 70
  ws.columns = [{ width: 2 }, { width: 34 }, { width: 52 }, { width: 2 }, { width: IMG_W }]
  const setH = (r, h) => { ws.getRow(r).height = Math.max(ws.getRow(r).height || 0, h) }
  const thin = { style: 'thin', color: { argb: BORDER } }

  // Banda superior + instrucciones.
  ws.mergeCells(1, 2, 1, 5)
  const t = ws.getCell(1, 2)
  t.value = `Carga en el CMS — ${page.name}`
  t.font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } }
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD_BG } }
  t.alignment = { vertical: 'middle', indent: 1 }
  setH(1, 30)
  ws.mergeCells(2, 2, 2, 5)
  ws.getCell(2, 2).value = 'Cada bloque está en el orden del formulario de Drupal, con el nombre exacto de cada campo. Las filas en GRIS son el contenido que carga el mercado: vienen enlazadas a la hoja "Contenido" y se actualizan solas, no hace falta copiarlas ni se pueden editar. El resto de las celdas sí se puede escribir acá — entre ellas el Alt text de cada imagen, que carga SEO. En los desplegables, el valor que aparece ("Default", "- Ninguno -") es la opción que hay que dejar elegida en Drupal, no una celda en blanco: si el formulario viene con otra puesta, cambiala. Un "—" sí es un campo sin cargar.'
  ws.getCell(2, 2).font = { italic: true, size: 10, color: { argb: MUTED } }
  ws.getCell(2, 2).alignment = { wrapText: true, vertical: 'top' }
  setH(2, 42)
  let row = 4

  // Fila de campo. `ref` = clave en cellRef; si existe, la celda es una FORMULA que
  // trae el valor de la hoja Contenido (con IF para que un vacio no se vea como 0).
  const line = (label, value, opts = {}) => {
    const a = ws.getCell(row, 2)
    a.value = label
    a.font = { bold: !opts.sub, size: 10, color: { argb: 'FF1F2530' } }
    a.alignment = { vertical: 'top', wrapText: true, indent: opts.sub ? 1 : 0 }
    const b = ws.getCell(row, 3)
    const srcRow = opts.ref != null ? cellRef.get(opts.ref) : null
    if (srcRow) {
      const cell = `'${SHEET_CONTENT}'!C${srcRow}`
      b.value = { formula: `IF(${cell}="","",${cell})`, result: value == null || value === '' ? '' : value }
      b.font = { size: 10, color: { argb: 'FF1F2530' } }
      b.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MIRROR_BG } }
    } else {
      const empty = value == null || value === ''
      b.value = empty ? (opts.emptyAs || EMPTY) : value
      // Un DESPLEGABLE sin nada cargado no es una celda en blanco: "- Ninguno -" y
      // "Default" son opciones de verdad del formulario, y el editor las tiene que dejar
      // elegidas (Drupal puede venir con otra puesta). Por eso van en negro, como
      // cualquier valor. El gris italico queda para lo que si esta vacio: un texto sin
      // cargar ("—") o un placeholder.
      const option = empty && opts.emptyIsOption
      b.font = { size: 10, italic: empty && !option, color: { argb: (empty && !option) ? MUTED : 'FF1F2530' } }
      // Esta celda NO viene de la otra hoja: es algo que se completa ACA (el alt text
      // que carga SEO, un campo tecnico). Se desbloquea para que se pueda escribir con
      // la hoja protegida — lo que se protege son las FORMULAS, no el trabajo de nadie.
      b.protection = { locked: false }
      // Pendiente de SEO: se pinta igual que el amarillo del mercado en la otra hoja,
      // asi se ve de un saque que falta completarlo.
      if (opts.seo && empty) b.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TODO_BG } }
    }
    b.alignment = { vertical: 'top', wrapText: true }
    for (const c of [2, 3]) ws.getCell(row, c).border = { top: thin, bottom: thin, left: thin, right: thin }
    setH(row, estHeight(value))
    row++
  }
  const band = (text, bg, size = 12, indent = 1) => {
    ws.mergeCells(row, 2, row, 3)
    const c = ws.getCell(row, 2)
    c.value = text
    c.font = { bold: true, size, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
    c.alignment = { vertical: 'middle', indent }
    setH(row, size > 10 ? 22 : 18)
    row++
  }
  // Banda del SLOT de un contenedor (una columna del layout, una pestaña). No es un
  // componente: es la ranura, y lo que viene abajo va ADENTRO de ella. Sin esto, en
  // Drupal no se entiende que el "Content: Image" hay que agregarlo dentro de la
  // primera columna del Layout Columns y no suelto en la pagina.
  const slotBand = (text) => band(text, HEAD_BG, 11)
  const slotEmpty = (text) => {
    ws.mergeCells(row, 2, row, 3)
    const c = ws.getCell(row, 2)
    c.value = text
    c.font = { italic: true, size: 10, color: { argb: MUTED } }
    c.alignment = { vertical: 'middle', indent: 2 }
    setH(row, 18)
    row++
  }
  const cardBand = (text) => {
    ws.mergeCells(row, 2, row, 3)
    const c = ws.getCell(row, 2)
    c.value = text
    c.font = { bold: true, size: 10, color: { argb: 'FF7A1216' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CARD_BG } }
    c.alignment = { vertical: 'middle', indent: 1 }
    ws.getCell(row, 2).border = { top: thin, bottom: thin, left: thin }
    ws.getCell(row, 3).border = { top: thin, bottom: thin, right: thin }
    setH(row, 18)
    row++
  }
  // Desplegable de Drupal (`cmsGroup`): los campos de abajo no estan a la vista en el
  // formulario, hay que ABRIRLO para llegar a ellos. Sin esta banda, un editor que no
  // ve el "Título" en pantalla asume que el paragraph no lo tiene.
  const groupBand = (text) => {
    ws.mergeCells(row, 2, row, 3)
    const c = ws.getCell(row, 2)
    c.value = `▸ ${text}  (desplegable — hay que abrirlo)`
    c.font = { bold: true, size: 10, color: { argb: 'FF3C444B' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GROUP_BG } }
    c.alignment = { vertical: 'middle', indent: 1 }
    ws.getCell(row, 2).border = { top: thin, bottom: thin, left: thin }
    ws.getCell(row, 3).border = { top: thin, bottom: thin, right: thin }
    setH(row, 18)
    row++
  }
  // Etiqueta del CMS de un campo (cae a la nuestra si no esta declarada).
  const cmsLabel = (f) => f.cmsLabel || f.label
  // Un select vacio en el CMS no siempre dice lo mismo ("Default" en Classy,
  // "- Ninguno -" en los HTML tag): se resuelve por la lista de opciones. El alt text
  // no lo carga ni el mercado ni el editor: lo escribe SEO, igual que las metas, asi
  // que vacio lo dice en vez de mostrar un guion.
  const isSeo = (f) => /_alt$/.test(f?.key || '')
  const emptyFor = (f) => (isSeo(f) ? 'SEO Agency' : emptyLabelFor(f))
  // ¿Ese "vacio" es en realidad una OPCION del desplegable que hay que dejar elegida?
  // Solo si el campo tiene lista de opciones y esa lista declara su etiqueta de vacio.
  const emptyIsOption = (f) => !isSeo(f) && !!f?.options && emptyLabelFor(f) !== '—'

  for (const entry of comps) {
    // Marca de SLOT: no es un componente, es la ranura del contenedor de arriba.
    if (entry.slot) {
      slotBand(entry.text)
      if (entry.empty) slotEmpty(entry.emptyNote)
      continue
    }
    const comp = entry.comp
    const def = getComponent(comp.component_key)
    if (def?.matrixExclude) continue
    const content = comp.content || {}
    const topRow = row
    // La banda ES el paragraph que hay que agregar en Drupal, con su nombre exacto.
    // Un bloque anidado se indenta y lleva la flecha: se agrega DENTRO del slot de
    // arriba, no suelto en la pagina.
    band(`${entry.nested ? '↳ ' : ''}${labelByComp.get(comp.id) || def?.cmsName || def?.name || comp.component_key}`,
      PURINA_RED, 12, entry.nested ? 3 : 1)

    // TODOS los campos, incluidos los tecnicos (sin { excel: true }).
    // Los desplegables de Drupal (`cmsGroup` y `group`, ver `cmsGroupOf`) abren una banda
    // al entrar y se cierran solos al salir. Si el grupo quedo sin campos visibles (los
    // filtro la variante), la banda no se dibuja: se emite recien con el primero.
    let openGroup = null
    for (const f of visibleFields(def, content)) {
      if (cmsGroupOf(f) !== openGroup) {
        openGroup = cmsGroupOf(f)
        if (openGroup) groupBand(openGroup)
      }
      if (f.type === 'list') {
        const stored = Array.isArray(content[f.key]) ? content[f.key] : []
        const arr = f.fixed
          ? Array.from({ length: f.fixed }, (_, i) => stored[i] || {})
          : (stored.length ? stored : [{}])
        const one = f.itemLabel || f.label
        arr.forEach((item, i) => {
          const role = f.roles ? f.roles[i] : null
          cardBand(`${cmsLabel(f)} — ${one} ${i + 1}${role ? ` (${role})` : ''}`)
          for (const sf of visibleSubFields(f, role, content)) {
            // `effectiveValue` y no `item[sf.key]` a secas: un subcampo con `default`
            // (el HTML tag del titulo de una card) tiene que bajar con ESE valor, que
            // es el que el editor tiene que poner, y no con un "- Ninguno -".
            line(cmsLabel(sf), fieldToText(sf, effectiveValue(sf, item)), {
              sub: true, ref: `${comp.id}|${f.key}[${i}].${sf.key}`, emptyAs: emptyFor(sf), seo: isSeo(sf),
              emptyIsOption: emptyIsOption(sf),
            })
          }
        })
      } else {
        line(cmsLabel(f), fieldToText(f, effectiveValue(f, content)), {
          ref: `${comp.id}|${f.key}`, emptyAs: emptyFor(f), seo: isSeo(f),
          emptyIsOption: emptyIsOption(f),
        })
      }
    }

    // Imagen del componente, del mismo tamaño que en la hoja Contenido.
    const img = imgByComp.get(comp.id)
    if (img) {
      ws.addImage(img.id, { tl: { col: 4.1, row: topRow }, ext: { width: img.w, height: img.h }, editAs: 'oneCell' })
      // Reservar alto para que la imagen no pise el bloque siguiente.
      let area = 0
      for (let r = topRow + 1; r < row; r++) area += ws.getRow(r).height || 15
      while (area < img.hpt + 20) { setH(row, 16); area += 16; row++ }
    }
    drawBox(ws, topRow, row - 1, 2, 5, PURINA_RED)
    row += 1
  }

  // Metas de la pagina. Van de este lado y no en la hoja del mercado porque las carga
  // SEO, igual que el alt text: mismo amarillo, misma celda desbloqueada. Se omiten
  // cuando el export no es de una pagina real (la galeria pasa metas:false).
  if (withMetas) {
    const metaTop = row
    band('Metas de la página (SEO)', PURINA_RED)
    line('Meta title', '', { seo: true, emptyAs: 'SEO Agency' })
    line('Meta description', '', { seo: true, emptyAs: 'SEO Agency' })
    setH(metaTop + 2, 34)
    drawBox(ws, metaTop, row - 1, 2, 3, PURINA_RED)
  }

  // Hoja de solo lectura: en xlsx las celdas ya vienen bloqueadas, asi que alcanza con
  // proteger la hoja. Sin contraseña, para que el editor pueda desbloquear si necesita.
  await ws.protect('', { selectLockedCells: true, selectUnlockedCells: true })
}
