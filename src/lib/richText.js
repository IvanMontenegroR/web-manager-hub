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

// ¿El texto tiene alguna marca de formato? Se usa para mostrar la ayuda en el editor
// solo cuando hace falta.
export function hasRich(value) {
  const s = String(value == null ? '' : value)
  INLINE_RE.lastIndex = 0
  return INLINE_RE.test(s) || /(^|\n)\s*([-*•]\s+|\d+[.)]\s+)/.test(s) || /\n/.test(s)
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
