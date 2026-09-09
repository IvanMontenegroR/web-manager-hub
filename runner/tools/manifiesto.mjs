// EL PUENTE: convierte una pagina del hub en un manifiesto que el runner sabe construir.
//
//   node tools/manifiesto.mjs /conoce-purina                 # lo escribe en manifests/
//   node tools/manifiesto.mjs /conoce-purina --market=MX
//
// Y despues, con la sesion ya abierta:
//   npm run build -- --manifest manifests/conoce-purina.json
//
// Esto es solo la entrada/salida: la traduccion vive en tools/traducir.js, que es una
// funcion pura y se prueba sin base ni navegador (ver test/manifiesto.mjs).
//
// Los machine names que emite se VERIFICAN contra el mapping mientras se genera. Un
// nombre mal escrito frena aca, no a mitad de camino con el navegador abierto y la mitad
// de la pagina cargada.
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { leerPagina } from './hub.js'
import { aManifiesto, ErrorDeTraduccion } from './traducir.js'
import { loadMapping } from '../src/mapping.js'
import { validateManifest, countBlocks } from '../src/manifest.js'

const args = process.argv.slice(2)
const market = args.find((a) => a.startsWith('--market='))?.split('=')[1] || 'MX'
const archivoMapping = args.find((a) => a.startsWith('--mapping='))?.split('=')[1]
  || 'mapping/purina-latam.json'
const [path] = args.filter((a) => !a.startsWith('--'))
if (!path) {
  process.stderr.write('uso: node tools/manifiesto.mjs <path-de-la-pagina> [--market=MX] [--mapping=<archivo>]\n')
  process.exit(2)
}

const leido = await leerPagina(path, market)
if (!leido) {
  process.stderr.write(`No existe la pagina ${path} [${market}] en el hub.\n`)
  process.exit(1)
}

const mapping = loadMapping(archivoMapping)
let salida
try {
  salida = aManifiesto(leido.pagina, leido.bloques, mapping.paragraphs?.types)
} catch (e) {
  if (!(e instanceof ErrorDeTraduccion)) throw e
  process.stderr.write(`\nFRENO: ${e.message}\n`)
  process.exit(1)
}
const { manifiesto, avisos, pendientes } = salida

// Se valida con el MISMO validador que usa el runner al construir.
const slug = path.replace(/^\//, '').replace(/[^\w-]+/g, '-') || 'pagina'
const archivo = join(resolve('manifests'), `${slug}.json`)
validateManifest(manifiesto, archivo)
mkdirSync(resolve('manifests'), { recursive: true })
writeFileSync(archivo, JSON.stringify(manifiesto, null, 2) + '\n', 'utf8')

process.stderr.write(`\n${archivo}\n  ${countBlocks(manifiesto.blocks)} paragraph/s\n`)
for (const b of manifiesto.blocks) {
  process.stderr.write(`   ${b.type}${b.children?.length ? ` (${b.children.length} hijo/s)` : ''}\n`)
}
if (avisos.length) {
  process.stderr.write('\nAvisos:\n')
  for (const a of avisos) process.stderr.write(`  · ${a}\n`)
}
if (pendientes.length) {
  process.stderr.write(`\n${pendientes.length} IMAGEN/ES que hay que subir a la Media library y elegir a mano.\n`
    + 'El runner arma la estructura y todo el texto igual; las imagenes se agregan despues.\n')
  for (const p of pendientes) {
    process.stderr.write(`  · ${p.donde} — ${p.campo} -> ${p.destino || '(el mismo Media del desktop)'}\n`
      + `     ${p.url}\n`)
  }
}
process.stderr.write(`\nPara construirla:\n  npm run login\n`
  + `  npm run build -- --manifest ${archivo.replace(resolve('.') + '/', '')}\n`)
