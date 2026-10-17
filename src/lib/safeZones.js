// ZONAS SEGURAS de una imagen de fondo: que parte de la foto tapan el titulo y las cards del
// bloque, y donde puede ir el sujeto (caras, mascotas, producto). Los datos salen del catalogo
// (`safe` en la spec de imagen, ver FBSQ_SAFE en src/data/components.js) y este archivo es el
// UNICO que los dibuja, para que el panel de medidas, el overlay del builder y el Excel
// muestren exactamente lo mismo:
//   - `safeZonesSvg(view)`   el esquema de un breakpoint (desktop o mobile) como SVG.
//   - `safeSheetPng(safe)`   los dos esquemas lado a lado + la leyenda, en PNG (para el Excel).
// Las zonas vienen en % de la imagen (x, y, w, h). Un tipo se dibuja como la UNION de sus
// rectangulos (uno por ancho de pantalla): relleno con la opacidad en el grupo, asi los
// solapados no se oscurecen, y el CONTORNO de la union, no el de cada rectangulo.

// Colores. En la app van las variables de index.css (el SVG va inline en el DOM y las lee);
// en el PNG del Excel no hay CSS, van los mismos colores en hex.
export const SAFE_PALETTE_UI = {
  frame: 'var(--proj-bg)', frameStroke: 'var(--border-strong)',
  text: 'var(--info)', cards: 'var(--warn)', safe: 'var(--ok)',
  label: 'var(--ink)', halo: 'var(--surface)',
}
export const SAFE_PALETTE_PRINT = {
  frame: '#e5e9f0', frameStroke: '#d3d8de',
  text: '#2e6fd0', cards: '#c8811a', safe: '#2f8f5b',
  label: '#1f2530', halo: '#ffffff',
}
// Encima de una FOTO (overlay del builder): colores mas vivos y etiquetas blancas con halo
// oscuro, que se leen sobre cualquier imagen.
export const SAFE_PALETTE_OVERLAY = {
  frame: null, frameStroke: null,
  text: '#4d8cff', cards: '#ffb020', safe: '#3ddc84',
  label: '#ffffff', halo: 'rgba(0, 0, 0, 0.78)',
  // Rellenos mas livianos que en el esquema: abajo esta la foto que se quiere revisar.
  fillK: 0.6,
}

// Las zonas seguras de una spec de imagen (o null si el componente no las declara).
export const safeOf = (specs) => (specs || []).find((s) => s && s.safe)?.safe || null

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const FONT = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

// Contorno de la union de rectangulos en % (se redondean a enteros): grilla de 100x100 y
// un borde donde una celda ocupada linda con una libre. Devuelve el `d` de un path.
function outline(rects, sx, sy) {
  const g = new Uint8Array(100 * 100)
  const cl = (v) => Math.max(0, Math.min(100, Math.round(v)))
  for (const z of rects) {
    for (let y = cl(z.y); y < cl(z.y + z.h); y++) for (let x = cl(z.x); x < cl(z.x + z.w); x++) g[y * 100 + x] = 1
  }
  const at = (x, y) => (x >= 0 && x < 100 && y >= 0 && y < 100 ? g[y * 100 + x] : 0)
  let d = ''
  for (let y = 0; y <= 100; y++) {
    let s = -1
    for (let x = 0; x <= 100; x++) {
      const e = x < 100 && at(x, y - 1) !== at(x, y)
      if (e && s < 0) s = x
      if (!e && s >= 0) { d += `M${s * sx} ${y * sy}H${x * sx}`; s = -1 }
    }
  }
  for (let x = 0; x <= 100; x++) {
    let s = -1
    for (let y = 0; y <= 100; y++) {
      const e = y < 100 && at(x - 1, y) !== at(x, y)
      if (e && s < 0) s = y
      if (!e && s >= 0) { d += `M${x * sx} ${s * sy}V${y * sy}`; s = -1 }
    }
  }
  return d
}

// Parte una etiqueta en renglones que entren en `max` caracteres (estimado: 0,56 em por letra).
function wrap(text, max) {
  const out = []; let cur = ''
  for (const w of String(text).split(/\s+/)) {
    if (cur && (cur + ' ' + w).length > max) { out.push(cur); cur = w } else cur = cur ? `${cur} ${w}` : w
  }
  if (cur) out.push(cur)
  return out
}

// Cuerpo del esquema de UN breakpoint en coordenadas propias (viewBox = ratio x 100).
// `px` = ancho con el que se va a VER: de ahi salen el tamaño de letra y el grosor de las
// lineas, para que se lean igual en el panel (290px), en el overlay (el ancho del bloque) y
// en el Excel.
function body(view, { palette = SAFE_PALETTE_UI, px = 300, frame = true, labels = true, fontPx = 10 } = {}) {
  const [rw, rh] = view.ratio || [16, 9]
  const VW = rw * 100, VH = rh * 100
  const k = VW / px // unidades del viewBox por px de pantalla
  const sx = VW / 100, sy = VH / 100
  const zones = view.zones || []
  const parts = []
  if (frame && palette.frame) {
    parts.push(`<rect x="0" y="0" width="${VW}" height="${VH}" style="fill:${palette.frame};stroke:${palette.frameStroke};stroke-width:${k}"/>`)
  }
  const R = (z) => `<rect x="${z.x * sx}" y="${z.y * sy}" width="${z.w * sx}" height="${z.h * sy}"/>`
  // Orden: lo que se tapa primero, despues la zona libre desde un ancho (encima, para que se
  // vea que en esos anchos SI esta libre) y arriba de todo la zona segura de todos los anchos.
  const layers = [
    { list: zones.filter((z) => z.kind === 'text'), color: palette.text, op: 0.3, dash: null, w: 1.25 },
    { list: zones.filter((z) => z.kind === 'cards'), color: palette.cards, op: 0.3, dash: null, w: 1.25 },
    { list: zones.filter((z) => z.kind === 'safe' && z.from), color: palette.safe, op: 0.1, dash: [3, 3], w: 1.5 },
    { list: zones.filter((z) => z.kind === 'safe' && !z.from), color: palette.safe, op: 0.24, dash: [6, 4], w: 2 },
  ]
  for (const L of layers) {
    if (!L.list.length) continue
    parts.push(`<g style="fill:${L.color};opacity:${L.op * (palette.fillK || 1)}">${L.list.map(R).join('')}</g>`)
    const dash = L.dash ? `stroke-dasharray:${L.dash.map((d) => d * k).join(' ')};` : ''
    parts.push(`<path d="${outline(L.list, sx, sy)}" style="fill:none;stroke:${L.color};stroke-width:${L.w * k};${dash}stroke-linecap:butt"/>`)
  }
  if (labels) {
    const fs = fontPx * k, lh = fs * 1.15, pad = 5 * k
    for (const z of zones.filter((x) => x.label)) {
      const x0 = z.x * sx, y0 = z.y * sy, x1 = (z.x + z.w) * sx, y1 = (z.y + z.h) * sy
      const lines = wrap(z.label, Math.max(6, Math.floor((x1 - x0 - 2 * pad) / (0.56 * fs))))
      // La zona libre "desde" un ancho lleva la etiqueta abajo a la derecha: arriba a la
      // izquierda esta la de la zona segura de todos los anchos.
      const br = z.kind === 'safe' && z.from
      const tx = br ? x1 - pad : x0 + pad
      const ty = br ? y1 - pad - (lines.length - 1) * lh - fs * 0.22 : y0 + pad + fs * 0.85
      const tspans = lines.map((l, i) => `<tspan x="${tx}" dy="${i ? lh : 0}">${esc(l)}</tspan>`).join('')
      parts.push(`<text x="${tx}" y="${ty}" text-anchor="${br ? 'end' : 'start'}" style="font:700 ${fs}px ${FONT};fill:${palette.label};stroke:${palette.halo};stroke-width:${3 * k};stroke-linejoin:round;paint-order:stroke">${tspans}</text>`)
    }
  }
  return { VW, VH, inner: parts.join('') }
}

// El esquema de un breakpoint como <svg> suelto. Sin width/height ocupa el ancho de su caja
// y el alto sale del viewBox.
export function safeZonesSvg(view, opts = {}) {
  const { VW, VH, inner } = body(view, opts)
  const size = opts.width ? ` width="${opts.width}" height="${opts.height}"` : ''
  const pos = opts.x != null ? ` x="${opts.x}" y="${opts.y}"` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg"${pos}${size} viewBox="0 0 ${VW} ${VH}" role="img" aria-label="Zonas seguras" preserveAspectRatio="xMidYMid meet">${inner}</svg>`
}

// Entradas de la leyenda, en el orden en que aparecen las zonas.
export function safeLegend(safe) {
  const all = [...(safe?.desktop?.zones || []), ...(safe?.mobile?.zones || [])]
  const out = []
  if (all.some((z) => z.kind === 'text')) out.push({ kind: 'text', text: 'Lo tapan el título y la bajada (en algún ancho)' })
  if (all.some((z) => z.kind === 'cards')) out.push({ kind: 'cards', text: 'Lo tapan las cards, las flechas o los puntos' })
  if (all.some((z) => z.kind === 'safe' && !z.from)) out.push({ kind: 'safe', text: 'Zona segura para el sujeto (libre en todos los anchos)' })
  const from = all.find((z) => z.kind === 'safe' && z.from)
  if (from) out.push({ kind: 'from', text: `Libre desde ${from.from} px (más angosto lo tapa el título)` })
  return out
}

// Hoja del Excel: los dos esquemas lado a lado, con su titulo, y la leyenda abajo. Medidas en
// px de pantalla (es lo que ocupa en la planilla); el PNG sale al doble para que se lea nitido.
export function safeSheetSvg(safe, palette = SAFE_PALETTE_PRINT) {
  const PAD = 12, H = 230, GAP = 18, TT = 30
  const views = [['Desktop', safe.desktop], ['Mobile', safe.mobile]].filter(([, v]) => v)
  let x = PAD
  const blocks = views.map(([name, v]) => {
    const [rw, rh] = v.ratio || [16, 9]
    const w = Math.round(H * rw / rh)
    const b = { name, v, x, w }
    x += w + GAP
    return b
  })
  const W = Math.max(x - GAP + PAD, 360)
  const legend = safeLegend(safe)
  const LH = 17
  const HH = PAD + TT + H + 14 + legend.length * LH + PAD
  const parts = [`<rect width="${W}" height="${HH}" fill="#ffffff"/>`]
  for (const b of blocks) {
    const [rw, rh] = b.v.ratio || [16, 9]
    parts.push(`<text x="${b.x}" y="${PAD + 12}" style="font:700 12px ${FONT};fill:${palette.label}">${esc(`${b.name} ${rw}:${rh}`)}</text>`)
    if (b.v.anchos) parts.push(`<text x="${b.x}" y="${PAD + 25}" style="font:400 10px ${FONT};fill:#6b727b">${esc(`Medido de ${b.v.anchos}`)}</text>`)
    parts.push(safeZonesSvg(b.v, { palette, px: b.w, x: b.x, y: PAD + TT, width: b.w, height: H, fontPx: b.w < 200 ? 9 : 10 }))
  }
  let ly = PAD + TT + H + 14
  for (const l of legend) {
    const c = l.kind === 'text' ? palette.text : l.kind === 'cards' ? palette.cards : palette.safe
    const dash = l.kind === 'safe' ? 'stroke-dasharray:4 3;' : l.kind === 'from' ? 'stroke-dasharray:2 2;' : ''
    const op = l.kind === 'from' ? 0.1 : l.kind === 'safe' ? 0.24 : 0.3
    parts.push(`<rect x="${PAD}" y="${ly}" width="22" height="11" style="fill:${c};fill-opacity:${op};stroke:${c};stroke-width:1.4;${dash}"/>`)
    parts.push(`<text x="${PAD + 30}" y="${ly + 10}" style="font:400 11px ${FONT};fill:${palette.label}">${esc(l.text)}</text>`)
    ly += LH
  }
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${HH}" viewBox="0 0 ${W} ${HH}">${parts.join('')}</svg>`, w: W, h: HH }
}

// La hoja de arriba pasada a PNG (solo en el navegador: usa un canvas). Devuelve el data URL
// y la medida en px de pantalla con la que hay que pegarla.
export async function safeSheetPng(safe, { scale = 2 } = {}) {
  const { svg, w, h } = safeSheetSvg(safe)
  const img = new Image()
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  await img.decode()
  const cv = document.createElement('canvas')
  cv.width = w * scale; cv.height = h * scale
  const cx = cv.getContext('2d')
  cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, cv.width, cv.height)
  cx.drawImage(img, 0, 0, cv.width, cv.height)
  return { dataUrl: cv.toDataURL('image/png'), w, h }
}
