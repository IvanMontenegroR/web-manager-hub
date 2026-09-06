// El MAPA DE CAMPOS: como se ve el formulario de ESTE Drupal. Vive fuera del codigo a
// proposito — es lo unico especifico del proyecto, asi que otro sitio se soporta
// agregando un mapping, no tocando el runner.
//
// Se escribe a partir de lo que devuelve `page-runner inspect`, que vuelca la
// estructura real del formulario. NO se inventa.
//
// Formato:
//
// {
//   "name": "purina-latam",
//   "site": "https://…",
//   "nodeAdd": "/node/add/page",
//   "title": "input[name=\"title[0][value]\"]",
//   "published": "input[name=\"status[value]\"]",
//   "save": "#edit-submit",
//   "paragraphs": {
//     "row": "[data-drupal-selector^=\"edit-field-components-\"] > table > tbody > tr",
//     "base": "field_components[{delta}][subform]",
//     "add": { "mode": "select",           // "select" (desplegable + boton) o "button"
//              "select": "select[name=\"field_components[add_more][add_more_select]\"]",
//              "button": "input[name=\"field_components_add_more_add_more_button\"]" },
//     "types": {
//       "c_text": {
//         "label": "Content: Text",        // lo que se elige en el desplegable
//         "value": "c_text",               // value de la opcion, si difiere
//         "open": ["summary:has-text(\"Optional fields\")"],   // desplegables a abrir
//         "fields": {
//           "field_c_text": { "sel": "textarea[name=\"{base}[field_c_text][0][value]\"]", "kind": "richtext" },
//           "field_c_advanced_title": { "sel": "input[name=\"{base}[field_c_advanced_title][0][value]\"]" }
//         }
//       }
//     }
//   }
// }
//
// `kind`: text (default) | richtext | select | checkbox | image (se saltea).
import { readFileSync } from 'node:fs'

export function loadMapping(file) {
  let m
  try {
    m = JSON.parse(readFileSync(file, 'utf8'))
  } catch (e) {
    throw new Error(`No se pudo leer el mapping ${file}: ${e.message}`)
  }
  const err = (msg) => { throw new Error(`Mapping invalido (${file}): ${msg}`) }
  if (!m.site) err('falta "site"')
  for (const k of ['nodeAdd', 'title', 'save']) if (!m[k]) err(`falta "${k}"`)
  if (!m.paragraphs?.base) err('falta "paragraphs.base"')
  if (!m.paragraphs?.row) err('falta "paragraphs.row"')
  if (!m.paragraphs?.add?.mode) err('falta "paragraphs.add.mode"')
  m.paragraphs.types = m.paragraphs.types || {}
  return m
}

// Reemplaza {base} y {delta} en un selector. `base` sale de `paragraphs.base` con el
// delta ya puesto: es el prefijo del `name` de todos los campos de ese paragraph.
export function resolveSelector(sel, { base, delta }) {
  return String(sel).replaceAll('{base}', base).replaceAll('{delta}', String(delta))
}

export function baseFor(mapping, delta) {
  return resolveSelector(mapping.paragraphs.base, { base: '', delta })
}

// Los tipos de paragraph que el mapping conoce. Un manifiesto que pida uno que no
// esta se frena antes de tocar el navegador, con la lista de lo que falta.
export function missingTypes(mapping, blocks) {
  const known = new Set(Object.keys(mapping.paragraphs.types))
  const falta = new Set()
  const walk = (bs) => bs.forEach((b) => {
    if (!known.has(b.type)) falta.add(b.type)
    if (b.children) walk(b.children)
  })
  walk(blocks)
  return [...falta]
}
