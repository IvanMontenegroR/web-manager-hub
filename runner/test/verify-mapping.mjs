// Verifica un mapping contra el HTML REAL del formulario, sin tocar el CMS.
//
//   node test/verify-mapping.mjs mapping/purina-latam.json form.html
//
// Es la prueba mas fuerte que se puede hacer offline: resuelve cada selector del mapping
// y comprueba que ese `name=` o `data-drupal-selector=` exista de verdad en el
// formulario. Lo que NO puede decir es si el valor que se escribe es el correcto, ni si
// el CMS acepta la pagina: eso solo lo dice `build` contra el sitio.
//
// El volcado se saca a mano: en el navegador, sobre /node/add/<tipo> CON UN PARAGRAPH DE
// CADA CLASE YA AGREGADO (los subforms no existen en el DOM hasta que se los agrega),
// "Inspeccionar" -> copiar el <html> a un archivo. Ese archivo NO se versiona: lleva el
// token CSRF de la sesion, rutas internas y nombres de usuario. Los .html estan en el
// .gitignore por eso.
import { readFileSync } from 'node:fs'

const [mapFile, htmlFile] = process.argv.slice(2)
if (!mapFile || !htmlFile) {
  process.stderr.write('uso: node test/verify-mapping.mjs <mapping.json> <form.html>\n')
  process.exit(2)
}
const M = JSON.parse(readFileSync(mapFile, 'utf8'))
const H = readFileSync(htmlFile, 'utf8')

const widget = (s) => s.replace(/-(\d+)(?=-|$)/g, '-widget-$1')
const npath = (s) => s.replace(/^edit-/, '').replaceAll('-', '_')
const res = (s, v) => { let o = String(s); for (const [k, x] of Object.entries(v)) o = o.replaceAll(`{${k}}`, x); return o }
const hasName = (n) => H.includes(` name="${n}"`)
const hasDsel = (d) => H.includes(`data-drupal-selector="${d}"`)

// Un selector del mapping se reduce a lo unico que importa aca: por que atributo busca.
function exists(sel) {
  for (const part of String(sel).split(', ')) {
    const n = /name="([^"]+)"/.exec(part)
    if (n && hasName(n[1])) return true
    const d = /data-drupal-selector="([^"]+)"/.exec(part)
    if (d && hasDsel(d[1])) return true
  }
  return false
}

// etiqueta del desplegable de tipos -> machine name del bundle
const LABEL2BUNDLE = new Map()
{
  const i = H.indexOf(`name="${/name="([^"]+)"/.exec(M.paragraphs.add.select)?.[1]}"`)
  const inner = i < 0 ? '' : H.slice(i, H.indexOf('</select>', i))
  for (const o of inner.matchAll(/<option value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/g)) {
    LABEL2BUNDLE.set(o[2].replace(/<[^>]*>/g, '').trim(), o[1])
  }
  // Los bundles que solo existen adentro de un contenedor no estan en ese desplegable:
  // para esos vale la etiqueta que declara el mapping. Si estuviera mal, los campos no
  // van a coincidir y se ve igual.
  for (const [t, d] of Object.entries(M.paragraphs.types)) if (d.label && !LABEL2BUNDLE.has(d.label)) LABEL2BUNDLE.set(d.label, t)
}

// Que bundle es la fila con este data-drupal-selector. Sale del icono del encabezado
// (que trae el machine name en el nombre del archivo) o, si no tiene, de la etiqueta.
function bundleAt(dsel) {
  const i = H.indexOf(`data-drupal-selector="${dsel}-top-type"`)
  if (i < 0) return null
  const seg = H.slice(i, i + 900)
  const icon = /paragraphs_type_icon\/([a-z0-9_]+)-/.exec(seg)
  if (icon) return icon[1]
  const label = /<span class="paragraph-type-label">([\s\S]*?)<\/span>/.exec(seg)
  return label ? LABEL2BUNDLE.get(label[1].trim()) || null : null
}

// Todas las posiciones que se pueden identificar en el volcado: las filas sueltas y,
// adentro de cada contenedor, los hijos de cada slot.
function positions() {
  const out = []
  const walk = (dselTpl, baseTpl, depth) => {
    for (let d = 0; d < 40; d++) {
      const dsel = res(dselTpl, { delta: d })
      if (!hasDsel(dsel)) break
      const bundle = bundleAt(dsel)
      if (!bundle) continue
      const base = res(baseTpl, { delta: d })
      const v = { base, dsel, dselw: widget(dsel), npath: npath(dsel) }
      out.push({ bundle, v })
      const slots = M.paragraphs.types[bundle]?.children?.slots || []
      if (depth < 3) for (const s of slots) walk(res(s.dsel, v), res(s.base, v), depth + 1)
    }
  }
  walk(M.paragraphs.dsel, M.paragraphs.base, 0)
  return out
}

let ok = 0, mal = 0
const fail = (msg) => { mal++; console.log('  FALTA ' + msg) }
const chk = (sel, ref) => { if (exists(sel)) ok++; else fail(`${ref} -> ${sel}`) }

for (const k of ['title', 'published', 'pathauto', 'path', 'save']) if (M[k]) chk(M[k], k)
chk(M.paragraphs.add.select, 'add.select')
chk(M.paragraphs.add.button, 'add.button')

const vistos = new Set()
const ausentes = []
const sinWidget = []
for (const { bundle, v } of positions()) {
  const def = M.paragraphs.types[bundle]
  if (!def) { fail(`el mapping no conoce "${bundle}", que esta en el volcado`); continue }
  vistos.add(bundle)
  for (const [key, f] of Object.entries(def.fields || {})) {
    if (f.kind === 'image') continue          // no se automatizan: no tienen campo
    chk(res(f.sel, v), `${bundle}.${key}`)
    if (f.format) chk(res(f.format.sel, v), `${bundle}.${key} (formato)`)
  }
  // Un grupo plegable que este tipo no tiene NO es un error: el motor lo saltea.
  for (const tpl of [...(M.paragraphs.open || []), ...(def.open || [])]) {
    if (!exists(res(tpl, v))) ausentes.push(`${bundle}: ${/"([^"]+)"/.exec(res(tpl, v))?.[1]}`)
  }
  for (const s of def.children?.slots || []) {
    // El boton de alta se prueba con el bundle que el volcado tenga en ese slot.
    const kid = bundleAt(res(s.dsel, { ...v, delta: 0 }))
    const pruebas = [
      s.add.open && [res(s.add.open, v), 'abrir el desplegable de tipos'],
      kid && [res(s.add.button, { ...v, bundle: kid }), `agregar ${kid}`],
    ].filter(Boolean)
    // Una ranura con tope LLENA puede no traer el widget de alta: Drupal lo esconde
    // cuando la cardinalidad esta cubierta. Si no esta, no es que falte — es que en este
    // volcado no hay nada que mirar. Si esta (una pestaña vacia), se verifica igual.
    const lleno = s.max != null && hasDsel(res(s.dsel, { ...v, delta: s.max - 1 }))
    if (lleno && !pruebas.some(([sel]) => exists(sel))) {
      sinWidget.push(`${bundle}.${s.label}`)
      continue
    }
    for (const [sel, ref] of pruebas) chk(sel, `${bundle}.${s.label}: ${ref}`)
  }
}

const sinProbar = Object.keys(M.paragraphs.types).filter((t) => !vistos.has(t))
console.log(`\n${ok} selectores encontrados, ${mal} sin encontrar`)
if (ausentes.length) console.log(`grupos plegables que ese tipo no tiene (esperable): ${ausentes.length}`)
if (sinWidget.length) console.log(`ranuras que en el volcado ya estaban llenas, asi que su boton de alta no se pudo mirar: ${[...new Set(sinWidget)].join(', ')}`)
if (sinProbar.length) console.log(`tipos del mapping que el volcado no trae, sin verificar: ${sinProbar.join(', ')}`)
console.log(mal ? 'MAL' : 'OK')
process.exit(mal ? 1 : 0)
