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

const carpeta = mkdtempSync(join(tmpdir(), 'ph-'))
for (const n of ['placeholder-uno-desktop-10x10.png', 'placeholder-dos-mobile-20x20.png']) {
  writeFileSync(join(carpeta, n), PNG)
}

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

  let sinCarpeta = ''
  try { await subirPlaceholders({ page, mapping, carpeta: join(carpeta, 'no-existe') }) }
  catch (e) { sinCarpeta = e.message }
  check(/No existe la carpeta/.test(sinCarpeta), 'avisa si la carpeta no existe, en vez de reventar')
} finally {
  await ctx.close()
  server.close()
  rmSync(carpeta, { recursive: true, force: true })
  rmSync(perfil, { recursive: true, force: true })
}

console.log(fallos ? `\n${fallos} fallas` : '\nTodo OK')
process.exit(fallos ? 1 : 0)
