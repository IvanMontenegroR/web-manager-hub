// Enlaces DENTRO de un texto largo (el "cuerpo" de un componente).
//
// Una celda del Excel es texto plano, asi que el enlace se marca con una notacion
// inline al estilo markdown:  [texto del enlace](https://destino)
// Asi el dato viaja entero en una sola celda: el mercado ve que parte del parrafo va
// enlazada y a donde, y puede editarlo sin herramientas raras.
//
// El builder no obliga a escribir esa notacion a mano: en el editor se selecciona el
// texto y se aprieta "Enlace" (ver ContentForm), que la inserta sola.

// Lo mismo vale para el RESTO del formato. El cuerpo de un componente es rich text en
// el CMS (negritas, saltos, listas), pero una celda del Excel es texto plano, asi que
// se marca con la misma notacion tipo markdown y el dato viaja entero en una celda:
//   **negrita**   _cursiva_   [texto](link)
//   - item        (o "* item")      -> lista con viñetas
//   1. item                          -> lista numerada
//   un salto de linea es un <br>, una linea en blanco separa parrafos.
// El editor tampoco obliga a escribirla a mano: hay botones que la insertan.

// El destino puede estar VACIO: el texto ya se marca como enlace aunque el mercado
// todavia no haya cargado la URL ( [texto]() ).
const LINK_RE = /\[([^\]]+)\]\(([^)\s]*)\)/g

// Parte un texto en segmentos: { text } para lo normal y { text, url, link:true } para
// los enlaces. Devuelve siempre al menos un segmento (posiblemente vacio).
export function parseLinks(value) {
  const s = String(value == null ? '' : value)
  const out = []
  let last = 0
  LINK_RE.lastIndex = 0
  let m
  while ((m = LINK_RE.exec(s)) !== null) {
    if (m.index > last) out.push({ text: s.slice(last, m.index) })
    out.push({ text: m[1], url: m[2], link: true })
    last = m.index + m[0].length
  }
  if (last < s.length) out.push({ text: s.slice(last) })
  return out.length ? out : [{ text: '' }]
}

// ¿El texto tiene algun enlace marcado?
export function hasLinks(value) {
  LINK_RE.lastIndex = 0
  return LINK_RE.test(String(value == null ? '' : value))
}

// El texto SIN las marcas, para leerlo natural ("[Ver más](url)" -> "Ver más").
export function stripLinks(value) {
  return parseLinks(value).map((s) => s.text).join('')
}

// Solo los enlaces: [{ text, url }]. En el Excel cada uno va en su propia fila, con
// el hipervinculo real (en xlsx el link es por CELDA, no por pedazo de texto).
export function extractLinks(value) {
  return parseLinks(value).filter((s) => s.link).map((s) => ({ text: s.text, url: s.url || '' }))
}

// ---- Formato INLINE: enlaces + negrita + cursiva --------------------------------
// Una sola pasada con alternancia, para que las marcas no se pisen entre si.
// Ojo con el orden: `**` tiene que probarse ANTES que `_`, y el enlace antes que todo
// (su texto puede tener asteriscos adentro).
const INLINE_RE = /\[([^\]]+)\]\(([^)\s]*)\)|\*\*([^*\n]+)\*\*|__([^_\n]+)__|_([^_\n]+)_/g

// Segmentos de un texto: { text } y, segun la marca, { link, url } / { bold } / { italic }.
export function parseInline(value) {
  const s = String(value == null ? '' : value)
  const out = []
  let last = 0
  INLINE_RE.lastIndex = 0
  let m
  while ((m = INLINE_RE.exec(s)) !== null) {
    if (m.index > last) out.push({ text: s.slice(last, m.index) })
    if (m[1] !== undefined) out.push({ text: m[1], url: m[2], link: true })
    else if (m[3] !== undefined) out.push({ text: m[3], bold: true })
    else if (m[4] !== undefined) out.push({ text: m[4], bold: true })
    else out.push({ text: m[5], italic: true })
    last = m.index + m[0].length
  }
  if (last < s.length) out.push({ text: s.slice(last) })
  return out.length ? out : [{ text: '' }]
}

// ---- Formato de BLOQUE: parrafos y listas ---------------------------------------
// La viñeta pide un espacio despues del simbolo, asi una linea que arranca con
// "**Recuerda:**" no se confunde con un item de lista.
const BULLET_RE = /^\s*[-*•]\s+(.*)$/
const ORDERED_RE = /^\s*\d+[.)]\s+(.*)$/

// Bloques de un texto: { type: 'p', lines: [...] } | { type: 'ul'|'ol', items: [...] }.
// Lineas seguidas del mismo tipo se agrupan en un solo parrafo o una sola lista.
export function parseRich(value) {
  const blocks = []
  let para = null
  const flush = () => { if (para) { blocks.push(para); para = null } }
  for (const line of String(value == null ? '' : value).split(/\r?\n/)) {
    if (!line.trim()) { flush(); continue }
    const bullet = line.match(BULLET_RE)
    const ordered = bullet ? null : line.match(ORDERED_RE)
    if (bullet || ordered) {
      flush()
      const type = bullet ? 'ul' : 'ol'
      const item = (bullet || ordered)[1]
      const prev = blocks[blocks.length - 1]
      if (prev && prev.type === type) prev.items.push(item)
      else blocks.push({ type, items: [item] })
      continue
    }
    if (!para) { para = { type: 'p', lines: [] } }
    para.lines.push(line)
  }
  flush()
  return blocks
}

// ---- Rich text -> celda de Excel -------------------------------------------------
// Una celda de xlsx SI soporta formato: `{ richText: [{ text, font }] }` pinta cada
// pedazo con su propia fuente. Asi el mercado no ve las marcas (`**negrita**`) sino la
// negrita de verdad, y los saltos y las viñetas quedan dibujados. La celda tiene que
// ir con `wrapText` para que los `\n` se vean.
//
// `base` = la fuente del resto de la celda (tamaño y color): en un richText, ExcelJS
// IGNORA la fuente de la celda, asi que cada pedazo la lleva puesta.
//
// Devuelve un STRING cuando no hay ninguna marca (una celda comun se edita mejor) y
// `{ richText }` cuando si la hay.

// Los pedazos de una linea, con la fuente ya resuelta. Un enlace va como texto plano:
// el hipervinculo de verdad baja en su propia fila (en xlsx el link es por celda).
function inlineRuns(text, base) {
  return parseInline(text).map((s) => ({
    text: s.text,
    font: { ...base, ...(s.bold ? { bold: true } : null), ...(s.italic ? { italic: true } : null) },
  }))
}

// El mismo texto SIN marcas: para calcular el alto de la fila y para saber si hace
// falta el richText.
export function richToPlain(value, { block = true } = {}) {
  if (!block) return parseInline(value).map((s) => s.text).join('')
  const blocks = parseRich(value)
  return blocks.map((b, i) => {
    const sep = i === 0 ? '' : (blocks[i - 1].type === 'p' && b.type !== 'p' ? '\n' : '\n\n')
    const body = b.type === 'p'
      ? b.lines.map((l) => parseInline(l).map((s) => s.text).join('')).join('\n')
      : b.items.map((it, j) => `${b.type === 'ul' ? '•' : `${j + 1}.`}  ${parseInline(it).map((s) => s.text).join('')}`).join('\n')
    return sep + body
  }).join('')
}

export function toExcelRich(value, base = {}, { block = true } = {}) {
  const s = String(value == null ? '' : value)
  if (!s) return ''
  const plain = richToPlain(s, { block })
  // Sin marcas de formato no hace falta el richText: el texto plano ya alcanza (y una
  // celda comun se edita mejor que una con pedazos).
  if (plain === s) return s

  // Un solo renglon (subtitulos, citas): solo formato inline, igual que <RT>.
  if (!block) {
    const runs = inlineRuns(s, base)
    return runs.length ? { richText: runs } : plain
  }

  const runs = []
  const push = (t, font) => { if (t) runs.push({ text: t, font: font || base }) }
  const blocks = parseRich(s)
  blocks.forEach((b, bi) => {
    // Linea en blanco entre bloques, como el parrafo del mockup. La excepcion es la
    // lista que viene DESPUES de un parrafo: es la continuacion de esa linea ("Y una
    // lista:"), separarla con un renglon vacio la deja huerfana.
    if (bi) push(blocks[bi - 1].type === 'p' && b.type !== 'p' ? '\n' : '\n\n')
    if (b.type === 'p') {
      b.lines.forEach((l, i) => { if (i) push('\n'); runs.push(...inlineRuns(l, base)) })
    } else {
      b.items.forEach((it, i) => {
        if (i) push('\n')
        push(`${b.type === 'ul' ? '•' : `${i + 1}.`}  `)
        runs.push(...inlineRuns(it, base))
      })
    }
  })
  return runs.length ? { richText: runs.filter((r) => r.text !== '') } : plain
}

// ---- Insertar marcas desde el editor ---------------------------------------------

// Envuelve [from, to) con `mark` a los dos lados (**negrita**, _cursiva_). Si ya
// estaba envuelto, lo DESENVUELVE: el mismo boton pone y saca.
export function wrapMark(value, from, to, mark) {
  const s = String(value == null ? '' : value)
  const a = Math.max(0, Math.min(from ?? 0, s.length))
  const b = Math.max(a, Math.min(to ?? a, s.length))
  const inner = a === b ? 'texto' : s.slice(a, b)
  const n = mark.length
  // Ya marcado, en cualquiera de las dos formas: con las marcas adentro o afuera.
  if (inner.startsWith(mark) && inner.endsWith(mark) && inner.length > n * 2) {
    const bare = inner.slice(n, -n)
    return { value: s.slice(0, a) + bare + s.slice(b), selection: [a, a + bare.length] }
  }
  if (s.slice(a - n, a) === mark && s.slice(b, b + n) === mark) {
    return { value: s.slice(0, a - n) + inner + s.slice(b + n), selection: [a - n, a - n + inner.length] }
  }
  return {
    value: s.slice(0, a) + mark + inner + mark + s.slice(b),
    selection: [a + n, a + n + inner.length],
  }
}

// Convierte en lista las lineas tocadas por la seleccion. Si YA son de esa lista, les
// saca la marca (el mismo boton prende y apaga). `kind` = 'ul' | 'ol'.
export function toggleList(value, from, to, kind) {
  const s = String(value == null ? '' : value)
  const a = Math.max(0, Math.min(from ?? 0, s.length))
  const b = Math.max(a, Math.min(to ?? a, s.length))
  // Estirar a lineas completas.
  const start = s.lastIndexOf('\n', a - 1) + 1
  const endNl = s.indexOf('\n', b)
  const end = endNl < 0 ? s.length : endNl
  const lines = (s.slice(start, end) || 'texto').split('\n')
  const re = kind === 'ul' ? BULLET_RE : ORDERED_RE
  const already = lines.every((l) => !l.trim() || re.test(l))
  const next = lines.map((l, i) => {
    if (!l.trim()) return l
    const m = l.match(re)
    if (already && m) return m[1]
    // Sacar la marca de la OTRA lista antes de poner la propia, si no se apilan.
    const bare = (l.match(BULLET_RE) || l.match(ORDERED_RE) || [null, l])[1]
    return kind === 'ul' ? `- ${bare}` : `${i + 1}. ${bare}`
  }).join('\n')
  return {
    value: s.slice(0, start) + next + s.slice(end),
    selection: [start, start + next.length],
  }
}

// Inserta la marca de enlace alrededor de [from, to) de `value`. Si no hay seleccion
// (from === to) inserta un enlace con texto de ejemplo. Devuelve { value, selection }
// con la posicion donde conviene dejar el cursor.
export function wrapLink(value, from, to, url) {
  const s = String(value == null ? '' : value)
  const a = Math.max(0, Math.min(from ?? 0, s.length))
  const b = Math.max(a, Math.min(to ?? a, s.length))
  const label = a === b ? 'texto del enlace' : s.slice(a, b)
  const marked = `[${label}](${url})`
  return {
    value: s.slice(0, a) + marked + s.slice(b),
    // Deja seleccionado el texto del enlace, para poder reescribirlo enseguida.
    selection: [a + 1, a + 1 + label.length],
  }
}
