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
  <input type="button" name="field_components_edit_all" value="Edit all">
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
//             lugar un boton por bundle adentro de la tabla ("agregar en el medio").
//             Ademas deja una PLANTILLA escondida del dialogo con los mismos nombres,
//             como paragraphs_ee: por eso hay que quedarse con el que SE VE y no con
//             el primero del DOM.
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
    <input type="button" name="\${npath}_subform_\${field}_edit_all" value="Edit all">
    <div class="enmedio">\${enMedio}</div>
    \${modo === 'entre' ? \`<div class="dialogo-plantilla" style="display:none">\${btns}</div>\` : ''}
    \${modo === 'modal' || modo === 'entre' ? \`<div\${escondida}><input type="submit" name="button_add_modal"
        data-drupal-selector="\${dsel}-subform-\${fd}-add-more-add-modal-form-area-add-more"
        value="Add Component to Column"></div>\` : ''}
    <div class="\${modo === 'drop' ? 'drop' : 'modal'}\${modo === 'modal' || modo === 'entre' ? '' : ' on'}"
         data-drupal-selector="\${dsel}-subform-\${fd}-add-more">
      \${modo === 'drop' ? '<button type="button" class="dropbutton__toggle">Mas</button>' : ''}
      \${btns}</div></fieldset>\`
}

// Paragraphs CIERRA las filas ya agregadas cada vez que se agrega otra: el subform
// desaparece y queda un resumen con un boton para volver a abrir. Los valores no se
// pierden (Drupal los guarda del lado del servidor), asi que aca se guardan aparte y se
// reponen al abrir. Es la razon por la que el runner tiene que reabrir antes de llenar.
function plegar(row) {
  if (!row.dataset.npath || row.dataset.plegada) return
  // El subform sale del DOM pero NO se destruye: se guarda aparte con sus valores y sus
  // filas anidadas, igual que Drupal, que lo tiene del lado del servidor. Lo que importa
  // para la prueba es que mientras esta plegado los campos NO existen en la pagina.
  const caja = document.createElement('div')
  while (row.firstChild) caja.appendChild(row.firstChild)
  row.guardado = caja
  row.dataset.plegada = '1'
  const b = document.createElement('button')
  b.type = 'button'
  b.name = row.dataset.npath + '_edit'
  b.textContent = 'Editar'
  b.addEventListener('click', () => desplegar(row))
  row.append(row.dataset.tipo + ' (plegado) ', b)
}

function desplegar(row) {
  if (!row.dataset.plegada) return
  row.textContent = ''
  const caja = row.guardado
  while (caja.firstChild) row.appendChild(caja.firstChild)
  row.guardado = null
  delete row.dataset.plegada
}

// El "AJAX" de mentira: el subform aparece un rato despues de pedirlo, como en Drupal.
function addTo(container, base, dsel, npath, type) {
  // Al agregar una fila, las anteriores de ESA lista se pliegan.
  ;[...container.children].forEach(plegar)
  const el = document.createElement('div')
  el.className = 'row'
  el.setAttribute('data-drupal-selector', dsel)
  Object.assign(el.dataset, { tipo: type, base, dsel, npath })
  setTimeout(() => {
    el.innerHTML = subform(type, base, dsel, npath)
    container.appendChild(el)
    wire(el)
  }, 250)
}

// "Abrir todas" de una lista: es lo que usa el runner antes de llenar.
function abrirTodas(container) { [...container.children].forEach(desplegar) }

function wire(scope) {
  scope.querySelectorAll('.slot').forEach((s) => {
    if (s.dataset.wired) return
    s.dataset.wired = '1'
    const list = s.querySelector('.slotrows')
    s.querySelector('input[name$="_edit_all"]')
      ?.addEventListener('click', () => abrirTodas(list))
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
// Con ?vaciar=1 el formulario BORRA un campo poco despues de que lo escriben. Drupal
// re-dibuja el formulario solo, asi que un valor puede desaparecer sin que nadie toque
// nada: la pagina sale armada y vacia, sin un solo error. El repaso final tiene que
// agarrarlo aunque el borrado ocurra despues de escribir.
const sabotear = new URLSearchParams(location.search).has('vaciar')
if (sabotear) {
  document.addEventListener('input', (e) => {
    // Cuando se llena un campo del TERCER bloque, se borra uno del primero: un valor que
    // ya estaba puesto desaparece solo, mas adelante en la corrida.
    if (!String(e.target.name || '').startsWith('field_components[2]')) return
    const v = document.querySelector('input[name="field_components[0][subform][field_c_advanced_title][0][value]"]')
    if (v) v.value = ''
  }, true)
}

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

document.querySelector('input[name="field_components_edit_all"]')
  .addEventListener('click', () => abrirTodas(rows))

document.querySelector('input[name="op"]').addEventListener('click', () => { location.href = '/node/123' })
</script></body></html>`

// La MEDIA LIBRARY de mentira: un formulario de alta y un listado que filtra por nombre.
// Alcanza para probar que el subidor no duplique, que es lo unico que importa ahi.
const MEDIA_FORM = `<!doctype html><html><head><meta charset="utf-8"><title>Crear medio</title></head><body>
<h1>Crear medio</h1>
<form id="f" onsubmit="return false">
  <input type="file" name="files[field_media_image_0]" id="ar">
  <div id="tras" style="display:none">
    <label>Alt <input type="text" name="field_media_image[0][alt]"></label>
    <label>Nombre <input type="text" name="name[0][value]"></label>
  </div>
  <input type="submit" name="op" value="Guardar">
</form>
<script>
// Drupal sube el archivo por AJAX y RECIEN AHI muestra el alt y el nombre.
document.getElementById('ar').addEventListener('change', (e) => {
  const f = e.target.files[0]
  setTimeout(() => {
    document.getElementById('tras').style.display = 'block'
    document.querySelector('input[name="name[0][value]"]').value = f ? f.name : ''
  }, 200)
})
document.querySelector('input[name="op"]').addEventListener('click', () => {
  const n = document.querySelector('input[name="name[0][value]"]').value
  location.href = '/media/guardar?name=' + encodeURIComponent(n)
})
</script></body></html>`

export function startFakeDrupal() {
  const medios = new Set()
  const server = createServer((req, res) => {
    const url = req.url.split('?')[0]
    const q = new URLSearchParams(req.url.split('?')[1] || '')
    const html = (h) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(h) }

    if (url === '/media/add/image') return html(MEDIA_FORM)
    if (url === '/media/guardar') { medios.add(q.get('name')); return html('<h1>Medio creado</h1>') }
    if (url === '/admin/content/media') {
      const n = q.get('name') || ''
      const filas = [...medios].filter((m) => m.includes(n)).map((m) => `<tr><td>${m}</td></tr>`).join('')
      return html(`<table>${filas}</table>`)
    }
    if (url === '/user') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<h1>Ivan</h1>') }
    if (url === '/node/add/page' || url.startsWith('/node/add/page')) { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(FORM) }
    if (url === '/node/123') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<h1>Guardado</h1>') }
    if (url === '/boom') { res.writeHead(504); return res.end('gateway timeout') }
    res.writeHead(404); res.end('no')
  })
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ server, port: server.address().port })))
}
