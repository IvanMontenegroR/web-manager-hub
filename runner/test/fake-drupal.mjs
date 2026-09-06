// Un Drupal de MENTIRA, del tamaño justo para probar el motor: reproduce las formas
// del formulario real de Paragraphs (los `name` con delta y subform, el alta por AJAX,
// los <details> plegados, CKEditor sobre un textarea) sin necesitar un Drupal.
//
// No prueba que el mapping sea correcto — eso solo lo dice el CMS de verdad. Prueba
// que el motor sabe agregar, esperar, abrir desplegables, llenar y anidar.
import { createServer } from 'node:http'

const FORM = `<!doctype html><html><head><meta charset="utf-8"><title>Crear pagina</title>
<style>body{font:14px system-ui;margin:24px} .js-form-item{margin:8px 0} details{margin:8px 0;padding:6px;border:1px solid #ccc}
.row{border:1px solid #ddd;padding:10px;margin:8px 0}</style></head><body>
<h1>Crear pagina</h1>
<form id="f" onsubmit="return false">
  <div class="js-form-item"><label for="t">Titulo</label>
    <input id="t" name="title[0][value]" type="text"></div>
  <div class="js-form-item"><label for="pub">Publicado</label>
    <input id="pub" name="status[value]" type="checkbox" checked></div>

  <h2>Componentes</h2>
  <div id="rows"></div>
  <select name="field_components[add_more][add_more_select]">
    <option value="c_text">Content: Text</option>
    <option value="ln_c_cardgrid">Content: Card Grid</option>
    <option value="layout_columns_2">Layout: 2 columnas</option>
  </select>
  <input type="submit" name="field_components_add_more_add_more_button" value="Add new Paragraph">
  <hr>
  <input type="submit" id="edit-submit" value="Guardar">
</form>
<script>
let delta = 0
const rows = document.getElementById('rows')

// Campos por tipo, con las mismas formas que usa Drupal.
function subform(type, base, extra) {
  if (type === 'c_text') return \`
    <div class="js-form-item"><label>Description</label>
      <textarea name="\${base}[field_c_text][0][value]"></textarea>
      <div class="ck-editor__editable" contenteditable="true"></div></div>
    <details><summary>Optional fields</summary>
      <div class="js-form-item"><label>Titulo</label>
        <input type="text" name="\${base}[field_c_advanced_title][0][value]"></div>
      <div class="js-form-item"><label>HTML tag</label>
        <select name="\${base}[field_c_title_tag]"><option value="">- Ninguno -</option>
          <option value="h2">h2</option><option value="h3">h3</option></select></div>
    </details>\`
  if (type === 'ln_c_cardgrid') return \`
    <div class="js-form-item"><label>Modo de vista</label>
      <select name="\${base}[field_view_mode]"><option value="">-</option>
        <option value="grid-cards">Grid Cards</option>
        <option value="slider-default-card">Slider Cards Default</option></select></div>
    <details><summary>Optional fields</summary>
      <div class="js-form-item"><label>Titulo</label>
        <input type="text" name="\${base}[field_c_advanced_title][0][value]"></div></details>\`
  // contenedor: tiene su PROPIA lista de paragraphs adentro
  return \`
    <div class="js-form-item"><label>Section ID</label>
      <input type="text" name="\${base}[field_section_id][0][value]"></div>
    <div class="kids" data-base="\${base}"><div class="kidrows"></div>
      <select name="\${base}[field_children][add_more][add_more_select]">
        <option value="c_text">Content: Text</option>
        <option value="ln_c_cardgrid">Content: Card Grid</option></select>
      <input type="submit" name="\${base}[field_children_add_more_add_more_button]" value="Add new Paragraph">
    </div>\`
}

function wire(scope) {
  scope.querySelectorAll('.kids').forEach((k) => {
    if (k.dataset.wired) return
    k.dataset.wired = '1'
    let kd = 0
    const kr = k.querySelector('.kidrows')
    k.querySelector(':scope > input[type=submit]').addEventListener('click', () => {
      // scope directo a proposito: los subforms de los hijos tienen sus propios selects.
      const type = k.querySelector(':scope > select').value
      const base = k.dataset.base + '[field_children][' + (kd) + '][subform]'
      const el = document.createElement('div')
      el.className = 'row kidrow'
      // AJAX de mentira: el subform aparece despues, como en Drupal.
      setTimeout(() => { el.innerHTML = subform(type, base); kr.appendChild(el); wire(el) }, 250)
      kd++
    })
  })
}

document.querySelector('input[name="field_components_add_more_add_more_button"]').addEventListener('click', () => {
  const type = document.querySelector('select[name="field_components[add_more][add_more_select]"]').value
  const base = 'field_components[' + delta + '][subform]'
  delta++
  setTimeout(() => {
    const el = document.createElement('div')
    el.className = 'row'
    el.innerHTML = subform(type, base)
    rows.appendChild(el)
    wire(el)
  }, 250)
})

document.getElementById('edit-submit').addEventListener('click', () => {
  location.href = '/node/123'
})
</script></body></html>`

export function startFakeDrupal() {
  const server = createServer((req, res) => {
    const url = req.url.split('?')[0]
    if (url === '/user') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<h1>Ivan</h1>') }
    if (url === '/node/add/page') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(FORM) }
    if (url === '/node/123') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<h1>Guardado</h1>') }
    res.writeHead(404); res.end('no')
  })
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ server, port: server.address().port })))
}
