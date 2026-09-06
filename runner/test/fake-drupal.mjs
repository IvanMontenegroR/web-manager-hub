// Un Drupal de MENTIRA, del tamaño justo para probar el motor. Reproduce las formas del
// formulario REAL de Paragraphs, que son las que le complican la vida al runner:
//   - los `name` con delta y subform, y los `id` con sufijo aleatorio (por eso el motor
//     se apoya en `name=` y `data-drupal-selector=`)
//   - el alta por AJAX: el subform no existe hasta que se lo pide
//   - las CUATRO formas de agregar: desplegable + boton (el nodo), un boton por tipo
//     detras de un modal, el dropbutton de Gin (el primero a la vista y el resto plegado)
//     y el "agregar en el medio" de paragraphs_features, que ESCONDE el area del final
//   - contenedores con VARIOS slots (las dos columnas de un layout)
//   - los <details> plegados, con la variante "widget-" que usa field_group, y el panel
//     cerrado de la barra lateral donde vive el alias de URL
//   - el select de formato de texto arrancando en uno que NO admite HTML
//   - CKEditor sobre un textarea
//
// No prueba que el mapping sea correcto — eso solo lo dice el CMS de verdad. Prueba
// que el motor sabe agregar, esperar, abrir desplegables, llenar y anidar.
import { createServer } from 'node:http'

const FORM = `<!doctype html><html><head><meta charset="utf-8"><title>Crear pagina</title>
<style>body{font:14px system-ui;margin:24px} .js-form-item{margin:8px 0}
details{margin:8px 0;padding:6px;border:1px solid #ccc} details:not([open]) .js-form-item{display:none}
.row{border:1px solid #ddd;padding:10px;margin:8px 0} .modal{display:none} .modal.on{display:block}
.drop .secondary-action{display:none} .drop.open .secondary-action{display:inline-block}</style></head><body>
<h1>Crear pagina</h1>
<form id="f" onsubmit="return false">
  <div class="js-form-item"><label for="t">Titulo</label>
    <input id="t" name="title[0][value]" type="text"></div>
  <div class="js-form-item"><label for="pub">Publicado</label>
    <input id="pub" name="status[value]" type="checkbox" checked></div>
  <!-- Como en el formulario real: el alias vive en un panel PLEGADO de la barra lateral,
       asi que el check existe pero no se ve hasta que alguien lo abre. -->
  <details id="urlpath"><summary>Configuracion de la ruta URL</summary>
    <div class="js-form-item"><label for="pa">Generar alias automatico</label>
      <input id="pa" name="path[0][pathauto]" type="checkbox" checked></div>
    <div class="js-form-item"><label for="al">Alias</label>
      <input id="al" name="path[0][alias]" type="text" disabled></div>
  </details>

  <h2>Componentes</h2>
  <div id="rows"></div>
  <select name="field_components[add_more][add_more_select]">
    <option value="c_text">Content: Text</option>
    <option value="ln_c_cardgrid">Content: Card Grid</option>
    <option value="layout_columns_2">Layout: 2 columnas</option>
  </select>
  <input type="submit" name="field_components_add_more" value="Add another Component">
  <hr>
  <input type="submit" name="op" value="Guardar" id="edit-submit--xY9">
</form>
<script>
const rows = document.getElementById('rows')
// Drupal le pega un sufijo aleatorio a cada id: el motor NO puede confiar en ellos.
const rnd = () => '--' + Math.random().toString(36).slice(2, 10)

// Campos por tipo, con las mismas formas que usa Drupal. \`dsel\` es la ruta estable de
// la fila; \`dw\` es la variante con "widget-" que field_group usa en los plegables.
function subform(type, base, dsel, npath) {
  const dw = dsel.replace(/-(\\d+)(?=-|$)/g, '-widget-$1')
  const advanced = \`
    <details data-drupal-selector="\${dsel}-subform-advanced" id="\${dsel}-adv\${rnd()}">
      <summary>Avanzado</summary>
      <div class="js-form-item"><label>Section ID</label>
        <input type="text" name="\${base}[section_id][0][value]"></div></details>
    <details open data-drupal-selector="\${dsel}-subform-classy" id="\${dsel}-cl\${rnd()}">
      <summary>Classy</summary>
      <div class="js-form-item"><label>Background Color</label>
        <select name="\${base}[classy][0][\${type}][background_color]">
          <option value="_none">Default</option>
          <option value="bg_brand_01">Brand 01</option></select></div></details>\`

  if (type === 'c_text') return \`
    <div class="js-form-item"><label>Description</label>
      <textarea name="\${base}[field_c_text][0][value]"></textarea>
      <div class="ck-editor__editable" contenteditable="true"></div>
      <select name="\${base}[field_c_text][0][format]">
        <option value="email_html" selected>Email HTML</option>
        <option value="rich_text">Rich text</option></select></div>
    <details data-drupal-selector="\${dw}-subform-group-optional-fields" id="\${dsel}-op\${rnd()}">
      <summary>Optional fields</summary>
      <div class="js-form-item"><label>Titulo</label>
        <input type="text" name="\${base}[field_c_advanced_title][0][value]"></div>
      <div class="js-form-item"><label>HTML tag</label>
        <select name="\${base}[field_c_advanced_title][0][html_tag]"><option value="">- Ninguno -</option>
          <option value="h2">h2</option><option value="h3">h3</option></select></div>
    </details>\${advanced}\`

  if (type === 'ln_c_cardgrid') return \`
    <div class="js-form-item"><label>Modo de vista</label>
      <select name="\${base}[field_c_cardgrid_view_mode]"><option value="_none">-</option>
        <option value="grid-cards">Grid Cards</option>
        <option value="slider-default-card">Slider Cards Default</option></select></div>
    <details data-drupal-selector="\${dw}-subform-group-optional-fields" id="\${dsel}-op\${rnd()}">
      <summary>Optional fields</summary>
      <div class="js-form-item"><label>Titulo</label>
        <input type="text" name="\${base}[field_c_advanced_title][0][value]"></div></details>
    \${advanced}\${slotHtml('Cards', base, dsel, npath, 'field_c_subitems', 'drop')}\`

  // Layout: DOS slots, cada uno con su modal de tipos.
  return advanced
    + slotHtml('Columna 1', base, dsel, npath, 'field_column_first', 'modal')
    + slotHtml('Columna 2', base, dsel, npath, 'field_column_second', 'entre')
}

// Una ranura de un contenedor, en las CUATRO formas que usa el CMS:
//   'modal' — los botones tapados hasta que se abre el modal de paragraphs_ee
//   'drop'  — dropbutton de Gin: el primero a la vista, el resto plegado tras el toggle
//   'entre' — paragraphs_features: el area del final ESCONDIDA (display:none) y en su
//             lugar un boton por bundle adentro de la tabla ("agregar en el medio")
//   'plain' — un solo bundle permitido, el boton suelto
function slotHtml(label, base, dsel, npath, field, modo) {
  const fd = field.replace(/_/g, '-')
  // El primero queda a la vista y el resto plegado, asi que c_text va segundo a proposito:
  // es el que agrega la prueba, y solo llega a el si abrio el toggle.
  const types = ['ln_c_cardgrid', 'c_text']
  const btns = types.map((t, i) =>
    \`<button type="button" class="\${modo === 'drop' && i ? 'secondary-action' : ''}"
       name="\${npath}_subform_\${field}_\${t}_add_more">\${t}</button>\`).join('')
  // En 'entre', el area del final existe pero esta escondida: es exactamente lo que hace
  // paragraphs_features, y lo que hacia fallar al runner con "element is not visible".
  const escondida = modo === 'entre' ? ' style="display:none"' : ''
  // Dos clases de boton "en el medio", como en el CMS: uno por bundle cuando la lista
  // tiene pocos tipos a mano, y uno GENERICO ("+ Add") que abre el dialogo cuando no.
  // Aca c_text tiene el suyo y ln_c_cardgrid no, para que la prueba pase por los dos.
  const enMedio = modo === 'entre'
    ? \`<button type="button" class="paragraphs-features__add-in-between__button"
         data-paragraph-bundle="c_text">+ c_text</button>
       <button type="button" class="paragraphs-features__add-in-between__button gen">+ Add</button>\`
    : ''
  return \`<fieldset class="slot" data-drupal-selector="\${dsel}-subform-\${fd}-wrapper"
      data-slot="\${dsel}-subform-\${fd}" data-base="\${base}[\${field}]"
      data-npath="\${npath}_subform_\${field}">
    <legend>\${label}</legend><div class="slotrows"></div>
    <div class="enmedio">\${enMedio}</div>
    \${modo === 'modal' || modo === 'entre' ? \`<div\${escondida}><input type="submit" name="button_add_modal"
        data-drupal-selector="\${dsel}-subform-\${fd}-add-more-add-modal-form-area-add-more"
        value="Add Component to Column"></div>\` : ''}
    <div class="\${modo === 'drop' ? 'drop' : 'modal'}\${modo === 'modal' || modo === 'entre' ? '' : ' on'}"
         data-drupal-selector="\${dsel}-subform-\${fd}-add-more">
      \${modo === 'drop' ? '<button type="button" class="dropbutton__toggle">Mas</button>' : ''}
      \${btns}</div></fieldset>\`
}

// El "AJAX" de mentira: el subform aparece un rato despues de pedirlo, como en Drupal.
function addTo(container, base, dsel, npath, type) {
  const el = document.createElement('div')
  el.className = 'row'
  el.setAttribute('data-drupal-selector', dsel)
  setTimeout(() => {
    el.innerHTML = subform(type, base, dsel, npath)
    container.appendChild(el)
    wire(el)
  }, 250)
}

function wire(scope) {
  scope.querySelectorAll('.slot').forEach((s) => {
    if (s.dataset.wired) return
    s.dataset.wired = '1'
    const list = s.querySelector('.slotrows')
    const box = s.querySelector('.modal, .drop')
    const opener = s.querySelector('input[name="button_add_modal"]')
    if (opener) opener.addEventListener('click', () => box.classList.add('on'))
    const toggle = box.querySelector('.dropbutton__toggle')
    if (toggle) toggle.addEventListener('click', () => box.classList.toggle('open'))
    s.querySelectorAll('.enmedio button').forEach((b) => b.addEventListener('click', () => {
      // El generico no agrega: destapa la lista de tipos, igual que el dialogo de ee.
      if (!b.dataset.paragraphBundle) { box.classList.add('on'); return }
      const d = list.children.length
      addTo(list, s.dataset.base + '[' + d + '][subform]', s.dataset.slot + '-' + d,
        s.dataset.npath + '_' + d, b.dataset.paragraphBundle)
    }))
    box.querySelectorAll('button[name]').forEach((b) => b.addEventListener('click', () => {
      const type = b.name.replace(s.dataset.npath + '_', '').replace('_add_more', '')
      const d = list.children.length
      addTo(list, s.dataset.base + '[' + d + '][subform]', s.dataset.slot + '-' + d, s.dataset.npath + '_' + d, type)
      if (opener) box.classList.remove('on')
      box.classList.remove('open')
    }))
  })
}

// El desplegable de tipos TAMBIEN dispara AJAX en el CMS real. Mientras esa peticion
// esta en vuelo, apretar Agregar encima hace que Drupal conteste "Oops, something went
// wrong" y no agregue nada. Se reproduce igual: un throbber mientras dura, y el boton
// que falla si lo tocan antes de tiempo.
const sel = document.querySelector('select[name="field_components[add_more][add_more_select]"]')
let enVuelo = false
function throbber(prender) {
  document.getElementById('thr')?.remove()
  if (!prender) return
  const d = document.createElement('div')
  d.id = 'thr'; d.className = 'ajax-progress'; d.textContent = 'Cargando…'
  sel.after(d)
}
sel.addEventListener('change', () => {
  enVuelo = true; throbber(true)
  setTimeout(() => { enVuelo = false; throbber(false) }, 400)
})

// El CMS de verdad, en preprod, a veces contesta 504: el servidor tardo y el proxy corto.
// Aca se reproduce fallando la PRIMERA vez que se agrega un card grid, para que la prueba
// pase por el reintento.
let yaFallo = false
document.querySelector('input[name="field_components_add_more"]').addEventListener('click', () => {
  if (!yaFallo && sel.value === 'ln_c_cardgrid') {
    yaFallo = true
    fetch('/boom').catch(() => {})
    return
  }
  if (enVuelo) {
    const e = document.createElement('div')
    e.className = 'messages messages--error'
    e.textContent = 'Oops, something went wrong.'
    document.body.prepend(e)
    return
  }
  const type = sel.value
  const d = rows.children.length
  addTo(rows, 'field_components[' + d + '][subform]', 'edit-field-components-' + d, 'field_components_' + d, type)
})

// El alias esta deshabilitado mientras Pathauto lo genere solo, igual que en el CMS.
document.querySelector('input[name="path[0][pathauto]"]').addEventListener('change', (e) => {
  document.querySelector('input[name="path[0][alias]"]').disabled = e.target.checked
})

document.querySelector('input[name="op"]').addEventListener('click', () => { location.href = '/node/123' })
</script></body></html>`

export function startFakeDrupal() {
  const server = createServer((req, res) => {
    const url = req.url.split('?')[0]
    if (url === '/user') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<h1>Ivan</h1>') }
    if (url === '/node/add/page') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(FORM) }
    if (url === '/node/123') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<h1>Guardado</h1>') }
    if (url === '/boom') { res.writeHead(504); return res.end('gateway timeout') }
    res.writeHead(404); res.end('no')
  })
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ server, port: server.address().port })))
}
