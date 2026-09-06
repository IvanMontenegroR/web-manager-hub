// Prueba del MOTOR contra el Drupal de mentira: agrega paragraphs, espera el AJAX,
// abre los desplegables, llena texto/rich text/selects y anida hijos en un contenedor.
// Despues lee el DOM y verifica que cada valor quedo donde tenia que quedar.
import { rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startFakeDrupal } from './fake-drupal.mjs'
import { openBrowser } from '../src/browser.js'
import { buildPage } from '../src/build.js'
import { validateManifest } from '../src/manifest.js'

const CHROME = process.env.RUNNER_CHROME || '/opt/pw-browsers/chromium'

const mapping = (site) => ({
  name: 'fake', site,
  nodeAdd: '/node/add/page',
  title: 'input[name="title[0][value]"]',
  published: 'input[name="status[value]"]',
  save: '#edit-submit',
  paragraphs: {
    row: '#rows > .row',
    base: 'field_components[{delta}][subform]',
    add: {
      mode: 'select',
      select: 'select[name="field_components[add_more][add_more_select]"]',
      button: 'input[name="field_components_add_more_add_more_button"]',
    },
    types: {
      c_text: {
        label: 'Content: Text', value: 'c_text',
        open: ['summary:has-text("Optional fields")'],
        fields: {
          field_c_text: { sel: 'textarea[name="{base}[field_c_text][0][value]"]', kind: 'richtext' },
          field_c_advanced_title: { sel: 'input[name="{base}[field_c_advanced_title][0][value]"]' },
          field_c_title_tag: { sel: 'select[name="{base}[field_c_title_tag]"]', kind: 'select' },
        },
      },
      ln_c_cardgrid: {
        label: 'Content: Card Grid', value: 'ln_c_cardgrid',
        open: ['summary:has-text("Optional fields")'],
        fields: {
          field_view_mode: { sel: 'select[name="{base}[field_view_mode]"]', kind: 'select' },
          field_c_advanced_title: { sel: 'input[name="{base}[field_c_advanced_title][0][value]"]' },
        },
      },
      layout_columns_2: {
        label: 'Layout: 2 columnas', value: 'layout_columns_2',
        fields: { field_section_id: { sel: 'input[name="{base}[field_section_id][0][value]"]' } },
        children: {
          row: '.kids[data-base="{base}"] .kidrow',
          base: '{base}[field_children][{delta}][subform]',
          add: {
            mode: 'select',
            select: '.kids[data-base="{base}"] > select',
            button: '.kids[data-base="{base}"] > input[type=submit]',
          },
        },
      },
    },
  },
})

const manifest = validateManifest({
  manifest: 1,
  page: { title: 'Tenencia Responsable', published: false },
  blocks: [
    { type: 'c_text', fields: { field_c_text: 'Cuerpo del bloque de texto.', field_c_advanced_title: '¿Que considerar antes de adoptar?', field_c_title_tag: 'h2' } },
    { type: 'ln_c_cardgrid', fields: { field_view_mode: 'slider-default-card', field_c_advanced_title: 'Perros' } },
    { type: 'layout_columns_2', fields: { field_section_id: 'cuidados' },
      children: [
        { type: 'c_text', fields: { field_c_text: 'Columna izquierda.' } },
        { type: 'ln_c_cardgrid', fields: { field_view_mode: 'grid-cards' } },
      ] },
  ],
})

let fallos = 0
const check = (ok, msg) => { console.log(`${ok ? 'OK  ' : 'FALLA'} ${msg}`); if (!ok) fallos++ }

const { server, port } = await startFakeDrupal()
const site = `http://127.0.0.1:${port}`
const profile = mkdtempSync(join(tmpdir(), 'runner-'))
const { ctx, page } = await openBrowser({ executablePath: CHROME, profileDir: profile, headless: true, slowMo: 0 })

try {
  // Sin guardar: el formulario queda lleno y se puede leer lo que escribio el motor.
  await buildPage({ page, mapping: mapping(site), manifest, save: false, onStep: (s) => console.log('   ' + s) })

  const dom = await page.evaluate(() => {
    const v = (sel) => document.querySelector(sel)?.value ?? null
    const rows = [...document.querySelectorAll('#rows > .row')]
    return {
      titulo: v('input[name="title[0][value]"]'),
      publicado: document.querySelector('input[name="status[value]"]')?.checked,
      bloques: rows.length,
      texto: document.querySelector('.ck-editor__editable')?.innerText ?? null,
      tituloTexto: v('input[name="field_components[0][subform][field_c_advanced_title][0][value]"]'),
      tag: v('select[name="field_components[0][subform][field_c_title_tag]"]'),
      viewMode: v('select[name="field_components[1][subform][field_view_mode]"]'),
      cardTitulo: v('input[name="field_components[1][subform][field_c_advanced_title][0][value]"]'),
      sectionId: v('input[name="field_components[2][subform][field_section_id][0][value]"]'),
      hijos: document.querySelectorAll('.kidrow').length,
      hijoViewMode: v('select[name="field_components[2][subform][field_children][1][subform][field_view_mode]"]'),
      abiertos: [...document.querySelectorAll('details')].filter((d) => d.open).length,
    }
  })

  check(dom.titulo === 'Tenencia Responsable', 'titulo de la pagina')
  check(dom.publicado === false, 'quedo DESPUBLICADA')
  check(dom.bloques === 3, `3 bloques sueltos (${dom.bloques})`)
  check(dom.texto === 'Cuerpo del bloque de texto.', 'rich text en el editable de CKEditor')
  check(dom.tituloTexto === '¿Que considerar antes de adoptar?', 'titulo adentro de Optional fields')
  check(dom.tag === 'h2', 'select por valor de maquina (h2)')
  check(dom.viewMode === 'slider-default-card', 'view mode del card grid')
  check(dom.cardTitulo === 'Perros', 'titulo del card grid')
  check(dom.sectionId === 'cuidados', 'campo del contenedor')
  check(dom.hijos === 2, `2 hijos adentro del contenedor (${dom.hijos})`)
  check(dom.hijoViewMode === 'grid-cards', 'campo de un hijo anidado')
  check(dom.abiertos >= 2, 'se abrieron los desplegables Optional fields')

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
} finally {
  await ctx.close()
  server.close()
  rmSync(profile, { recursive: true, force: true })
}

console.log(fallos ? `\n${fallos} fallas` : '\nTodo OK')
process.exit(fallos ? 1 : 0)
