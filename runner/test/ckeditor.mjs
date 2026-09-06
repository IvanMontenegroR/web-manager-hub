// Prueba del campo de CUERPO contra un CKEditor 5 DE VERDAD.
//
// El mock no servia para esto: el bug era que cambiar el formato destruye el editor y
// monta otro, y que tocarle el DOM por abajo lo rompe. Las dos cosas son comportamiento
// del CKEditor real, no algo que se pueda fingir con un contenteditable.
//
// El rig copia lo que hace Drupal: un textarea escondido, un CKEditor encima, el Map
// `Drupal.CKEditor5Instances`, el `data-ckeditor5-id`, y un select de formato que al
// cambiar DESTRUYE el editor y crea otro (asincrono, sin pasar por el servidor).
//
// No corre en `npm test`: necesita bajar CKEditor. Se corre a mano:
//
//   npm run test:ckeditor
//
// Busca el paquete en RUNNER_CKEDITOR (o en node_modules) y si no esta, lo dice y se va
// sin fallar: nadie tiene que bajarse 20MB para trabajar en el runner.
import { createServer } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openBrowser } from '../src/browser.js'
import { esperarEditor, escribirRich, leerRich, prepararPagina } from '../src/richtext.js'

const CANDIDATOS = [
  process.env.RUNNER_CKEDITOR,
  'node_modules/ckeditor5/dist/browser',
  '/tmp/ckrig/node_modules/ckeditor5/dist/browser',
].filter(Boolean)

const dist = CANDIDATOS.find((d) => existsSync(join(d, 'ckeditor5.umd.js')))
if (!dist) {
  console.log('Sin CKEditor a mano: esta prueba se saltea.')
  console.log('Para correrla:  npm i --no-save --prefix /tmp/ckrig ckeditor5')
  process.exit(0)
}

const CHROME = process.env.RUNNER_CHROME
const NAVEGADOR = CHROME ? { executablePath: CHROME } : { browser: 'chrome' }

let fallos = 0
const check = (ok, msg) => { console.log(`${ok ? 'OK  ' : 'FALLA'} ${msg}`); if (!ok) fallos++ }

const PAGINA = `<!doctype html><html><head><meta charset="utf-8">
<title>Cuerpo</title><link rel="stylesheet" href="/ckeditor5.css"></head><body>
<div class="js-form-item form-item">
  <textarea name="field_c_text[0][value]" id="cuerpo"></textarea>
  <select name="field_c_text[0][format]" id="formato">
    <option value="plain_text">Texto plano</option>
    <option value="rich_text">Rich text</option>
  </select>
</div>
<script src="/ckeditor5.umd.js"></script>
<script>
// Lo mismo que hace Drupal: el Map global, el id en el textarea, y el editor encima.
window.Drupal = { CKEditor5Instances: new Map() }
let proximo = 1

async function montar() {
  const ta = document.getElementById('cuerpo')
  const id = String(proximo++)
  ta.setAttribute('data-ckeditor5-id', id)
  const ed = await CKEDITOR.ClassicEditor.create(ta, {
    licenseKey: 'GPL',
    plugins: [CKEDITOR.Essentials, CKEDITOR.Paragraph, CKEDITOR.Bold, CKEDITOR.Italic],
    toolbar: ['bold', 'italic'],
  })
  window.Drupal.CKEditor5Instances.set(id, ed)
  window.__listo = true
}

// El cambio de formato NO va al servidor: destruye el editor y monta otro. Y tarda, que
// es exactamente donde el runner se metia a escribir.
document.getElementById('formato').addEventListener('change', async () => {
  window.__listo = false
  const ta = document.getElementById('cuerpo')
  const id = ta.getAttribute('data-ckeditor5-id')
  const viejo = window.Drupal.CKEditor5Instances.get(id)
  if (viejo) {
    window.Drupal.CKEditor5Instances.delete(id)
    await viejo.destroy()
  }
  await new Promise((r) => setTimeout(r, 350))
  await montar()
})

montar()
</script></body></html>`

const server = createServer((req, res) => {
  const url = req.url.split('?')[0]
  const servir = (archivo, tipo) => {
    res.writeHead(200, { 'content-type': tipo })
    res.end(readFileSync(join(dist, archivo)))
  }
  if (url === '/ckeditor5.umd.js') return servir('ckeditor5.umd.js', 'text/javascript')
  if (url === '/ckeditor5.css') return servir('ckeditor5.css', 'text/css')
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  res.end(PAGINA)
})
const port = await new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server.address().port)))

const perfil = mkdtempSync(join(tmpdir(), 'runner-ck-'))
const { ctx, page } = await openBrowser({ ...NAVEGADOR, profileDir: perfil, headless: true, slowMo: 0 })

const errores = []
page.on('pageerror', (e) => errores.push(e.message))
page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()) })

const TEXTO = 'Adoptar es una decisión para toda la vida del animal.'

try {
  // Igual que el motor: la busqueda del editor se instala antes de navegar.
  await prepararPagina(page)
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__listo === true)
  const ta = page.locator('textarea[name="field_c_text[0][value]"]').first()

  // Lo que hace el runner: cambia el formato y escribe. El cambio destruye el editor.
  await page.locator('#formato').selectOption('rich_text')
  await esperarEditor(page, ta)
  const r = await escribirRich(page, ta, TEXTO)
  check(r.via === 'editor', `escribe por la API del editor (${r.via}; ${r.intentos.join(', ') || 'sin tropiezos'})`)

  // Lo importante: que siga ahi cuando se termina de armar todo, no un instante despues.
  await page.waitForTimeout(1200)
  const leido = await leerRich(page, ta)
  check(leido === TEXTO, `el texto sigue puesto despues del cambio de formato (${JSON.stringify(leido)})`)

  // Y que haya viajado al textarea: es lo que se envia al guardar.
  const enTextarea = await ta.inputValue()
  check(enTextarea.includes('Adoptar es una decisión'),
    `el textarea lleva el valor, que es lo que se guarda (${JSON.stringify(enTextarea.slice(0, 40))})`)

  check(errores.length === 0, `sin errores de JS en la pagina (${errores.slice(0, 2).join(' | ') || 'ninguno'})`)

  // El texto con saltos se guarda como parrafos, no como un choclo.
  await escribirRich(page, ta, 'Primer parrafo.\n\nSegundo parrafo.')
  const dos = await ta.inputValue()
  check(/<p>Primer parrafo\.<\/p>\s*<p>Segundo parrafo\.<\/p>/.test(dos),
    `una linea en blanco es un parrafo nuevo (${JSON.stringify(dos)})`)

  // LA REGRESION, tal cual estaba antes: cambiar el formato y escribir SIN esperar, en
  // el contenteditable, vaciandolo con innerHTML. Se le escribe al editor que se esta
  // muriendo; cuando monta el siguiente, el texto no esta. Es el bug que reporto Ivan.
  const contenido = async () => ta.evaluate((el) => {
    const M = window.Drupal.CKEditor5Instances
    for (const c of M.values()) if (c.sourceElement === el) return c.getData()
    return null
  })

  await page.locator('#formato').selectOption('plain_text')
  await page.waitForFunction(() => window.__listo === true)
  await escribirRich(page, ta, 'Punto de partida.')

  await page.locator('#formato').selectOption('rich_text')   // arranca destruir + montar
  const alaVieja = await (async () => {
    const editable = page.locator('.ck-editor__editable[contenteditable="true"]').first()
    if (!(await editable.count())) return 'no habia editor'
    try {
      await editable.click({ timeout: 1500 })
      await editable.evaluate((n) => { n.innerHTML = '' })
      await page.keyboard.insertText(TEXTO)
      return 'escribio'
    } catch { return 'no pudo' }
  })()
  await page.waitForFunction(() => window.__listo === true)
  await page.waitForTimeout(400)
  const quedoViejo = await contenido()
  check(!String(quedoViejo || '').includes('Adoptar'),
    `a la vieja el texto se pierde en el cambio de editor — ${alaVieja}, y quedo `
    + `${JSON.stringify(quedoViejo)}`)

  // Y con el arreglo, el mismo caso: esperar el editor y escribir por la API.
  await page.locator('#formato').selectOption('plain_text')
  await page.waitForFunction(() => window.__listo === true)
  await page.locator('#formato').selectOption('rich_text')
  await esperarEditor(page, ta)
  await escribirRich(page, ta, TEXTO)
  await page.waitForTimeout(400)
  const quedoNuevo = await contenido()
  check(String(quedoNuevo || '').includes('Adoptar'),
    `y con el arreglo sobrevive al mismo cambio (${JSON.stringify(quedoNuevo)})`)
} finally {
  await ctx.close()
  server.close()
  rmSync(perfil, { recursive: true, force: true })
}

console.log(fallos ? `\n${fallos} fallas` : '\nTodo OK')
process.exit(fallos ? 1 : 0)
