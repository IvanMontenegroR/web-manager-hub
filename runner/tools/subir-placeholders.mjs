// Sube los placeholders a la Media library con la sesion que ya abriste.
//
//   node tools/subir-placeholders.mjs [--mapping <f>] [--carpeta placeholders] [--solo <texto>]
//
// Lo normal es hacerlo desde la INTERFAZ (boton "Subir las 36"), que ademas es lo unico
// que funciona con la interfaz abierta: el perfil de Chrome es uno solo y dos procesos no
// lo pueden usar a la vez. Esto queda para automatizar o para quien prefiera la terminal.
//
// Se puede correr las veces que haga falta: las que ya estan se saltean (ver src/media.js).
import { resolve } from 'node:path'
import { openBrowser } from '../src/browser.js'
import { loadMapping } from '../src/mapping.js'
import { subirPlaceholders } from '../src/media.js'

const args = {}
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1]

const mapping = loadMapping(args.mapping || 'mapping/purina-latam.json')

let ctx, page
try {
  ;({ ctx, page } = await openBrowser({
    browser: args.browser || 'chrome',
    profileDir: args.profile,
    slowMo: Number(args.slowmo ?? 120),
    ...(process.env.RUNNER_CHROME ? { executablePath: process.env.RUNNER_CHROME } : {}),
  }))
} catch (e) {
  // Chrome no deja abrir el mismo perfil dos veces: aborta para no corromperlo. El error
  // que tira ("Target page, context or browser has been closed" + SingletonLock) no dice
  // nada de eso, asi que se traduce.
  const ocupado = /SingletonLock|ProcessSingleton|has been closed/i.test(e.message)
  process.stderr.write(ocupado
    ? '\nEl perfil del navegador esta en uso: ya hay una ventana del runner abierta.\n'
      + 'Subilas desde la interfaz (boton "Subir las 36"), que usa esa misma ventana,\n'
      + 'o cerra la interfaz y volve a correr esto.\n'
    : `\nNo pude abrir el navegador: ${e.message}\n`)
  process.exit(1)
}

try {
  const r = await subirPlaceholders({
    page, mapping, solo: args.solo,
    carpeta: resolve(args.carpeta || 'placeholders'),
    onStep: (s) => process.stdout.write(s + '\n'),
  })
  process.stdout.write(`\nListo. Subidas: ${r.subidos}. Ya estaban: ${r.salteados}. De ${r.total}.\n`)
} catch (e) {
  process.stderr.write(`\nFreno: ${e.message}\n`)
  process.exitCode = 1
} finally {
  await ctx.close()
}
