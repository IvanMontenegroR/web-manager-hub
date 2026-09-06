// Prueba del MOTOR contra el Drupal de mentira: agrega paragraphs por delta, espera el
// AJAX, abre los desplegables, cambia el formato de texto antes de escribir, llena
// texto / rich text / selects / checkboxes, y anida hijos en los DOS slots de un
// contenedor (uno detras del modal y el otro con el area del final escondida, donde hay
// que usar el boton "agregar en el medio") y en el slot con tope de otro (detras del
// dropbutton, que es la forma de una pestaña).
// Despues lee el DOM y verifica que cada valor quedo donde tenia que quedar.
import { rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startFakeDrupal } from './fake-drupal.mjs'
import { openBrowser } from '../src/browser.js'
import { buildPage } from '../src/build.js'
import { validateManifest } from '../src/manifest.js'

// Por defecto, el Chrome del SISTEMA — el mismo que usa una corrida de verdad, asi que
// la prueba se parece a lo que va a pasar. `RUNNER_CHROME` apunta a un binario a mano,
// para un contenedor de CI o un Chrome instalado fuera del path habitual.
const CHROME = process.env.RUNNER_CHROME
const NAVEGADOR = CHROME ? { executablePath: CHROME } : { browser: 'chrome' }

// Un slot del contenedor, escrito como en el mapping real: las variables de la fila
// PADRE resueltas, el {delta} del hijo pendiente. `modo` es como se abre la lista de
// tipos: el modal de paragraphs_ee o el dropbutton de Gin (el de las pestañas).
const slot = (field, modo) => {
  const fd = field.replaceAll('_', '-')
  const abre = {
    modal: `input[name="button_add_modal"][data-drupal-selector="{dsel}-subform-${fd}-add-more-add-modal-form-area-add-more"]`,
    drop: `[data-drupal-selector="{dsel}-subform-${fd}-add-more"] button.dropbutton__toggle`,
  }
  return {
    label: field,
    dsel: `{dsel}-subform-${fd}-{delta}`,
    base: `{base}[${field}][{delta}][subform]`,
    add: {
      mode: 'buttons',
      ...(abre[modo] ? { open: abre[modo] } : {}),
      button: `button[name="{npath}_subform_${field}_{bundle}_add_more"]`,
    },
  }
}

const mapping = (site) => ({
  name: 'fake', site,
  nodeAdd: '/node/add/page',
  title: 'input[name="title[0][value]"]',
  published: 'input[name="status[value]"]',
  pathauto: 'input[name="path[0][pathauto]"]',
  path: 'input[name="path[0][alias]"]',
  save: 'input[name="op"][value="Guardar"]:visible',
  paragraphs: {
    dsel: 'edit-field-components-{delta}',
    base: 'field_components[{delta}][subform]',
    add: {
      mode: 'select',
      select: 'select[name="field_components[add_more][add_more_select]"]',
      button: 'input[name="field_components_add_more"]',
    },
    open: [
      '[data-drupal-selector="{dselw}-subform-group-optional-fields"]',
      '[data-drupal-selector="{dsel}-subform-advanced"]',
      '[data-drupal-selector="{dsel}-subform-classy"]',
    ],
    types: {
      c_text: {
        label: 'Content: Text', value: 'c_text',
        fields: {
          field_c_text: {
            sel: 'textarea[name="{base}[field_c_text][0][value]"]', kind: 'richtext',
            format: { sel: 'select[name="{base}[field_c_text][0][format]"]', value: 'rich_text' },
          },
          field_c_advanced_title: { sel: 'input[name="{base}[field_c_advanced_title][0][value]"]' },
          'field_c_advanced_title.html_tag': { sel: 'select[name="{base}[field_c_advanced_title][0][html_tag]"]', kind: 'select' },
          'advanced.section_id': { sel: 'input[name="{base}[section_id][0][value]"]' },
          'classy.background_color': { sel: 'select[name="{base}[classy][0][c_text][background_color]"]', kind: 'select' },
          field_c_image: { kind: 'image', note: 'se sube a mano' },
        },
      },
      ln_c_cardgrid: {
        label: 'Content: Card Grid', value: 'ln_c_cardgrid',
        fields: {
          field_c_cardgrid_view_mode: { sel: 'select[name="{base}[field_c_cardgrid_view_mode]"]', kind: 'select' },
          field_c_advanced_title: { sel: 'input[name="{base}[field_c_advanced_title][0][value]"]' },
        },
        // Igual que una pestaña del CMS: UN solo componente (`max: 1`) y los tipos
        // plegados detras del dropbutton de Gin.
        children: { slots: [{ ...slot('field_c_subitems', 'drop'), max: 1 }] },
      },
      layout_columns_2: {
        label: 'Layout: 2 columnas', value: 'layout_columns_2',
        fields: { 'advanced.section_id': { sel: 'input[name="{base}[section_id][0][value]"]' } },
        children: { slots: [slot('field_column_first', 'modal'), slot('field_column_second', 'modal')] },
      },
    },
  },
})

const manifest = validateManifest({
  manifest: 1,
  page: { title: 'Tenencia Responsable', path: '/adopta/tenencia-responsable', published: false },
  blocks: [
    { type: 'c_text', fields: {
      field_c_text: 'Cuerpo del bloque de texto.',
      field_c_advanced_title: '¿Que considerar antes de adoptar?',
      'field_c_advanced_title.html_tag': 'h2',
      'classy.background_color': 'bg_brand_01',
      field_c_image: 'foto.jpg',
    } },
    { type: 'ln_c_cardgrid', fields: { field_c_cardgrid_view_mode: 'slider-default-card', field_c_advanced_title: 'Perros' },
      children: [{ type: 'c_text', fields: { field_c_text: 'Card uno.' } }] },
    { type: 'layout_columns_2', fields: { 'advanced.section_id': 'cuidados' },
      children: [
        { slot: 0, type: 'c_text', fields: { field_c_text: 'Columna izquierda.' } },
        // Contenedor adentro de contenedor: la misma forma que tiene el Tabs del CMS
        // (nodo -> comp_tabs -> comp_tabs_tab_item -> componente).
        { slot: 1, type: 'ln_c_cardgrid', fields: { field_c_cardgrid_view_mode: 'grid-cards' },
          children: [{ type: 'c_text', fields: { field_c_text: 'Tres niveles.' } }] },
        // En esta columna el area del final esta escondida. El card grid de arriba no
        // tiene boton propio "en el medio", asi que pasa por el generico "+ Add" que
        // destapa la lista; este c_text si lo tiene y se agrega de una.
        { slot: 1, type: 'c_text', fields: { field_c_text: 'Con boton propio.' } },
      ] },
  ],
})

let fallos = 0
const check = (ok, msg) => { console.log(`${ok ? 'OK  ' : 'FALLA'} ${msg}`); if (!ok) fallos++ }

const { server, port } = await startFakeDrupal()
const site = `http://127.0.0.1:${port}`
const profile = mkdtempSync(join(tmpdir(), 'runner-'))
const { ctx, page } = await openBrowser({ ...NAVEGADOR, profileDir: profile, headless: true, slowMo: 0 })

try {
  // Sin guardar: el formulario queda lleno y se puede leer lo que escribio el motor.
  const pasos = []
  await buildPage({ page, mapping: mapping(site), manifest, save: false, esperaSubform: 4000,
    onStep: (s) => { pasos.push(s); console.log('   ' + s) } })

  const dom = await page.evaluate(() => {
    const v = (sel) => document.querySelector(sel)?.value ?? null
    const B = 'field_components'
    const col1 = `${B}[2][subform][field_column_first][0][subform]`
    const col2 = `${B}[2][subform][field_column_second][0][subform]`
    return {
      titulo: v('input[name="title[0][value]"]'),
      publicado: document.querySelector('input[name="status[value]"]')?.checked,
      pathauto: document.querySelector('input[name="path[0][pathauto]"]')?.checked,
      alias: v('input[name="path[0][alias]"]'),
      panelUrl: document.getElementById('urlpath')?.open === true,
      bloques: document.querySelectorAll('#rows > .row').length,
      oops: document.querySelectorAll('.messages--error').length,
      texto: document.querySelector('.ck-editor__editable')?.innerText ?? null,
      formato: v(`select[name="${B}[0][subform][field_c_text][0][format]"]`),
      tituloTexto: v(`input[name="${B}[0][subform][field_c_advanced_title][0][value]"]`),
      tag: v(`select[name="${B}[0][subform][field_c_advanced_title][0][html_tag]"]`),
      classy: v(`select[name="${B}[0][subform][classy][0][c_text][background_color]"]`),
      viewMode: v(`select[name="${B}[1][subform][field_c_cardgrid_view_mode]"]`),
      cardHijo: v(`textarea[name="${B}[1][subform][field_c_subitems][0][subform][field_c_text][0][value]"]`) !== null,
      sectionId: v(`input[name="${B}[2][subform][section_id][0][value]"]`),
      col1: document.querySelector(`textarea[name="${col1}[field_c_text][0][value]"]`) !== null,
      col2: v(`select[name="${col2}[field_c_cardgrid_view_mode]"]`),
      nieto: document.querySelector(`textarea[name="${col2}[field_c_subitems][0][subform][field_c_text][0][value]"]`) !== null,
      col2b: document.querySelector(`textarea[name="${B}[2][subform][field_column_second][1][subform][field_c_text][0][value]"]`) !== null,
      abiertos: [...document.querySelectorAll('details')].filter((d) => d.open).length,
    }
  })

  check(dom.titulo === 'Tenencia Responsable', 'titulo de la pagina')
  check(dom.publicado === false, 'quedo DESPUBLICADA')
  check(dom.pathauto === false, 'destildo el alias automatico')
  check(dom.alias === '/adopta/tenencia-responsable', `escribio el alias (${dom.alias})`)
  check(dom.panelUrl, 'abrio el panel plegado donde vive el alias')
  check(dom.bloques === 3, `3 bloques sueltos (${dom.bloques})`)
  check(dom.oops === 0, `espero el AJAX del desplegable antes de agregar (${dom.oops} "Oops")`)
  check(pasos.some((p) => /Reintento/.test(p)),
    'reintento el alta que el servidor corto con 504, en vez de frenar la corrida')
  check(dom.formato === 'rich_text', `cambio el formato de texto (${dom.formato})`)
  check(dom.texto === 'Cuerpo del bloque de texto.', 'rich text en el editable de CKEditor')
  check(dom.tituloTexto === '¿Que considerar antes de adoptar?', 'titulo adentro de Optional fields')
  check(dom.tag === 'h2', 'select por valor de maquina (h2)')
  check(dom.classy === 'bg_brand_01', 'select adentro de Classy')
  check(dom.viewMode === 'slider-default-card', 'view mode del card grid')
  check(dom.cardHijo, 'hijo detras del dropbutton, plegado (como una pestaña)')
  check(dom.sectionId === 'cuidados', 'campo adentro de Avanzado (plegado)')
  check(dom.col1, 'hijo en la columna 1 (slot 0, con modal)')
  check(dom.col2 === 'grid-cards', 'hijo en la columna 2, con el area del final ESCONDIDA:\n     usa el boton "agregar en el medio" de paragraphs_features')
  check(dom.nieto, 'contenedor adentro de contenedor (3 niveles, como el Tabs)')
  check(dom.col2b, 'y el segundo hijo, con su propio boton "agregar en el medio"')
  check(dom.abiertos >= 4, `se abrieron los desplegables (${dom.abiertos})`)

  // Con --save: guarda y lee el node id de la URL a la que cae.
  const res = await buildPage({ page, mapping: mapping(site), save: true, onStep: () => {},
    manifest: validateManifest({ manifest: 1, page: { title: 'Solo para guardar' }, blocks: [] }) })
  check(res.saved === true, 'guardo')
  check(res.nodeId === '123', `node id leido del url (${res.nodeId})`)

  // Un campo que el mapping no conoce tiene que FRENAR, no seguir de largo.
  let freno = false
  try {
    await buildPage({ page, mapping: mapping(site), save: false, onStep: () => {},
      manifest: validateManifest({ manifest: 1, page: { title: 'x' }, blocks: [{ type: 'c_text', fields: { campo_inventado: 'x' } }] }) })
  } catch (e) { freno = /no tiene el campo "campo_inventado"/.test(e.message) }
  check(freno, 'frena ante un campo que el mapping no conoce')

  // Un slot que no existe tambien frena: mejor eso que meter el bloque en otro lado.
  let slotMalo = false
  try {
    await buildPage({ page, mapping: mapping(site), save: false, onStep: () => {},
      manifest: validateManifest({ manifest: 1, page: { title: 'x' },
        blocks: [{ type: 'layout_columns_2', children: [{ slot: 5, type: 'c_text' }] }] }) })
  } catch (e) { slotMalo = /no tiene el slot 5/.test(e.message) }
  check(slotMalo, 'frena ante un slot que no existe')

  // Si el subform no aparece, el mensaje tiene que traer la EVIDENCIA: que hay de
  // verdad en esa lista. Es lo unico que se puede mirar desde el otro lado.
  let evidencia = ''
  try {
    const roto = mapping(site)
    roto.paragraphs.dsel = 'edit-esto-no-existe-{delta}'
    await buildPage({ page, mapping: roto, save: false, onStep: () => {}, esperaSubform: 1500,
      manifest: validateManifest({ manifest: 1, page: { title: 'x' }, blocks: [{ type: 'c_text' }] }) })
  } catch (e) { evidencia = e.message }
  check(/Con el prefijo "edit-esto-no-existe-" hay: NADA/.test(evidencia),
    'cuando no aparece el subform, el error dice que hay en esa lista')

  // Un campo que se lleno bien y despues se vacio (Drupal re-dibuja el formulario en
  // cada alta) NO puede pasar en silencio: la pagina saldria armada y sin contenido.
  let vaciado = ''
  try {
    const m2 = mapping(site)
    m2.nodeAdd = '/node/add/page?vaciar=1'
    await buildPage({ page, mapping: m2, manifest, save: false, onStep: () => {}, esperaSubform: 4000 })
  } catch (e) { vaciado = e.message }
  check(/quedaron VACIOS: c_text.field_c_advanced_title/.test(vaciado),
    'frena si un campo ya escrito quedo vacio al final')

  // Una ranura con tope (la pestaña) no acepta un segundo componente.
  let tope = false
  try {
    await buildPage({ page, mapping: mapping(site), save: false, onStep: () => {},
      manifest: validateManifest({ manifest: 1, page: { title: 'x' },
        blocks: [{ type: 'ln_c_cardgrid', children: [{ type: 'c_text' }, { type: 'c_text' }] }] }) })
  } catch (e) { tope = /acepta 1 componente\(s\)/.test(e.message) }
  check(tope, 'frena al pasarse del tope de una ranura')
} finally {
  await ctx.close()
  server.close()
  rmSync(profile, { recursive: true, force: true })
}

console.log(fallos ? `\n${fallos} fallas` : '\nTodo OK')
process.exit(fallos ? 1 : 0)
