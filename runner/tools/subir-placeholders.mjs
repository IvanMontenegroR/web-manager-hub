// Sube los placeholders a la Media library con la sesion que ya abriste.
//
//   node tools/subir-placeholders.mjs [--mapping <f>] [--carpeta placeholders] [--solo <texto>]
//
// Se puede correr las veces que haga falta: las que ya estan se saltean (ver src/media.js).
import { resolve } from 'node:path'
import { openBrowser } from '../src/browser.js'
import { loadMapping } from '../src/mapping.js'
import { subirPlaceholders } from '../src/media.js'

const args = {}
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1]

const mapping = loadMapping(args.mapping || 'mapping/purina-latam.json')
const { ctx, page } = await openBrowser({
  browser: args.browser || 'chrome',
  profileDir: args.profile,
  slowMo: Number(args.slowmo ?? 120),
  ...(process.env.RUNNER_CHROME ? { executablePath: process.env.RUNNER_CHROME } : {}),
})

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
