// Sube a la Media library las imagenes ya recortadas de una pagina.
//
//   npm run login                          (una vez)
//   npm run subir-medios -- imagenes/conoce-purina
//   npm run subir-medios -- imagenes/conoce-purina --solo banner
//
// Es el paso que va ENTRE recortar y armar la pagina. El runner no sube imagenes mientras
// construye: ELIGE de la libreria por nombre. Asi que primero tienen que estar arriba.
//
// Por que separado y no adentro del build: si la subida falla a la mitad, no queda una
// pagina a medio armar con la mitad de las fotos. Y como es idempotente, reintentar no
// duplica nada — un medio que ya existe se saltea.
//
// Lee el `INDICE.json` que escribio tools/imagenes.mjs, que dice que dos archivos forman
// cada medio y con que nombre queda. Ese nombre es el que el manifiesto pide despues.
import { resolve } from 'node:path'
import { openBrowser } from '../src/browser.js'
import { loadMapping } from '../src/mapping.js'
import { subirPlaceholders } from '../src/media.js'

// Una pasada sola: lo que empieza con `--` es una opcion y se lleva el valor que sigue;
// lo demas es posicional. Mucho mas simple que adivinar despues cual valor era de quien.
const opciones = {}
const sueltos = []
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i]
  if (a.startsWith('--')) opciones[a.slice(2)] = process.argv[++i]
  else sueltos.push(a)
}
const opt = (n) => opciones[n]
const [carpeta] = sueltos
if (!carpeta) {
  process.stderr.write('uso: node tools/subir-medios.mjs <carpeta-de-la-pagina> [--solo <texto>]\n')
  process.exit(2)
}

const mapping = loadMapping(opt('mapping') || 'mapping/purina-latam.json')

let ctx, page
try {
  ;({ ctx, page } = await openBrowser({
    browser: opt('browser') || 'chrome',
    profileDir: opt('profile'),
    slowMo: Number(opt('slowmo') ?? 120),
    ...(process.env.RUNNER_CHROME ? { executablePath: process.env.RUNNER_CHROME } : {}),
  }))
  const r = await subirPlaceholders({
    page, mapping, carpeta: resolve(carpeta), solo: opt('solo'),
    onStep: (s) => process.stdout.write(s + '\n'),
  })
  process.stdout.write(`\n${r.subidos} subido/s, ${r.salteados} ya estaban, de ${r.total}.\n`)
  process.stdout.write('Siguiente: armar la pagina con\n  npm run build -- manifests/<pagina>.json\n')
} finally {
  if (ctx) await ctx.close()
}
