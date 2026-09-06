#!/usr/bin/env node
// page-runner — arma paginas en Drupal desde un manifiesto JSON.
//
//   page-runner ui       --mapping <f>            la interfaz, en el navegador
//   page-runner login    --mapping <f>            abre el sitio para loguearte a mano
//   page-runner inspect  --mapping <f> [--url u]  vuelca la estructura del formulario
//   page-runner build    <manifiesto...> --mapping <f> [--save]
//
// Opciones comunes:
//   --browser chrome|edge   (default chrome)      navegador YA instalado
//   --profile <dir>         (default .profile)    perfil donde queda la sesion
//   --slowmo <ms>           (default 120)         despacio: se sigue a ojo y no atropella
//   --out <archivo>         salida de inspect
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { openBrowser, isLoggedIn } from './browser.js'
import { loadMapping, missingTypes } from './mapping.js'
import { loadManifest, countBlocks } from './manifest.js'
import { inspectForm, summarize } from './inspect.js'
import { buildPage } from './build.js'
import { logRun } from './log.js'
import { startUi, abrirEnNavegador } from './ui.js'

// Si en mapping/ hay UN solo archivo, se asume ese: quien abre la interfaz con doble
// clic no tiene por que saber que existe un mapping.
function mappingUnico() {
  try {
    const f = readdirSync('mapping').filter((x) => x.endsWith('.json'))
    return f.length === 1 ? join('mapping', f[0]) : null
  } catch { return null }
}

function parseArgs(argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const k = a.slice(2)
      const next = argv[i + 1]
      if (next === undefined || next.startsWith('--')) out[k] = true
      else { out[k] = next; i++ }
    } else out._.push(a)
  }
  return out
}

const say = (s) => process.stdout.write(s + '\n')

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const cmd = args._[0]
  if (!cmd || args.help) {
    say(HELP)
    return
  }
  if (!args.mapping) args.mapping = mappingUnico()
  if (!args.mapping) throw new Error('Falta --mapping <archivo>')
  const mapping = loadMapping(args.mapping)
  const openOpts = {
    browser: args.browser || 'chrome',
    profileDir: args.profile,
    slowMo: Number(args.slowmo ?? 120),
  }

  if (cmd === 'ui') {
    const { url } = await startUi({ mapping, mappingFile: args.mapping, openOpts })
    say('')
    say('page-runner esta abierto en:')
    say('  ' + url)
    say('')
    say('Se abre solo en tu navegador. Para cerrarlo, cerra esta ventana (Ctrl+C).')
    abrirEnNavegador(url)
    await new Promise(() => {})   // vive hasta que lo corten
    return
  }

  if (cmd === 'login') {
    const { ctx, page } = await openBrowser(openOpts)
    await page.goto(mapping.site, { waitUntil: 'domcontentloaded' })
    say('')
    say('Logueate en la ventana que se abrio. La sesion queda guardada en el perfil')
    say('del runner (nunca se guarda tu contraseña).')
    say('Cuando termines, cerra la ventana.')
    await ctx.waitForEvent('close', { timeout: 0 })
    return
  }

  if (cmd === 'inspect') {
    const { ctx, page } = await openBrowser(openOpts)
    try {
      if (!(await isLoggedIn(page, mapping.site))) {
        throw new Error('No hay sesion. Corre primero: page-runner login --mapping ' + args.mapping)
      }
      const url = new URL(args.url || mapping.nodeAdd, mapping.site.replace(/\/+$/, '') + '/').href
      const out = args.out || `inspect-${Date.now()}.json`
      const dump = await inspectForm(page, url, out)
      say('')
      say(summarize(dump))
      say('')
      say(`Volcado completo:  ${out}`)
      say(`Borrador de campos: ${out.replace(/\.json$/, '-draft.json')}`)
    } finally { await ctx.close() }
    return
  }

  if (cmd === 'build') {
    const files = args._.slice(1)
    if (!files.length) throw new Error('Pasa al menos un manifiesto: page-runner build pagina.json --mapping ...')

    // Todo lo que se puede verificar SIN tocar el navegador, se verifica antes.
    const manifests = files.map((f) => ({ file: f, m: loadManifest(f) }))
    for (const { file, m } of manifests) {
      const falta = missingTypes(mapping, m.blocks)
      if (falta.length) throw new Error(`${file}: el mapping no conoce ${falta.join(', ')}`)
    }

    const { ctx, page } = await openBrowser(openOpts)
    try {
      if (!(await isLoggedIn(page, mapping.site))) {
        throw new Error('No hay sesion. Corre primero: page-runner login --mapping ' + args.mapping)
      }
      for (const { file, m } of manifests) {
        say('')
        say(`=== ${m.page.title}  (${countBlocks(m.blocks)} bloques)  [${file}]`)
        try {
          const res = await buildPage({ page, mapping, manifest: m, save: !!args.save, onStep: (s) => say(s) })
          const log = logRun({ manifest: file, title: m.page.title, ...res })
          say(res.saved ? `OK  node ${res.nodeId || '?'}  ${res.url}` : 'OK  (sin guardar)')
          say(`Registrado en ${log}`)
        } catch (e) {
          logRun({ manifest: file, title: m.page.title, error: e.message })
          say(`ERROR  ${e.message}`)
          say('Se frena aca: la pagina quedo a medio armar en el formulario, sin guardar.')
          throw e
        }
      }
    } finally {
      // Sin --save la gracia es MIRAR el formulario, asi que la ventana queda abierta y
      // se cierra a mano. Con --save ya no hay nada que mirar y se cierra sola.
      if (args.save && !args.keepopen) await ctx.close()
      else {
        say('')
        say('La ventana queda abierta para que revises. Cerrala cuando termines.')
        await ctx.waitForEvent('close', { timeout: 0 })
      }
    }
    return
  }

  throw new Error(`Comando desconocido: ${cmd}`)
}

const HELP = `page-runner — arma paginas en Drupal desde un manifiesto JSON

  page-runner ui      --mapping <f>     la interfaz grafica (lo normal)
  page-runner login   --mapping <f>
  page-runner inspect --mapping <f> [--url /node/add/page] [--out dump.json]
  page-runner build   <manifiesto...> --mapping <f> [--save]

  --browser chrome|edge   navegador ya instalado (default chrome)
  --profile <dir>         perfil con la sesion (default .profile)
  --slowmo <ms>           velocidad (default 120)
  --keepopen              no cerrar el navegador al terminar (con --save)

Sin --save deja el formulario lleno y NO guarda: sirve para mirar antes de confiar. En
ese caso la ventana queda abierta hasta que la cierres vos.`

main().catch((e) => { process.stderr.write('\n' + e.message + '\n'); process.exit(1) })
