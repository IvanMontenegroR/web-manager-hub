#!/usr/bin/env node
// Edita paginas que YA existen en el CMS a partir de un plan (ver src/editar.js).
//
//   node tools/editar.mjs cambios/plan.json            ENSAYO: escribe en el formulario, no guarda
//   node tools/editar.mjs cambios/plan.json --save     de verdad
//
// El plan:
//   { "mensaje": "Productos reales en los carruseles de Dog Chow",
//     "paginas": [
//       { "ruta": "/dogchow/longevidad", "cambios": [
//         { "bloque": { "tipo": "block", "n": 1 }, "campo": "field_block.productos",
//           "valor": ["DOG CHOW HOGAREÑO ADULTO (623)", "..."] },
//         { "bloque": 2, "item": 1, "campo": "field_c_text", "antes": "Texto viejo", "valor": "Texto nuevo" },
//         { "campo": "raw:title[0][value]", "valor": "Titulo nuevo" } ] } ] }
//
// Una pagina por vez. Si una falla, se anota y se sigue con la siguiente: ninguna queda a
// medio guardar, porque el guardado es lo ultimo y es uno solo. Bitacora en logs/editar.jsonl.
import fs from 'node:fs'
import { openBrowser, isLoggedIn, pasarAvisoSandbox } from '../src/browser.js'
import { loadMapping } from '../src/mapping.js'
import { editarPagina } from '../src/editar.js'

const args = process.argv.slice(2)
const archivo = args.find((a) => !a.startsWith('--'))
const save = args.includes('--save')
if (!archivo) { console.error('Uso: node tools/editar.mjs <plan.json> [--save]'); process.exit(2) }
const plan = JSON.parse(fs.readFileSync(archivo, 'utf8'))
const mapping = loadMapping(plan.mapping || 'mapping/purina-latam.json')
const say = (t) => process.stdout.write(t + '\n')

const { ctx, page } = await openBrowser({})
const resultados = []
try {
  if (!(await isLoggedIn(page, mapping.site))) {
    await page.goto(mapping.site + '/user/login', { waitUntil: 'domcontentloaded' })
    if (await pasarAvisoSandbox(page)) await page.goto(mapping.site + '/user/login', { waitUntil: 'domcontentloaded' })
    await page.fill('input[name="name"]', process.env.DRUPAL_MCP_USER_CONTENT_MX)
    await page.fill('input[name="pass"]', process.env.DRUPAL_MCP_PASS_CONTENT_MX)
    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}), page.click('#edit-submit')])
    if (!(await isLoggedIn(page, mapping.site))) throw new Error('no se pudo iniciar sesion')
  }
  say(`${save ? 'EDITANDO' : 'ENSAYO (sin guardar)'}: ${plan.paginas.length} pagina(s) en ${mapping.site}`)
  for (const pagina of plan.paginas) {
    try {
      const r = await editarPagina({ page, mapping, pagina, mensaje: plan.mensaje, save, onStep: say })
      resultados.push({ ruta: pagina.ruta, ...r })
    } catch (e) {
      say(`   ERROR ${e.message}`)
      resultados.push({ ruta: pagina.ruta, error: e.message })
    }
  }
} finally { await ctx.close() }
fs.mkdirSync('logs', { recursive: true })
fs.appendFileSync('logs/editar.jsonl', JSON.stringify({ fecha: new Date().toISOString(), plan: archivo, save, mensaje: plan.mensaje, resultados }) + '\n')
const ok = resultados.filter((r) => !r.error).length
say(`\nResumen: ${ok} ${save ? 'guardada(s)' : 'ensayada(s)'}, ${resultados.length - ok} con error`)
process.exitCode = resultados.length - ok ? 1 : 0
