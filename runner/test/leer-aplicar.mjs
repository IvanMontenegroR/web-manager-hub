// Prueba `leer` y `aplicar` contra un Drupal de mentira por HTTP, sin navegador.
//
// El falso reproduce lo que tiene el formulario real de content y que importa aca:
//   - el login con form_build_id y la cookie de sesion;
//   - los paragraphs CERRADOS al abrir la edicion, y el "Editar todo" por AJAX, que
//     devuelve el widget nuevo y CAMBIA el form_build_id (un pedido con el viejo falla);
//   - un Accordion Grid cuyos campos propios vienen DESPUES de la tabla de sus items, y
//     sus items cerrados con su propio "Editar todo";
//   - el estado de moderacion, el mensaje de revision y el Guardar que redirige.
import http from 'node:http'
import { Sesion, camposDelForm, decode, rutaLegible } from '../tools/drupal-http.js'
import { leerPagina } from '../tools/leer.mjs'
import { aplicarPagina, validarPlan, prepararCambios, sitioDelPlan } from '../tools/aplicar.mjs'

let fallas = 0
const ok = (cond, que) => {
  process.stdout.write(`${cond ? '  ok  ' : '  FALLA '}${que}\n`)
  if (!cond) fallas += 1
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

// ---------------------------------------------------------------------- el Drupal falso
const nodo = {
  titulo: 'Tenencia "responsable"', moderacion: 'published',
  linkUri: '#', linkTitle: 'Perros', cuerpo: '<p>Hola & chau</p>',
  spacing: 'space_section_md', pregunta: '1. Descanso',
}
let build = 1
let abiertoTop = false, abiertoItems = false
let guardados = 0, ultimoLog = null, romperAlGuardar = false
const SESION = 'SSESSabc'

const filaTexto = abierto => `<tr class="draggable paragraph-type--c-text odd"><td>
  <span class="paragraph-type-label">Content: Text</span>
  ${abierto ? `<div data-drupal-selector="edit-field-ln-n-components-0-subform">
    <input type="text" name="field_ln_n_components[0][subform][field_c_link][0][uri]" value="${esc(nodo.linkUri)}">
    <input type="text" name="field_ln_n_components[0][subform][field_c_link][0][title]" value="${esc(nodo.linkTitle)}">
    <textarea name="field_ln_n_components[0][subform][field_c_text][0][value]">
${esc(nodo.cuerpo)}</textarea>
    <select name="field_ln_n_components[0][subform][field_c_text][0][format]"><option value="email_html" selected>Email HTML</option><option value="rich_text">Rich</option></select>
    <input type="checkbox" name="field_ln_n_components[0][subform][field_c_hide]" value="1">
    <input type="submit" name="field_ln_n_components_0_collapse" value="Ocultar">
  </div>` : `<input type="submit" name="field_ln_n_components_0_edit" value="Editar">`}
  <input type="hidden" name="field_ln_n_components[0][_weight]" value="0"></td></tr>`

const filaAcordeon = abierto => `<tr class="draggable paragraph-type--accordion-grid even"><td>
  <span class="paragraph-type-label">Accordion Grid</span>
  ${abierto ? `<div id="field-ln-n-components-1-subform-field-items-add-more-wrapper--x${build}"><table>
      <tr class="draggable paragraph-type--accordion-item odd"><td><span class="paragraph-type-label">Accordion Item</span>
      ${abiertoItems ? `<input type="text" name="field_ln_n_components[1][subform][field_items][0][subform][field_c_advanced_title][0][value]" value="${esc(nodo.pregunta)}">
        <input type="submit" name="field_ln_n_components_1_subform_field_items_0_collapse" value="Ocultar">`
        : `<input type="submit" name="field_ln_n_components_1_subform_field_items_0_edit" value="Editar">`}
      <input type="hidden" name="field_ln_n_components[1][subform][field_items][0][_weight]" value="0"></td></tr>
    </table>
    ${abiertoItems ? '' : '<input type="submit" name="field_ln_n_components_1_subform_field_items_edit_all" value="Editar todo">'}
    </div>
    <select name="field_ln_n_components[1][subform][classy][0][accordion_grid][spacing]"><option value="_none">Default</option><option value="space_section_md"${nodo.spacing === 'space_section_md' ? ' selected' : ''}>MD</option></select>
    <input type="submit" name="field_ln_n_components_1_collapse" value="Ocultar">`
    : `<input type="submit" name="field_ln_n_components_1_edit" value="Editar">`}
  <input type="hidden" name="field_ln_n_components[1][_weight]" value="1"></td></tr>`

const widget = () => `<div class="paragraphs-tabs-wrapper" id="field-ln-n-components-add-more-wrapper"><table>
  ${filaTexto(abiertoTop)}${filaAcordeon(abiertoTop)}</table>
  ${abiertoTop ? '' : '<input type="submit" name="field_ln_n_components_edit_all" value="Editar todo">'}
  <input type="submit" name="field_ln_n_components_add_more" value="Agregar"></div>`

const formulario = () => `<html><body><div class="messages">x</div>
<form class="node-form" data-drupal-selector="node-dsu-component-page-edit-form" action="/node/7/edit" method="post" id="node-dsu-component-page-edit-form">
  <input type="text" name="title[0][value]" value="${esc(nodo.titulo)}">
  ${widget()}
  <select name="moderation_state[0][state]"><option value="draft">Borrador</option><option value="published"${nodo.moderacion === 'published' ? ' selected' : ''}>Publicado</option></select>
  <input type="checkbox" name="revision" value="1" checked>
  <textarea name="revision_log[0][value]"></textarea>
  <input type="hidden" name="form_build_id" value="form-b${build}">
  <input type="hidden" name="form_token" value="tok">
  <input type="hidden" name="form_id" value="node_dsu_component_page_edit_form">
  <input type="file" name="files[x]">
  <input type="submit" name="op" value="Vista previa" data-drupal-selector="edit-preview">
  <input type="submit" name="op" value="Guardar" data-drupal-selector="edit-submit">
</form></body></html>`

function leerCuerpo(req) {
  return new Promise(res => { let b = ''; req.on('data', d => { b += d }); req.on('end', () => res(new URLSearchParams(b))) })
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')
  const logueado = (req.headers.cookie || '').includes(`${SESION}=1`)
  const ua = req.headers['user-agent']
  if (ua !== 'migration-mx') { res.writeHead(400); return res.end('UA') }
  if (req.method === 'GET' && url.pathname === '/user/login') {
    res.writeHead(200, { 'content-type': 'text/html' })
    return res.end('<form id="user-login-form"><input name="name"><input name="pass" type="password"><input type="hidden" name="form_build_id" value="form-login"><input type="submit" id="edit-submit" value="Iniciar sesión"></form>')
  }
  if (req.method === 'POST' && url.pathname === '/user/login') {
    const b = await leerCuerpo(req)
    if (b.get('name') === 'migration-mx' && b.get('pass') === 'secreta' && b.get('form_build_id') === 'form-login') {
      res.writeHead(303, { location: '/my-profile', 'set-cookie': `${SESION}=1; path=/; HttpOnly` })
      return res.end()
    }
    res.writeHead(200); return res.end('<form id="user-login-form">mal</form>')
  }
  if (!logueado) { res.writeHead(403); return res.end('no') }
  if (req.method === 'GET' && url.pathname === '/adopta/tenencia') {
    res.writeHead(200); return res.end('<div data-history-node-id="7"></div>')
  }
  if (req.method === 'GET' && url.pathname === '/node/7/edit') {
    abiertoTop = false; abiertoItems = false; build += 1
    res.writeHead(200, { 'content-type': 'text/html' }); return res.end(formulario())
  }
  if (req.method === 'POST' && url.pathname === '/node/7/edit') {
    const b = await leerCuerpo(req)
    if (b.get('form_build_id') !== `form-b${build}`) { res.writeHead(500); return res.end('build viejo') }
    if (url.searchParams.get('ajax_form') === '1') {
      const viejo = `form-b${build}`
      const quien = b.get('_triggering_element_name')
      if (quien === 'field_ln_n_components_edit_all') abiertoTop = true
      else if (quien === 'field_ln_n_components_1_subform_field_items_edit_all' && abiertoTop) abiertoItems = true
      else { res.writeHead(500); return res.end('boton raro ' + quien) }
      build += 1
      const data = quien.includes('field_items')
        ? formulario().match(/<div id="field-ln-n-components-1-subform-field-items-add-more-wrapper[\s\S]*?<\/table>[\s\S]*?<\/div>/)[0]
        : widget()
      res.writeHead(200, { 'content-type': 'application/json' })
      return res.end(JSON.stringify([{ command: 'settings' }, { command: 'update_build_id', old: viejo, new: `form-b${build}` }, { command: 'insert', method: 'replaceWith', selector: null, data }]))
    }
    if (b.get('op') !== 'Guardar') { res.writeHead(500); return res.end('op ' + b.get('op')) }
    nodo.titulo = b.get('title[0][value]')
    nodo.linkUri = b.get('field_ln_n_components[0][subform][field_c_link][0][uri]')
    nodo.linkTitle = b.get('field_ln_n_components[0][subform][field_c_link][0][title]')
    nodo.cuerpo = b.get('field_ln_n_components[0][subform][field_c_text][0][value]')
    nodo.spacing = b.get('field_ln_n_components[1][subform][classy][0][accordion_grid][spacing]')
    nodo.pregunta = b.get('field_ln_n_components[1][subform][field_items][0][subform][field_c_advanced_title][0][value]')
    nodo.moderacion = b.get('moderation_state[0][state]')
    if (romperAlGuardar) nodo.pregunta = 'otra cosa'
    ultimoLog = b.get('revision_log[0][value]')
    guardados += 1
    res.writeHead(303, { location: '/adopta/tenencia' }); return res.end()
  }
  res.writeHead(404); res.end()
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const SITIO = { base: `http://127.0.0.1:${server.address().port}`, env: 'TEST', mkt: 'XX', escribe: true }
const silencio = () => {}

try {
  // ------------------------------------------------------------------ lo de HTML suelto
  console.log('formulario:')
  const pares = camposDelForm(`<form>
    <input name="a" value="1"><input type="checkbox" name="b" value="x"><input type="checkbox" name="c" value="y" checked>
    <select name="d"><option value="p">P</option><option value="q">Q</option></select>
    <select name="e"><option>Sin value</option></select>
    <textarea name="f">
linea &amp; otra</textarea><input name="g" value="h" disabled><input type="submit" name="op" value="Guardar"></form>`)
  ok(JSON.stringify(pares) === JSON.stringify([['a', '1'], ['c', 'y'], ['d', 'p'], ['e', 'Sin value'], ['f', 'linea & otra']]),
    'manda lo que mandaria el navegador: sin destildados, sin deshabilitados, sin botones; select sin elegir = primera opcion')
  ok(decode('&#x00e9;&quot;&#39;') === 'é"\'', 'decodifica entidades')
  ok(rutaLegible('field_ln_n_components[2][subform][field_c_subitems][0]') === '2 > field_c_subitems 0', 'ruta legible')

  // ------------------------------------------------------------------ login
  console.log('login:')
  const mal = new Sesion(SITIO, { pausa: 0 })
  let rechazo = false
  try { await mal.login({ user: 'migration-mx', pass: 'otra' }) } catch { rechazo = true }
  ok(rechazo, 'una contraseña mala frena con error')
  const s = new Sesion(SITIO, { pausa: 0 })
  await s.login({ user: 'migration-mx', pass: 'secreta' })
  ok(s.cookies.has(SESION), 'queda la cookie de sesion')

  // ------------------------------------------------------------------ leer
  console.log('leer:')
  const l = await leerPagina(s, { ruta: '/adopta/tenencia' })
  ok(l.nid === 7, 'saca el nodo de la ruta')
  ok(l.titulo === 'Tenencia "responsable"', 'titulo decodificado')
  ok(l.estado === 'published', 'estado de moderacion')
  const [texto, acordeon, item] = l.paragraphs
  ok(l.paragraphs.length === 3, 'tres paragraphs, el item anidado incluido (abrio los dos niveles)')
  ok(texto?.tipo === 'c_text' && texto.campos['[field_c_link][0][uri]'] === '#', 'el link del texto, con su nombre exacto')
  ok(texto?.campos['[field_c_text][0][value]'] === '<p>Hola & chau</p>', 'el cuerpo del textarea, sin el salto inicial')
  ok(acordeon?.tipo === 'accordion_grid' && acordeon.clave === 'field_ln_n_components[1]', 'el acordeon recibe SU clave aunque sus campos vengan despues de los hijos')
  ok(acordeon?.campos['[classy][0][accordion_grid][spacing]'] === 'space_section_md', 'y sus campos propios')
  ok(item?.ruta === '1 > field_items 0' && item.campos['[field_c_advanced_title][0][value]'] === '1. Descanso', 'el item anidado con su ruta')

  // ------------------------------------------------------------------ aplicar
  console.log('aplicar:')
  const cambio = { campo: 'field_ln_n_components[0][subform][field_c_link][0][uri]', antes: '#', despues: 'https://ejemplo.com/perros' }
  ok(validarPlan({ sitio: 'x', paginas: [{ ruta: '/a', cambios: [cambio] }] }).some(e => /mensaje/.test(e)), 'un plan sin mensaje no pasa')
  ok(validarPlan({ sitio: 'x', mensaje: 'm', paginas: [{ ruta: '/a', cambios: [cambio, cambio] }] }).some(e => /dos veces/.test(e)), 'un campo repetido no pasa')
  let candado = false
  try { sitioDelPlan({ sitio: 'pp' }, true, { pp: { base: 'x', escribe: false } }) } catch { candado = true }
  ok(candado, 'en un sitio de solo lectura --save frena')
  ok(sitioDelPlan({ sitio: 'pp' }, false, { pp: { base: 'x', escribe: false } }).base === 'x', 'pero el ensayo si corre')
  ok(prepararCambios([['a', '1']], [{ campo: 'b', antes: 'x', despues: 'y' }]).problemas.length === 1, 'un campo que no existe es un problema')

  const g0 = guardados
  let r = await aplicarPagina(s, { ruta: '/adopta/tenencia', cambios: [cambio] }, { mensaje: 'Batch prueba', guardar: false, log: silencio })
  ok(r.resultado === 'ensayo' && guardados === g0 && nodo.linkUri === '#', 'el ensayo no guarda')

  r = await aplicarPagina(s, { ruta: '/adopta/tenencia', cambios: [{ ...cambio, antes: '/otro' }] }, { mensaje: 'Batch prueba', guardar: true, log: silencio })
  ok(r.resultado === 'salteada' && guardados === g0 && nodo.linkUri === '#', 'si el valor actual no es el del plan, saltea la pagina sin guardar')

  const cuerpoAntes = nodo.cuerpo
  r = await aplicarPagina(s, { nid: 7, cambios: [cambio] }, { mensaje: 'Batch prueba', guardar: true, log: silencio })
  ok(r.resultado === 'guardado', 'guarda y verifica')
  ok(nodo.linkUri === 'https://ejemplo.com/perros', 'el campo quedo cambiado')
  ok(nodo.linkTitle === 'Perros' && nodo.cuerpo === cuerpoAntes && nodo.pregunta === '1. Descanso' && nodo.spacing === 'space_section_md', 'todo lo demas viajo tal cual')
  ok(nodo.moderacion === 'published', 'sigue publicada')
  ok(ultimoLog === 'Batch prueba', 'con el mensaje de revision')

  romperAlGuardar = true
  r = await aplicarPagina(s, { nid: 7, cambios: [{ ...cambio, antes: 'https://ejemplo.com/perros', despues: 'https://ejemplo.com/2' }] }, { mensaje: 'm', guardar: true, log: silencio })
  ok(r.resultado === 'verificacion-fallida' && r.raras.some(d => /field_items/.test(d.campo)), 'si cambio algo que no estaba en el plan, lo informa')
} finally {
  server.close()
}

if (fallas) { console.log(`\n${fallas} FALLAS`); process.exit(1) }
console.log('\ntodo ok')
