// El MAPA DE CAMPOS: como se ve el formulario de ESTE Drupal. Vive fuera del codigo a
// proposito — es lo unico especifico del proyecto, asi que otro sitio se soporta
// agregando un mapping, no tocando el runner.
//
// Se escribe a partir del HTML real del formulario (o de lo que devuelve
// `page-runner inspect`). NO se inventa.
//
// Formato:
//
// {
//   "name": "purina-latam",
//   "site": "https://…",
//   "nodeAdd": "/node/add/dsu_component_page",
//   "title":     "input[name=\"title[0][value]\"]",
//   "published": "input[name=\"status[value]\"]",
//   "pathauto":  "input[name=\"path[0][pathauto]\"]",   // opcional
//   "path":      "input[name=\"path[0][alias]\"]",      // opcional
//   "save":      "input[name=\"op\"][value=\"Guardar\"]:visible",
//   "paragraphs": {
//     "dsel": "edit-field-ln-n-components-{delta}",     // ver abajo
//     "base": "field_ln_n_components[{delta}][subform]",
//     "add":  { "mode": "select", "select": "…", "button": "…" },
//     "open": ["[data-drupal-selector=\"{dsel}-subform-advanced\"]"],
//     "types": { … }
//   }
// }
//
// DIRECCIONAR UNA FILA. Drupal le pega un sufijo aleatorio a cada `id`
// (`…-top-type--2CcdPKqYQCQ`), asi que los selectores se apoyan SIEMPRE en `name=` o en
// `data-drupal-selector=`, que son estables. Cada paragraph se direcciona por su DELTA,
// no contando filas: `dsel` es el `data-drupal-selector` de la fila con `{delta}`
// adentro. De ahi salen tres variables que el motor calcula solo y que los selectores
// pueden usar:
//
//   {dsel}   edit-field-ln-n-components-4
//   {dselw}  edit-field-ln-n-components-widget-4        (la variante de field_group:
//            Drupal mete "widget-" antes de cada delta en los grupos plegables)
//   {npath}  field_ln_n_components_4                    (la misma ruta en formato de
//            `name`, que es como se llaman los botones de agregar)
//
// mas `{base}` (el prefijo del `name` de los campos del paragraph) y `{delta}`.
//
// AGREGAR UN PARAGRAPH — dos formas, segun como este configurado el widget:
//   "select":  un desplegable de tipos + un boton      { select, button }
//   "buttons": un boton por tipo, con `{bundle}` en el
//              nombre; si hay un modal que los tapa,
//              `open` es el boton que lo abre           { open?, button }
//
// CONTENEDORES. Un tipo con `children.slots` acepta hijos. Cada slot es una ranura
// (las dos columnas de un layout, los items de un acordeon) y trae su propio `dsel`,
// `base` y `add`, escritos con las variables de la fila PADRE. El hijo del manifiesto
// elige con `"slot": 0`. Un slot puede declarar `max`: cuantos componentes entran ahi
// (una pestaña lleva UNO solo). Pasarse frena la corrida.
//
// `kind` de un campo: text (default) | richtext | select | checkbox | image (se saltea).
// Un `richtext` puede traer `format: { sel, value }`: el selector de formato de texto se
// pone ANTES de escribir, porque el CMS arranca en uno que no admite HTML.
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
  if (!m.paragraphs?.dsel) err('falta "paragraphs.dsel"')
  if (!m.paragraphs?.add?.mode) err('falta "paragraphs.add.mode"')
  m.paragraphs.types = m.paragraphs.types || {}
  return m
}

// Reemplaza las variables en un selector. Las que no se pasan quedan sin tocar, que es
// como los selectores de un slot conservan su `{delta}` hasta que el hijo sabe en que
// posicion cayo.
export function resolveSelector(sel, vars) {
  let out = String(sel)
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined || v === null) continue
    out = out.replaceAll(`{${k}}`, String(v))
  }
  return out
}

// La fila con ese `data-drupal-selector`. Es un elemento o ninguno: no se cuenta nada.
export const rowSelector = (dsel) => `[data-drupal-selector="${dsel}"]`

// Las dos formas en que Drupal escribe la misma ruta.
//   edit-field-ln-n-components-4  ->  edit-field-ln-n-components-widget-4
// field_group mete "widget-" antes de cada delta. (Si algun dia un campo del CMS
// terminara en un numero, este reemplazo lo tomaria por un delta.)
export const widgetDsel = (dsel) => dsel.replace(/-(\d+)(?=-|$)/g, '-widget-$1')
//   edit-field-ln-n-components-4  ->  field_ln_n_components_4
export const namePath = (dsel) => dsel.replace(/^edit-/, '').replaceAll('-', '_')
// El wrapper del CAMPO, a partir de la plantilla de sus filas. Es lo que acota la
// busqueda de los botones "agregar en el medio" a ESA lista y no a una de adentro.
//   edit-…-field-c-subitems-{delta}  ->  edit-…-field-c-subitems-wrapper
export const fieldWrapper = (dselTpl) => String(dselTpl).replace(/-\{delta\}$/, '-wrapper')

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
