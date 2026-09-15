// RECORTA las imagenes de una pagina a la medida EXACTA que pide el componente donde
// caen, y deja el indice para subirlas a la Media library.
//
//   node tools/imagenes.mjs planes/ imagenes/          # todos los planes
//   node tools/imagenes.mjs planes/conoce-purina.json imagenes/
//   node tools/imagenes.mjs --hub=/conoce-purina imagenes/   # una pagina YA armada en el hub
//
// LAS DOS ENTRADAS. Una pagina puede llegar por dos caminos y los dos terminan en el CMS:
// del sitio viejo (extraer -> plan -> aca) o armada a mano en el builder del hub. La
// segunda no tiene archivo de plan, asi que se lee derecho de la base con `--hub`. Es el
// mismo trabajo: lo unico que cambia es de donde salen los bloques. Sin esto, una pagina
// del hub llegaba al manifiesto pidiendo medios que nadie habia recortado ni subido.
//
// POR QUE HACE FALTA. Las imagenes del sitio viejo estan cortadas para el sitio viejo.
// Una foto de card de 500×360 no es la card apaisada de 485×280 ni la vertical de
// 822×1230: cambia la proporcion, o sea que hay que RECORTAR, y a veces no alcanza el
// tamaño y hay que pedirla de nuevo.
//
// LAS MEDIDAS NO SE ESCRIBEN ACA. Salen de `getSpecs` del catalogo del hub, la misma
// funcion que usa la matriz de contenido y el placeholder del mockup.
//
// POR QUE CHROME Y NO UNA LIBRERIA DE IMAGENES. Misma razon que en placeholders.mjs: en
// una maquina corporativa instalar `sharp` (binario nativo) o ImageMagick es pelearse
// con el proxy. El navegador ya esta, ya sabe bajar de esa red y ya sabe dibujar. El
// recorte es un `object-fit: cover` y una captura.
//
// UN MEDIO SON DOS ARCHIVOS. El bundle del CMS es `responsive_image` y lleva Image
// Desktop e Image Mobile adentro, las dos obligatorias. Asi que `image` y `image_mobile`
// no son dos medios: son uno con dos archivos. Y cuando el hub no trae una foto mobile
// aparte, se recorta la MISMA foto a la medida de mobile, que es mejor que repetir el
// archivo de desktop. Solo si el catalogo no declara medida mobile se repite el de
// desktop, porque el campo es obligatorio y no hay de donde sacar otra.
//
// QUE ESCRIBE. Los archivos recortados en `<destino>/<slug>/`, un `INDICE.json` por
// pagina (que es lo que lee el subidor), y de vuelta en el plan el registro de cada
// imagen:
//     "image": { "origen": "...", "medio": "...", "archivo": "...", "de": "500×360",
//                "a": "485×280", "modo": "recorte", "kb": 84 }
// El `origen` se conserva a proposito: es lo que el hub muestra en el preview, y es la
// unica forma de volver atras si el recorte salio mal.
import { readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'
import { openBrowser } from '../src/browser.js'
import { recortarPagina } from '../src/imagenes.js'
import { leerPagina } from './hub.js'
import { slugDePagina, planDelHub } from './paginas.js'

const args = process.argv.slice(2)
const hub = args.find((a) => a.startsWith('--hub='))?.split('=')[1]
const market = args.find((a) => a.startsWith('--market='))?.split('=')[1] || 'MX'
const [uno, dos] = args.filter((a) => !a.startsWith('--'))
const entrada = hub ? null : uno
const destino = hub ? uno : dos
if ((!entrada && !hub) || !destino) {
  process.stderr.write('uso: node tools/imagenes.mjs <planes/ | plan.json> <carpeta-imagenes>\n'
    + '     node tools/imagenes.mjs --hub=<path-de-la-pagina> <carpeta-imagenes> [--market=MX]\n')
  process.exit(2)
}
const CALIDAD = Number(args.find((a) => a.startsWith('--calidad='))?.split('=')[1] || 82)

// ---------------------------------------------------------------------------------
// Las paginas a recortar, ya con la misma forma vengan de donde vengan. `archivo` en null
// = vino del hub y no hay plan que actualizar: lo que se anota para revisar se imprime.
let entradas
if (hub) {
  const leido = await leerPagina(hub, market)
  if (!leido) {
    process.stderr.write(`No existe la pagina ${hub} [${market}] en el hub.\n`)
    process.exit(1)
  }
  entradas = [{
    archivo: null,
    slug: slugDePagina(leido.pagina.path),
    plan: { pagina: leido.pagina, bloques: leido.bloques.map(planDelHub), revisar: [] },
  }]
} else {
  const planes = statSync(resolve(entrada)).isDirectory()
    ? readdirSync(resolve(entrada)).filter((f) => f.endsWith('.json')).map((f) => join(resolve(entrada), f))
    : [resolve(entrada)]
  entradas = planes.map((archivo) => ({
    archivo,
    slug: basename(archivo, '.json'),
    plan: JSON.parse(readFileSync(archivo, 'utf8')),
  }))
}

const { ctx } = await openBrowser({ profileDir: '.profile', headless: true,
  ...(process.env.RUNNER_CHROME ? { executablePath: process.env.RUNNER_CHROME } : {}) })

let hechas = 0, estiradas = 0, fallaron = 0
try {
  for (const { archivo, slug, plan } of entradas) {
    process.stderr.write(`\n${slug}\n`)
    const r = await recortarPagina({
      ctx, plan, slug, destino, calidad: CALIDAD,
      onStep: (s) => process.stderr.write(s + '\n'),
    })
    hechas += r.hechas; estiradas += r.estiradas; fallaron += r.fallaron
    if (!r.indice.length) process.stderr.write('  (sin imagenes)\n')

    // Del hub no se escribe nada: la pagina ya esta armada y el origen de cada foto es lo
    // que el builder muestra. Lo que habria ido al plan se imprime, que es donde se busca.
    if (archivo) writeFileSync(archivo, JSON.stringify(plan, null, 2) + '\n', 'utf8')
    else for (const n of r.notas) process.stderr.write(`  ! ${n}\n`)
  }
} finally {
  await ctx.close()
}

process.stderr.write(`\n${hechas} medio/s recortado/s en ${resolve(destino)}\n`)
if (estiradas) process.stderr.write(`${estiradas} NO alcanzaban la medida y quedaron estirados: estan marcados en el plan, hay que pedirlos de nuevo.\n`)
if (fallaron) process.stderr.write(`${fallaron} no se pudieron bajar (quedaron anotados en el plan).\n`)
process.stderr.write('\nSiguiente: subirlos a la Media library con\n  npm run subir-medios -- imagenes/<pagina>\n')
