// Enlaces DENTRO de un texto largo (el "cuerpo" de un componente).
//
// Una celda del Excel es texto plano, asi que el enlace se marca con una notacion
// inline al estilo markdown:  [texto del enlace](https://destino)
// Asi el dato viaja entero en una sola celda: el mercado ve que parte del parrafo va
// enlazada y a donde, y puede editarlo sin herramientas raras.
//
// El builder no obliga a escribir esa notacion a mano: en el editor se selecciona el
// texto y se aprieta "Enlace" (ver ContentForm), que la inserta sola.

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
