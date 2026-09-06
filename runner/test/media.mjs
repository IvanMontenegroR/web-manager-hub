// Prueba del SUBIDOR de placeholders contra la Media library de mentira.
// Lo que importa aca es que NO duplique: un media de Drupal se reutiliza, y una libreria
// llena de copias no la limpia nadie.
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startFakeDrupal } from './fake-drupal.mjs'
import { openBrowser } from '../src/browser.js'
import { subirPlaceholders } from '../src/media.js'

const CHROME = process.env.RUNNER_CHROME
const NAVEGADOR = CHROME ? { executablePath: CHROME } : { browser: 'chrome' }

let fallos = 0
const check = (ok, msg) => { console.log(`${ok ? 'OK  ' : 'FALLA'} ${msg}`); if (!ok) fallos++ }

// Un PNG de verdad (1x1), que es lo unico que el formulario necesita.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64')

// Una carpeta nueva con una imagen que nunca se subio: cada prueba que tiene que subir
// de verdad necesita la suya, porque el subidor saltea lo que ya esta.
const temporales = []
const carpetaCon = (...nombres) => {
  const d = mkdtempSync(join(tmpdir(), 'ph-'))
  for (const n of nombres) writeFileSync(join(d, n), PNG)
  temporales.push(d)
  return d
}

const carpeta = carpetaCon('placeholder-uno-desktop-10x10.png', 'placeholder-dos-mobile-20x20.png')

const { server, port } = await startFakeDrupal()
const mapping = { site: `http://127.0.0.1:${port}` }
const perfil = mkdtempSync(join(tmpdir(), 'runner-'))
const { ctx, page } = await openBrowser({ ...NAVEGADOR, profileDir: perfil, headless: true, slowMo: 0 })

try {
  const a = await subirPlaceholders({ page, mapping, carpeta, onStep: (s) => console.log('   ' + s) })
  check(a.subidos === 2 && a.salteados === 0, `sube las dos la primera vez (${a.subidos}/${a.salteados})`)

  // La segunda corrida no tiene que crear NADA: es la garantia de poder repetirlo.
  const b = await subirPlaceholders({ page, mapping, carpeta, onStep: () => {} })
  check(b.subidos === 0 && b.salteados === 2, `la segunda vez no duplica (${b.subidos}/${b.salteados})`)

  const c = await subirPlaceholders({ page, mapping, carpeta, solo: 'uno', onStep: () => {} })
  check(c.total === 1, `--solo filtra (${c.total})`)

  // El nombre del media es el IDENTIFICADOR con el que el manifiesto va a pedir la
  // imagen: tiene que quedar sin ".png", no como lo precarga Drupal.
  const guardados = await (await fetch(`${mapping.site}/media/estado`)).json()
  check(Object.keys(guardados).sort().join() === 'placeholder-dos-mobile-20x20,placeholder-uno-desktop-10x10',
    `guarda el nombre sin extension (${Object.keys(guardados).sort().join(' ')})`)
  check(Object.values(guardados).every((m) => m.publicado === true),
    'deja el medio publicado: uno despublicado no se puede elegir de la libreria')

  // El alt NO existe hasta que la subida termina: si se lo busca antes, no esta. Que
  // aparezca lleno es la prueba de que se lo busco DESPUES.
  check(Object.values(guardados).every((m) => m.alt === 'Placeholder de prueba'),
    `llena el alt, que Drupal dibuja recien al terminar de subir (${Object.values(guardados)[0]?.alt || 'vacio'})`)

  // Si se apretara Guardar antes de que el AJAX suba el archivo, el formulario de
  // mentira contesta con el error de campo obligatorio y esto se caeria.
  const d = await subirPlaceholders({
    page, mapping, onStep: () => {},
    carpeta: carpetaCon('placeholder-tres-desktop-30x30.png'),
  })
  check(d.subidos === 1, 'espera a que la subida termine antes de guardar')

  // Un sitio cuyo formulario de medios NO pide alt tambien es valido: ahi el alt vive en
  // el campo que referencia al medio. No se lo tiene que esperar "por las dudas".
  const t0 = Date.now()
  const e = await subirPlaceholders({
    page, onStep: () => {}, carpeta: carpetaCon('placeholder-cinco-desktop-50x50.png'),
    mapping: { ...mapping, media: { add: '/media/add/simple' } },
  })
  const tardo = Date.now() - t0
  check(e.subidos === 1, 'sube igual en un formulario que no pide alt')
  check(tardo < 4000, `y no lo espera de gusto (${tardo}ms para una imagen)`)

  // Un sitio donde el hidden que avisa el fin de la subida no existe tiene que decirlo,
  // no quedarse dos minutos esperando.
  let sinSenal = ''
  try {
    await subirPlaceholders({
      page, onStep: () => {}, carpeta: carpetaCon('placeholder-cuatro-desktop-40x40.png'),
      mapping: { ...mapping, media: { subido: 'input[name="no-existe"]' } },
    })
  } catch (e) { sinSenal = e.message }
  check(/media\.subido/.test(sinSenal), 'avisa si no sabe cuando termino la subida')

  let sinCarpeta = ''
  try { await subirPlaceholders({ page, mapping, carpeta: join(carpeta, 'no-existe') }) }
  catch (e) { sinCarpeta = e.message }
  check(/No existe la carpeta/.test(sinCarpeta), 'avisa si la carpeta no existe, en vez de reventar')
} finally {
  await ctx.close()
  server.close()
  for (const d of temporales) rmSync(d, { recursive: true, force: true })
  rmSync(perfil, { recursive: true, force: true })
}

console.log(fallos ? `\n${fallos} fallas` : '\nTodo OK')
process.exit(fallos ? 1 : 0)
