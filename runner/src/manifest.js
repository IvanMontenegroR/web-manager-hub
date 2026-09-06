// El MANIFIESTO: la descripcion de una pagina, independiente de Drupal y de la
// herramienta que lo genero. Es el contrato que sobrevive a todo lo demas — si mañana
// se puede escribir por API, el mismo archivo alimenta esa version.
//
// Formato (manifest 1):
//
// {
//   "manifest": 1,
//   "page": { "title": "...", "path": "/adopta/...", "published": false },
//   "blocks": [
//     { "type": "c_text",                        // machine name del paragraph
//       "fields": { "field_c_text": "..." },     // valores por machine name de campo
//       "children": [ { "slot": 0, ...bloque } ] // solo en contenedores
//     }
//   ]
// }
//
// Reglas:
//   - `type` y `fields` usan los nombres de MAQUINA del CMS, no nuestras etiquetas.
//   - Las IMAGENES no van en el manifiesto: subirlas a la Media library se hace a
//     mano (ver README). Un campo de imagen en `fields` se ignora con aviso.
//   - `published` es siempre opcional y por defecto FALSE: el runner deja borradores.
import { readFileSync } from 'node:fs'

export const MANIFEST_VERSION = 1

export function loadManifest(file) {
  let raw
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'))
  } catch (e) {
    throw new Error(`No se pudo leer el manifiesto ${file}: ${e.message}`)
  }
  return validateManifest(raw, file)
}

export function validateManifest(m, file = '(inline)') {
  const err = (msg) => { throw new Error(`Manifiesto invalido (${file}): ${msg}`) }
  if (!m || typeof m !== 'object') err('no es un objeto')
  if (m.manifest !== MANIFEST_VERSION) err(`"manifest" tiene que ser ${MANIFEST_VERSION}, vino ${JSON.stringify(m.manifest)}`)
  if (!m.page || typeof m.page !== 'object') err('falta "page"')
  if (!m.page.title || typeof m.page.title !== 'string') err('falta "page.title"')
  if (!Array.isArray(m.blocks)) err('"blocks" tiene que ser un array')

  const walk = (blocks, path) => blocks.forEach((b, i) => {
    const at = `${path}[${i}]`
    if (!b || typeof b !== 'object') err(`${at} no es un objeto`)
    if (!b.type || typeof b.type !== 'string') err(`${at} no tiene "type"`)
    if (b.fields && typeof b.fields !== 'object') err(`${at}.fields no es un objeto`)
    if (b.children) {
      if (!Array.isArray(b.children)) err(`${at}.children no es un array`)
      walk(b.children, `${at}.children`)
    }
  })
  walk(m.blocks, 'blocks')
  return m
}

// Cuenta de bloques, contando los hijos. Sirve para el log y para avisar antes de
// arrancar cuanto se va a construir.
export function countBlocks(blocks) {
  return blocks.reduce((n, b) => n + 1 + (b.children ? countBlocks(b.children) : 0), 0)
}
